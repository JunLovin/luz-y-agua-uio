# Luz y Agua UIO — Especificación técnica v1

Versión: 18 de octubre de 2026 · Ciudad: Quito (Distrito Metropolitano)

---

## 1. Qué es y qué no es

**Problema.** En Quito los cortes de luz y agua sin aviso son frecuentes, y la información oficial existe pero hay que ir a buscarla (mapa de la EEQ, PDFs, WhatsApp de Epmaps). Nadie avisa por ubicación ni dice en vivo si un corte es programado, una falla o le pasa a todo el barrio.

**Producto.** Una app gratuita que:

1. Avisa antes de un corte programado de luz o agua en los lugares que el usuario guardó.
2. Muestra en vivo si los vecinos de un barrio están reportando un corte no programado.
3. Funciona sin cuenta y sin que la ubicación salga del teléfono.

**Fuera del MVP:** cuentas, Guayaquil y otras ciudades, chat o foro, monetización, modo oscuro personalizado, widgets de pantalla de inicio.

**Principio rector:** privacidad por diseño. El servidor solo conoce datos públicos (cronogramas, mapas) y conteos anónimos por barrio.

---

## 2. Arquitectura

```
                 ┌─────────────────────────── Servidor (Supabase) ───────────────────────────┐
Fuentes          │                                                                           │
oficiales  ───►  │  ingest-source ──► extractor (Claude) ──► validador ──► motor de confianza│
(PDF, imagen,    │                                                    │                     │
 LOTAIP, manual) │                                                    ▼                     │
                 │                         outages (cortes) ──► notify (FCM por tema)       │
Reportes   ───►  │  submit-report ──► reports ──► aggregate (pg_cron) ──► crowd_outages     │
anónimos         │                                                                           │
                 └──────────────┬──────────────────────────────────────┬────────────────────┘
                                │ vistas públicas (solo lectura)       │ FCM topics
                                ▼                                      ▼
                       App móvil (Expo)  ◄──────────────────  Notificaciones
                       · mapa de barrios descargado
                       · lugares guardados SOLO en el teléfono
                       · cálculo local del barrio
                       Web pública (Next.js, ISR)
```

**Flujo de privacidad:**

1. La app descarga `barrios.geojson` (público, versionado) y lo guarda localmente.
2. El usuario marca un lugar (GPS en primer plano o tocando el mapa). La app calcula el `barrioId` con point-in-polygon **en el teléfono** y guarda `{ alias, barrioId, lat, lng }` **solo en MMKV**.
3. La app se suscribe a los temas FCM de ese barrio (§6). El servidor nunca sabe quién está suscrito.
4. Al borrar un lugar, la app cancela las suscripciones que ya no use ningún otro lugar.

**Mapas y búsqueda sin fugas de ubicación:**

- Las teselas del mapa base se sirven desde **nuestro propio almacenamiento** (un archivo PMTiles de Quito generado con datos de OpenStreetMap, en Supabase Storage o Cloudflare R2). Nunca desde servidores de teselas de terceros: cada petición de tesela revela qué zona está mirando el usuario.
- La búsqueda de barrios por nombre es **local**, sobre el GeoJSON descargado. No se usa ningún servicio externo de geocodificación (Nominatim, Google, Mapbox) desde la app.
- El mapa muestra la atribución "© colaboradores de OpenStreetMap", obligatoria por la licencia ODbL.

**Descargas sin revelar el barrio:**

- La app nunca pide datos filtrados por barrio (`?barrio=solanda`): eso le diría al servidor, junto con la IP, dónde vive alguien. Descarga **toda la ciudad** (`public_outages_active` y `public_crowd_live` completas, que pesan poco) y filtra en el teléfono.
- La única petición que lleva un `barrioId` es `submit-report`, y es una acción explícita del usuario.

**Infraestructura y registros:**

- Región de Supabase: la más cercana disponible a Ecuador. Los datos que guardamos no son personales, pero los proveedores (Supabase, Vercel, Google) operan fuera de Ecuador; eso se declara en la política de privacidad (§10).
- Los registros de plataforma de Supabase y Vercel guardan IPs por defecto: se configuran con la retención mínima disponible y se declara en la política de privacidad.

---

## 3. Fuentes de datos

| Fuente                                      | Qué aporta                                                       | Cómo se obtiene                                            | Automatizable                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Geoportal Metropolitano de Quito            | Polígonos de barrios                                             | Descarga manual de la capa (shapefile)                     | No, se importa una vez con script                                             |
| OpenStreetMap                               | Nombres de barrios y calles para búsqueda                        | Extracto de Geofabrik (Ecuador)                            | Sí, script offline                                                            |
| EEQ — solicitud LOTAIP                      | Zonas de corte o alimentadores, lista de subestaciones y barrios | Respuesta a la solicitud formal                            | No, se importa con script                                                     |
| Cronogramas EEQ / Ministerio (PDF o imagen) | Cortes programados de luz                                        | Subida al panel de ingesta o fetch de URLs en la allowlist | Solo si la URL está en `sources.automated_allowed` y su robots.txt lo permite |
| Comunicados de Epmaps                       | Cortes de agua (barrios, horario, tanqueros)                     | Subida al panel de ingesta (texto, PDF o imagen)           | Igual que arriba                                                              |
| Reportes de usuarios                        | Cortes no programados y confirmación de programados              | `submit-report`                                            | Sí                                                                            |

**Prohibido:** extraer datos de `eeq.com.ec`, consultar su buscador o su ArcGIS desde el servidor, o automatizar cualquier fuente fuera de la allowlist.

**Ingesta sin revisión manual diaria.** El "panel de ingesta" es una ruta protegida en `apps/web/admin` que acepta subir un archivo o pegar una URL. No hay aprobación humana: todo pasa por el validador y el motor de confianza (§5). El panel solo existe para alimentar fuentes que no se pueden automatizar.

---

## 4. Modelo de datos (Postgres + PostGIS)

```sql
-- Barrios: polígonos públicos, base del cálculo local en el teléfono
create table barrios (
  id text primary key,              -- slug estable: 'chimbacalle', 'solanda'
  name text not null,
  parroquia text,
  geom geometry(MultiPolygon, 4326) not null,
  source text not null,             -- 'geoportal', 'osm'
  version int not null default 1
);

-- Zonas de las empresas (subestación/alimentador EEQ, sector Epmaps)
create table utility_zones (
  id text primary key,              -- 'eeq_chimbacalle', 'epmaps_chillogallo_alto'
  utility text not null check (utility in ('eeq','epmaps')),
  service text not null check (service in ('luz','agua')),
  name text not null,
  aliases text[] not null default '{}',   -- nombres alternativos para el validador
  geom geometry(MultiPolygon, 4326)       -- puede ser null si solo hay lista de barrios
);

-- Relación aprendida o declarada entre zonas y barrios
create table zone_barrio (
  zone_id text references utility_zones(id),
  barrio_id text references barrios(id),
  weight real not null check (weight between 0 and 1),  -- 1 = declarado por la fuente oficial
  origin text not null check (origin in ('official','geometry','learned')),
  updated_at timestamptz not null default now(),
  primary key (zone_id, barrio_id)
);

-- Documentos ingresados
create table source_documents (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references sources(id),
  url text,
  storage_path text,                -- copia en un bucket PRIVADO de Supabase Storage (solo para el extractor)
  sha256 text not null unique,      -- evita reprocesar el mismo documento
  received_at timestamptz not null default now(),
  status text not null check (status in ('pending','extracted','failed'))
);

create table sources (
  id text primary key,              -- 'eeq_pdf', 'mae_portal', 'epmaps_comunicado'
  name text not null,
  automated_allowed boolean not null default false,
  base_url text,
  trust real not null default 0.5   -- se ajusta con la precisión observada
);

-- Cortes (programados o detectados)
create table outages (
  id uuid primary key default gen_random_uuid(),
  service text not null check (service in ('luz','agua')),
  kind text not null check (kind in ('scheduled','unscheduled')),
  zone_id text references utility_zones(id),
  barrio_ids text[] not null,       -- barrios afectados resueltos
  starts_at timestamptz not null,
  ends_at timestamptz,
  confidence real not null,
  tier text not null check (tier in ('high','medium','low')),
  source_document_id uuid references source_documents(id),
  source_label text not null,       -- texto visible: "Cronograma EEQ publicado el 18 oct, 18:00"
  supersedes uuid references outages(id),   -- corrección de un corte anterior
  notes text,                       -- tanqueros, motivo, etc.
  created_at timestamptz not null default now()
);

-- Reportes anónimos de usuarios
create table reports (
  id bigint generated always as identity primary key,
  barrio_id text not null references barrios(id),
  service text not null check (service in ('luz','agua')),
  status text not null check (status in ('out','restored')),
  dedup_hash text not null,         -- HMAC diario, ver §7
  received_at timestamptz not null default now()
);

-- Agregados por barrio (lo único que se conserva a largo plazo)
create table crowd_outages (
  id uuid primary key default gen_random_uuid(),
  barrio_id text not null references barrios(id),
  service text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  peak_reports int not null,
  matched_outage_id uuid references outages(id)   -- si coincidió con un programado
);

-- Sal aleatoria diaria para deduplicar reportes (se borra a las 48 h)
create table daily_salts (
  day date primary key,
  salt bytea not null               -- gen_random_bytes(32), nunca derivada de un secreto fijo
);

-- Límite de reportes por IP (la IP nunca se guarda en claro; filas de máximo 1 h)
create table rate_limits (
  ip_hash text not null,            -- HMAC_SHA256(ip, sal_del_día)
  window_start timestamptz not null,
  count int not null default 1,
  primary key (ip_hash, window_start)
);

-- Registro de notificaciones enviadas (sin destinatarios)
create table notifications_log (
  id bigint generated always as identity primary key,
  topic text not null,
  outage_id uuid,
  kind text not null,               -- 'heads_up', 'imminent', 'correction', 'crowd'
  sent_at timestamptz not null default now()
);
```

**Vistas públicas (lo único que lee el cliente):**

- `public_outages_active`: cortes con `tier in ('high','medium')` que terminan en el futuro o empezaron hace menos de 24 h.
- `public_crowd_live`: barrios con reportes activos en los últimos 60 minutos, con conteo redondeado (nunca menos de 3, ver §7).
- `public_barrios_meta`: `version` y URL del GeoJSON vigente.

**Retención (pg_cron diario):**

- `reports`: borrar filas de más de 30 días.
- `daily_salts`: borrar sales de más de 48 h (§7). Desde ese momento ningún `dedup_hash` puede relacionarse con nada.
- `rate_limits`: borrar filas de más de 1 h (§7).
- `source_documents`: las copias se guardan en un bucket privado. La app y la web nunca redistribuyen el archivo: enlazan a la publicación original de la fuente oficial (`url`).
- `notifications_log`: 90 días.

---

## 5. Lector de cronogramas y motor de confianza

### 5.1 Extracción (`packages/extractor`)

Entrada: PDF, imagen o texto. Salida validada con Zod:

```ts
type ExtractedOutage = {
  service: "luz" | "agua";
  zoneNames: string[]; // tal como aparecen: "Subestación Chimbacalle", "Tanque Chillogallo Alto 2"
  barrioNames: string[]; // tal como aparecen
  date: string; // YYYY-MM-DD
  start: string; // HH:mm, hora de Ecuador (UTC-5)
  end: string | null;
  notes?: string;
};
```

- **Doble extracción:** dos llamadas independientes a la API de Claude con prompts distintos (uno pide una tabla, otro pide JSON directo). El modelo se configura con `ANTHROPIC_MODEL`; no se escribe en el código.
- **Comparación:** se normalizan ambas salidas y se calcula el acuerdo por fila (mismas zonas, misma fecha, mismas horas).
- Los documentos se guardan con su `sha256`; si llega el mismo archivo otra vez, no se reprocesa.

### 5.2 Validador (reglas deterministas)

Una fila se descarta si:

- La fecha no está entre hoy y hoy + 14 días.
- `end <= start` (salvo cortes que cruzan la medianoche, marcados explícitamente).
- Duración mayor a 24 h.
- Ninguna `zoneName` coincide con `utility_zones.name` o sus `aliases` (comparación difusa con umbral en `config.ts`), y ninguna `barrioName` coincide con `barrios`.

### 5.3 Puntaje de confianza

```
confidence = 0.40 · acuerdo_doble_extracción
           + 0.30 · coincidencia_de_zonas
           + 0.20 · sources.trust
           + 0.10 · confirmación_otra_fuente
```

| Nivel  | Umbral (en `config.ts`) | Qué pasa                                                     |
| ------ | ----------------------- | ------------------------------------------------------------ |
| high   | ≥ 0.80                  | Se publica y se envían notificaciones                        |
| medium | 0.55–0.79               | Se publica en el mapa como "Sin confirmar", sin notificación |
| low    | < 0.55                  | Se guarda para depuración, no se muestra                     |

### 5.4 Aprendizaje de `sources.trust`

Después de cada corte programado de nivel high, el job `evaluate-accuracy` mira `reports` de los barrios afectados en la ventana `[starts_at − 10 min, starts_at + 30 min]`:

- Si hubo un pico de reportes `out`: el corte se confirma y `trust` sube un poco.
- Si no hubo reportes y hay suscriptores conocidos en la zona (usar el conteo de reportes históricos del barrio como proxy), `trust` baja un poco.

### 5.5 Aprendizaje de `zone_barrio`

Si un barrio sin relación declarada con la zona Z muestra un pico de reportes `out` dentro de la ventana de un corte programado de Z, su `weight` con Z sube. Con suficientes coincidencias pasa a `origin = 'learned'`. Todo se hace con conteos por barrio: no se usa ninguna ubicación individual.

### 5.6 Alarmas para el desarrollador

Un job diario envía un correo o un mensaje de Telegram (variable `ALERT_WEBHOOK_URL`) solo si:

- Más del 30 % de los documentos de un día terminaron en `low`.
- Una fuente con historial no publicó nada en 72 h en temporada de cortes.
- Falló la extracción de un documento tres veces.

---

## 6. Notificaciones por tema (FCM)

**Nombres de temas** (charset permitido por FCM: letras, números, `-_.~%`):

- `v1_luz_b_<barrioId>`: cortes de luz que afectan a un barrio.
- `v1_agua_b_<barrioId>`: cortes de agua que afectan a un barrio.
- `v1_luz_z_<zoneId>`: suscripción opcional y más precisa, cuando el usuario eligió su zona de la EEQ (§8.3).

La función `topicFor(service, scope, id)` vive en `packages/shared` y tiene tests.

**Tipos de aviso:**

| Tipo       | Cuándo                                                | Ejemplo                                                                               |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| heads_up   | Al publicarse un corte high, si empieza en más de 2 h | "Mañana 09:00–12:00: corte de luz programado en Chimbacalle. Fuente: cronograma EEQ." |
| imminent   | 30 min antes del inicio                               | "En 30 min empieza el corte de luz en Chimbacalle (09:00–12:00)."                     |
| correction | Un corte nuevo `supersedes` uno ya notificado         | "Cambio: el corte en Chimbacalle ahora es de 14:00 a 17:00."                          |
| crowd      | Un barrio cruza el umbral de reportes (§7)            | "Vecinos de Solanda reportan corte de luz. No estaba programado."                     |

- Programación con pg_cron + Edge Function `notify`, que llama a FCM HTTP v1 con una cuenta de servicio guardada como secreto.
- Idempotencia: `notifications_log` evita mandar dos veces el mismo `(topic, outage_id, kind)`.
- Horario silencioso: `heads_up` no se envía entre 22:00 y 06:00 (se agenda para las 06:00). `imminent`, `correction` y `crowd` sí se envían.
- Payload sin datos personales: `{ service, outageId, barrioId, kind }` + título y texto.

---

## 7. Reportes anónimos y antiabuso

**Envío (`submit-report`, Edge Function):**

```json
{
  "barrioId": "solanda",
  "service": "luz",
  "status": "out",
  "nonce": "<uuid del día>",
  "attestation": "<token>"
}
```

- `nonce`: UUID aleatorio que el teléfono genera **una vez por día** y descarta al día siguiente.
- El servidor calcula `dedup_hash = HMAC_SHA256(nonce, sal_del_día)`. La sal del día es **aleatoria** (tabla `daily_salts`), se crea a medianoche y se borra a las 48 h. No se deriva de ningún secreto fijo: si se pudiera recalcular, los hashes viejos dejarían de ser anónimos. Así se cuentan dispositivos distintos en un día sin poder seguir a nadie entre días.
- `attestation`: Play Integrity (Android) / App Attest (iOS) para comprobar que es la app genuina. Si la verificación falla, el reporte se acepta con peso 0.5. Google y Apple procesan esta verificación; se declara en la política de privacidad.
- Límite por IP: tabla `rate_limits` con `HMAC_SHA256(ip, sal_del_día)`, nunca la IP en claro, y filas borradas a la hora. Máximo 10 reportes por hora por IP. No se usan servicios externos (Upstash u otros) para esto.
- Límite en el teléfono: un reporte por servicio y barrio cada 15 minutos.

**Agregación (`aggregate`, pg_cron cada minuto):**

- Un barrio entra en `crowd_outages` cuando hay al menos `CROWD_MIN_DISTINCT` (por defecto 5) `dedup_hash` distintos con `status = 'out'` en 20 minutos.
- Sale cuando, en la ventana de 30 minutos, los `restored` superan a los `out`, o pasan 6 h sin reportes.
- Si coincide con un corte programado del mismo servicio y barrio, se marca `matched_outage_id` y **no** se manda aviso `crowd` (ya hubo aviso oficial).
- `public_crowd_live` muestra conteos redondeados a múltiplos de 5 y nunca menos de 3, para no exponer a nadie en un barrio pequeño.

---

## 8. App móvil (`apps/mobile`)

### 8.1 Pantallas

1. **Bienvenida (3 pasos).** Qué hace la app; "App independiente, no afiliada a la EEQ ni a Epmaps"; confirmación de tener 15 años o más; aceptación de la política de privacidad (enlace a la web).
2. **Permiso de notificaciones.** Explicación previa en una pantalla propia antes del diálogo del sistema.
3. **Mis lugares.** Lista de lugares guardados con su estado actual (sin cortes / corte programado / vecinos reportan). Botón "Agregar lugar".
4. **Agregar lugar.** Mapa centrado en Quito. Opciones: "Usar mi ubicación" (permiso solo en primer plano, se pide aquí, precedido de una pantalla propia que explica que la ubicación se usa una sola vez para encontrar el barrio y nunca sale del teléfono), tocar el mapa o buscar barrio por nombre (búsqueda local). Quien no quiera dar permiso de ubicación puede usar la app igual con las otras dos opciones. Se muestra el barrio detectado para confirmar y un alias ("Casa", "Trabajo").
5. **Detalle del lugar.** Próximos cortes programados (luz y agua), fuente y hora de publicación de cada uno, estado de reportes de vecinos, botones grandes **"Se fue la luz" / "Volvió la luz"** y lo mismo para el agua.
6. **Mapa en vivo.** Capa "Oficial" (cortes high y medium; medium con etiqueta "Sin confirmar") y capa "Vecinos" (barrios con reportes). Leyenda clara. Nunca puntos individuales.
7. **Ajustes.** Precisión de luz opcional (§8.3), horario silencioso, ver política de privacidad, **"Borrar todos mis datos"** (borra MMKV y cancela todas las suscripciones), versión de la app, enlace al código en GitHub.

### 8.2 Almacenamiento local (MMKV)

```ts
type Place = {
  id: string;
  alias: string;
  barrioId: string;
  lat: number;
  lng: number;
  eeqZoneId?: string;
};
type LocalState = {
  places: Place[];
  subscribedTopics: string[];
  reportNonce: { date: string; value: string };
  lastReports: Record<string, string>; // clave `${barrioId}:${service}` → ISO
  barriosVersion: number;
  ageConfirmed: boolean;
  privacyAcceptedVersion: number;
};
```

Las coordenadas se guardan solo para volver a dibujar el lugar en el mapa del propio teléfono. No se envían nunca.

### 8.3 Precisión opcional de luz

Para quien tiene su planilla: un botón abre el buscador oficial de la EEQ en el navegador del sistema (`expo-web-browser`). El usuario consulta su sector allí y luego lo elige de una lista local de `utility_zones` de la EEQ. La app se suscribe a `v1_luz_z_<zoneId>`. La app **no** lee la página de la EEQ ni guarda el número de suministro.

### 8.4 Calidad

- Funciona sin conexión para "Mis lugares" y los últimos cortes descargados.
- El GeoJSON de barrios se actualiza solo si cambia `public_barrios_meta.version`.
- Accesibilidad: tamaños de texto dinámicos, contraste AA, etiquetas en botones de reporte.
- Sin Expo Go: se usa dev client por Firebase.

---

## 9. Web pública (`apps/web`)

- `/` — Landing con descarga de la app y estado general ("Hoy hay N cortes programados en Quito").
- `/cortes-de-luz-quito-hoy` y `/cortes-de-agua-quito-hoy` — Páginas para Google con la lista del día por barrio, ISR cada 5 minutos, datos estructurados y fecha visible. Son las que atraen tráfico.
- `/barrio/[id]` — Estado de un barrio.
- `/privacidad`, `/terminos`, `/acerca` — Textos legales y aviso de independencia.
- `/admin/ingesta` — Panel protegido (Supabase Auth, solo el correo del mantenedor) para subir cronogramas.

Rendimiento en picos: las páginas públicas se sirven desde caché de Vercel; la base no recibe tráfico por cada visita.

Privacidad en la web: sin cookies salvo la sesión del panel de administración, sin Vercel Analytics ni Speed Insights, sin Google Analytics, sin píxeles ni fuentes cargadas desde terceros (las fuentes se sirven desde el propio dominio). Así no hace falta banner de cookies.

---

## 10. Textos legales

**Política de privacidad** (corta, en español claro):

- No pedimos nombre, cédula, teléfono, correo ni número de suministro.
- Tu ubicación y tus lugares guardados se quedan en tu teléfono.
- Los avisos llegan por "temas" de barrio: no sabemos quién recibe cada aviso.
- Los reportes solo incluyen barrio, servicio, estado y hora; se borran a los 30 días.
- Usamos Firebase Cloud Messaging (Google) para entregar notificaciones. Google procesa el token de tu dispositivo y conoce a qué temas de barrio está suscrito, según sus propias políticas. Nosotros no recibimos ni guardamos ese token.
- Para frenar abusos, la app pide a Google (Android) o Apple (iPhone) que confirme que es la app genuina cuando envías un reporte.
- Nuestros proveedores (Supabase, Vercel, Google) operan servidores fuera de Ecuador. Sus registros técnicos pueden incluir tu dirección IP por un tiempo limitado; configuramos la retención mínima disponible.
- El mapa se sirve desde nuestro propio almacenamiento, no desde servicios de mapas de terceros.
- Puedes borrar todo desde Ajustes. Como no guardamos datos que te identifiquen, no hay nada más que podamos borrar del servidor; si tienes una duda o quieres ejercer tus derechos de acceso, rectificación, eliminación u oposición, escríbenos al correo de contacto.
- Contacto del responsable y fecha de la versión.

**Términos de uso:** la app informa con base en fuentes públicas y reportes anónimos, puede contener errores, no es un servicio de emergencias (ante una emergencia, 911 y canales oficiales), no está afiliada a la EEQ ni a Epmaps.

**Fichas de las tiendas:** etiquetas de privacidad de Apple y sección de seguridad de datos de Google Play coherentes con lo anterior ("no se recopilan datos vinculados a ti", salvo lo que Firebase Messaging obligue a declarar).

---

## 11. Variables de entorno (`.env.example`, sin valores)

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # solo en el servidor
# Claude
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
# Firebase (cuenta de servicio para FCM HTTP v1, como JSON en base64)
FCM_SERVICE_ACCOUNT_B64=
FCM_PROJECT_ID=
# Alarmas
ALERT_WEBHOOK_URL=
# Web
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_EMAIL=
```

En la app móvil solo van `SUPABASE_URL`, `SUPABASE_ANON_KEY` y los archivos de Firebase (`google-services.json`, `GoogleService-Info.plist`), que se cargan como secretos de EAS y **no** se versionan.

La sal para deduplicar reportes **no** es una variable de entorno: es aleatoria y vive en `daily_salts` (§7).

---

## 12. Seguridad e incidentes

- `SECURITY.md` explica cómo reportar una vulnerabilidad en privado (correo de contacto o reporte privado de vulnerabilidades de GitHub, nunca issues públicos).
- Ante una filtración o acceso indebido: cortar el acceso, rotar las claves afectadas, evaluar qué datos se expusieron y, si hubo datos personales comprometidos, notificar a la Superintendencia de Protección de Datos Personales en el término de 5 días desde que se tuvo constancia de la vulneración (LOPDP art. 43 y Norma Técnica de Notificación de Vulneraciones, Resolución SPDP-SPD-2026-0040-R), por medios digitales a través del sistema de la Superintendencia (SISPDP), y avisar a los usuarios con un mensaje en la app y en la web.
- Los proveedores que tratan datos por nuestra cuenta (encargados) deben avisarnos de cualquier vulneración en un máximo de 2 días; se verifica en sus acuerdos de tratamiento de datos.
- Las transferencias internacionales a proveedores (Supabase, Vercel, Google) se documentan y la documentación se conserva al menos 3 años (Resolución SPDP-SPD-2026-0004-R).
- Con el diseño de esta SPEC, una filtración de la base expondría solo datos públicos y conteos anónimos. Mantener eso cierto es la mejor defensa: cualquier cambio que agregue datos personales al servidor requiere actualizar esta SPEC y la política de privacidad **antes** de programarlo.
- La API de Claude solo recibe documentos públicos (cronogramas y comunicados). Nunca se le envían reportes, IPs ni nada que venga de los usuarios.
