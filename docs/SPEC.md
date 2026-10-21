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
3. Si el usuario activó los avisos, la app se suscribe a los temas FCM de ese barrio (§6). Sin permiso de notificaciones no se suscribe a nada: Google solo conoce un tema de barrio cuando el usuario pidió sus avisos. El servidor nunca sabe quién está suscrito.
4. Al borrar un lugar, la app cancela las suscripciones que ya no use ningún otro lugar.

**Mapas y búsqueda sin fugas de ubicación:**

- Las teselas del mapa base se sirven desde **nuestro propio almacenamiento**: el bucket público `tiles` de Supabase Storage guarda un extracto PMTiles de Quito (datos de OpenStreetMap, esquema Protomaps), el `style.json` y las fuentes Noto Sans en PBF. El estilo no usa sprites ni recursos externos; se publica con `pnpm --filter @luz-y-agua/scripts publish:basemap`. Nunca desde servidores de teselas de terceros: cada petición de tesela revela qué zona está mirando el usuario.
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

| Fuente                                      | Qué aporta                                                           | Cómo se obtiene                                            | Automatizable                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Geoportal Metropolitano de Quito            | Polígonos de barrios (pendiente: confirmar su licencia)              | Descarga manual de la capa (shapefile)                     | No, se importa una vez con script                                             |
| OpenStreetMap                               | Polígonos provisionales (parroquias); nombres y calles para búsqueda | Overpass API (parroquias) y extracto de Geofabrik (calles) | Sí, script offline que se corre a mano                                        |
| EEQ — solicitud LOTAIP                      | Zonas de corte o alimentadores, lista de subestaciones y barrios     | Respuesta a la solicitud formal                            | No, se importa con script                                                     |
| Cronogramas EEQ / Ministerio (PDF o imagen) | Cortes programados de luz                                            | Subida al panel de ingesta o fetch de URLs en la allowlist | Solo si la URL está en `sources.automated_allowed` y su robots.txt lo permite |
| Comunicados de Epmaps                       | Cortes de agua (barrios, horario, tanqueros)                         | Subida al panel de ingesta (texto, PDF o imagen)           | Igual que arriba                                                              |
| Reportes de usuarios                        | Cortes no programados y confirmación de programados                  | `submit-report`                                            | Sí                                                                            |

**Polígonos provisionales.** Mientras no se confirme la licencia de la capa del Geoportal, `barrios` contiene las 65 parroquias del Distrito Metropolitano (32 urbanas y 33 rurales) que publica OpenStreetMap. Los avisos y los temas FCM son por parroquia hasta el cambio. `scripts/import-barrios.ts` las descarga de Overpass, las simplifica con mapshaper (10 m, conservando los bordes compartidos para que no queden huecos entre parroquias) y publica un GeoJSON versionado con la atribución de la ODbL. Mapshaper también lee shapefiles, así que el cambio al Geoportal solo cambia la entrada del script.

**Prohibido:** extraer datos de `eeq.com.ec`, consultar su buscador o su ArcGIS desde el servidor, o automatizar cualquier fuente fuera de la allowlist.

**Ingesta sin revisión manual diaria.** El "panel de ingesta" es la ruta `/admin/ingesta` de `apps/web`, que acepta subir un archivo (PDF, imagen o texto, máximo 20 MB) o pegar una URL. No hay aprobación humana: todo pasa por el validador y el motor de confianza (§5). El panel solo existe para alimentar fuentes que no se pueden automatizar.

- **Acceso:** solo la cuenta `ADMIN_EMAIL`, con un código de 6 dígitos por correo que vence a los 10 minutos. El registro público de cuentas está desactivado: la cuenta del admin se crea a mano. La sesión vive en cookies `httpOnly`, `Secure` y `SameSite=Strict` limitadas a `/admin`.
- **Edge Function `ingest-source`:** verifica que quien llama sea el admin con el correo confirmado, calcula el `sha256` y guarda el archivo en el bucket privado `source-documents`. Un documento ya extraído no se reprocesa. Uno que falló se reintenta si se vuelve a subir, hasta 3 intentos.
- **URLs:** solo `https`, solo bajo el `base_url` de una fuente con `automated_allowed`, nunca `eeq.com.ec` (bloqueado en el código y con una restricción en la base) y siempre respetando el `robots.txt` del sitio. La descarga usa un User-Agent propio y no sigue redirecciones. Hoy ninguna fuente está automatizada: todo entra subido a mano.

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

-- Versiones publicadas del GeoJSON de barrios (bucket público `barrios`)
create table barrios_releases (
  version int primary key,
  url text not null,
  published_at timestamptz not null default now()
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
  origin text not null check (origin in ('official','geometry','learned','candidate')),  -- 'candidate': aún no confiable (§5.5)
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
  status text not null check (status in ('pending','extracted','failed')),
  attempts int not null default 0,  -- máximo 3 (§5.6)
  last_error text,
  failure_alerted_at timestamptz    -- la alarma de "falló tres veces" se envía una sola vez
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
  created_at timestamptz not null default now(),
  evaluated_at timestamptz,         -- cuándo lo revisó evaluate_outages (§5.4)
  confirmed boolean                 -- hubo pico de reportes en su ventana
);

-- Reportes anónimos de usuarios
create table reports (
  id bigint generated always as identity primary key,
  barrio_id text not null references barrios(id),
  service text not null check (service in ('luz','agua')),
  status text not null check (status in ('out','restored')),
  dedup_hash text not null,         -- HMAC diario, ver §7
  salt_day date not null,           -- día (hora de Ecuador) de la sal usada en dedup_hash
  weight real not null default 1,   -- 0.5 si la atestación falla (§7, desde H7)
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
-- A lo sumo un episodio abierto (ended_at null) por barrio y servicio.

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
  outage_id uuid,                   -- en 'crowd', el id de crowd_outages
  kind text not null,               -- 'heads_up', 'imminent', 'correction', 'crowd'
  sent_at timestamptz not null default now()
);
```

**Vistas públicas (lo único que lee el cliente):**

- `public_outages_active`: cortes con `tier in ('high','medium')` que terminan en el futuro o empezaron hace menos de 24 h. Se oculta un corte cuando lo reemplaza (`supersedes`) otro corte visible.
- `public_crowd_live`: barrios con al menos 3 dispositivos (`dedup_hash` distintos) cuyo último reporte de los últimos 60 minutos es `out`. El conteo se redondea a múltiplos de 5 (§7).
- `public_barrios_meta`: `version` y URL del GeoJSON vigente (la última fila de `barrios_releases`).
- `public_eeq_zones`: `id` y `name` de todas las zonas de luz de la EEQ, para la precisión opcional (§8.3).

Las vistas corren con los permisos de su dueño: `anon` y `authenticated` no tienen ningún permiso sobre las tablas, solo `select` sobre estas vistas. Las funciones de `public` tampoco se pueden ejecutar desde el cliente. Lo comprueban los tests pgTAP de `supabase/tests`.

**Retención (pg_cron cada 5 minutos, función `purge_expired_data`):**

- `reports`: borrar filas de más de 30 días.
- `daily_salts`: borrar sales de más de 48 h, contando los días en hora de Ecuador (§7). Desde ese momento ningún `dedup_hash` puede relacionarse con nada.
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
  endsNextDay: boolean; // termina después de la medianoche ("24:00" = "00:00" del día siguiente)
  notes: string | null;
};
```

- **Doble extracción:** dos llamadas independientes y en paralelo a la API de Claude con prompts distintos. Una primero transcribe las tablas del documento a Markdown y arma las filas desde esa transcripción; la otra devuelve las filas directamente. Las dos usan salida estructurada (JSON Schema generado desde el esquema Zod) y se validan con Zod.
- **Modelo:** se configura con `ANTHROPIC_MODEL` (por defecto `claude-opus-5-5`, esfuerzo `medium`) y nunca se escribe en el código. Las llamadas activan el respaldo del servidor (`fallbacks: "default"`): si el modelo rechaza un documento por un falso positivo, la API lo reintenta con otro modelo.
- **Prompts:** una fila por fecha y franja horaria (los rangos de días y las dos franjas de un mismo día se separan), nombres tal como aparecen, sin corregirlos ni inventarlos. Si la fecha no trae año, se usa el más cercano al día en que se recibió el documento. El documento es dato, no instrucción: el prompt pide ignorar cualquier instrucción escrita dentro.
- **Comparación:** las filas de ambas extracciones se emparejan uno a uno dentro de la misma franja (servicio, fecha, horas), las de mayor coincidencia primero. El acuerdo de una fila es el índice de Jaccard de sus nombres normalizados; una fila que solo encontró una extracción tiene acuerdo 0. Las filas repetidas dentro de una extracción se eliminan.
- **Normalización de nombres:** sin tildes ni mayúsculas, abreviaturas expandidas ("S." → "san", "STA." → "santa", "CDLA." → "ciudadela"), sin prefijos genéricos ("Subestación", "Barrio", "Sector") ni el número de sector o etapa al final ("Solanda S.1" → "solanda"). La comparación es difusa (coeficiente de Dice sobre bigramas) con el umbral `validator.nameSimilarity` de `config.ts`.
- Los documentos se guardan con su `sha256`; si llega el mismo archivo otra vez, no se reprocesa.

### 5.2 Validador (reglas deterministas)

Una fila se descarta si:

- La fecha no está entre hoy y hoy + 14 días.
- `end <= start` (salvo cortes que cruzan la medianoche, marcados explícitamente).
- Duración mayor a 24 h.
- Ninguna `zoneName` coincide con `utility_zones.name` o sus `aliases` del mismo servicio, y ningún nombre de barrio coincide con `barrios`. Una zona que no es una zona conocida también se compara con `barrios`, porque muchas veces es una parroquia ("Zona de cortes: Alangasí").

**Zonas fuera de Quito.** La EEQ también atiende Rumiñahui, Mejía y otros cantones. Si la zona de una fila es uno de esos lugares, la fila se guarda pero se queda en `low`: así no se pierden las parroquias de Quito que atiende (Los Bancos → Nanegalito) y no se publica un sector que solo comparte el nombre con una de Quito (Sangolquí → "San Juan").

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

- `acuerdo_doble_extracción`: el acuerdo de la fila (§5.1).
- `coincidencia_de_zonas`: 1 si alguna zona coincidió con una zona conocida; si no, la fracción de nombres de barrio que coincidieron con `barrios`.
- `confirmación_otra_fuente`: 1 si otra fuente ya publicó un corte `high` o `medium` del mismo servicio, con la misma hora de inicio y algún barrio en común.
- El puntaje se redondea a 4 decimales antes de compararlo con los umbrales.

### 5.4 Aprendizaje de `sources.trust`

Cada 10 minutos, `evaluate_outages()` (pg_cron) revisa los cortes programados de nivel high cuya ventana `[starts_at − 10 min, starts_at + 30 min]` ya cerró, y mira `reports` de los barrios afectados:

- Si algún barrio tuvo un pico de reportes `out` (al menos `crowd.minDistinctReports` dispositivos distintos): el corte se marca `confirmed` y `trust` sube `learning.trustStep`.
- Si no hubo ningún reporte y algún barrio tiene historial de reportes de ese servicio (proxy de que hay gente que usa la app ahí), `trust` baja `learning.trustStep`.
- Cada corte se evalúa una sola vez. `trust` se mantiene entre 0 y 1, redondeado a 4 decimales.

### 5.5 Aprendizaje de `zone_barrio`

Si un barrio sin relación declarada con la zona Z muestra un pico de reportes `out` dentro de la ventana de un corte programado de Z, su `weight` con Z sube `learning.zoneBarrioStep`, empezando como `origin = 'candidate'`. Al llegar a `learning.learnedWeight` pasa a `origin = 'learned'`. Los enlaces `candidate` no se usan para resolver cortes, y los `official` nunca se tocan. Un mismo pico cuenta una sola vez por zona y hora de inicio, aunque varios cortes de la zona compartan esa hora. Todo se hace con conteos por barrio: no se usa ninguna ubicación individual.

Todos los umbrales de §5.4 y §5.5 viven en `config.ts`. El SQL los lee de la función `thresholds()`, y un test falla si se desalinean.

### 5.6 Alarmas para el desarrollador

Todos los días a las 08:00 de Quito, pg_cron llama (con `pg_net`) a la Edge Function `send-alerts`, que envía un correo a `ADMIN_EMAIL` con Resend (`RESEND_API_KEY`) solo si `pending_alerts()` devuelve algo:

- Más del 30 % de los documentos extraídos en las últimas 24 h no publicaron ningún corte `high` ni `medium`.
- Una fuente activa (al menos 3 documentos en los 14 días anteriores) lleva 72 h sin enviar documentos. Así se aproxima "en temporada de cortes".
- Falló la extracción de un documento tres veces. Cada documento se avisa una sola vez y se marca solo después de que el correo salió.

El cron lee la URL del proyecto y la llave `service_role` de los secretos `project_url` y `service_role_key` del Vault de Supabase, que se crean a mano en cada entorno. `send-alerts` solo acepta esa llave.

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
- Payload sin datos personales: `{ service, outageId, barrioId, kind }` (o `zoneId` en vez de `barrioId` para el tema de zona) + título y texto.
- `notify` corre cada minuto. Solo anuncia cortes `high`; un corte reemplazado por una corrección visible no se anuncia.
- Idempotencia en detalle: antes de cada envío, `notify` inserta la fila en `notifications_log`, que tiene un índice único `(topic, outage_id, kind)`. Si la fila ya existe, no envía; si FCM falla, borra la fila y se reintenta en la siguiente corrida.
- Envío por condición FCM, nunca por token. Para un corte con zona EEQ, el tema de barrio va con `'v1_luz_b_X' in topics && !('v1_luz_z_Z' in topics)` y el de zona con `'v1_luz_z_Z' in topics`: quien sigue el barrio y la zona recibe un solo aviso.
- `correction` va a los temas del corte nuevo y a los del corte anterior que ya recibieron aviso. No se envía si la nueva ventana ya terminó. Si el corte reemplazado nunca se notificó, el nuevo se anuncia como `heads_up` normal.
- `crowd` se envía una vez por episodio de `crowd_outages` abierto y sin `matched_outage_id`.

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

- `nonce`: UUID v4 aleatorio que el teléfono genera **una vez por día de Ecuador** y descarta al día siguiente. Es lo único que se envía, junto con el barrio, el servicio y el estado: la app no manda ningún otro campo.
- El servidor calcula `dedup_hash = HMAC_SHA256(nonce, sal_del_día)`. La sal del día es **aleatoria** (tabla `daily_salts`), se crea a medianoche y se borra a las 48 h. No se deriva de ningún secreto fijo: si se pudiera recalcular, los hashes viejos dejarían de ser anónimos. Así se cuentan dispositivos distintos en un día sin poder seguir a nadie entre días.
- `attestation`: Play Integrity (Android) / App Attest (iOS) para comprobar que es la app genuina. Si la verificación falla, el reporte se acepta con peso 0.5: cuenta para el mapa (`public_crowd_live`), pero **no para abrir un episodio que dispare el aviso `crowd`**, que exige `CROWD_MIN_DISTINCT` dispositivos atestados (peso 1). Así, alguien que fabrique nonces con un script no puede mandar avisos falsos a todo un barrio. El límite por IP no se baja: con el CGNAT de las operadoras móviles frenaría a vecinos reales, y cambiar de IP es trivial. Google y Apple procesan esta verificación; se declara en la política de privacidad. **Pendiente hasta H7** (requiere las cuentas de Play Console y Apple Developer): mientras tanto el campo se ignora y todo reporte pesa 1.
- Límite por IP: tabla `rate_limits` con `HMAC_SHA256(ip, sal_del_día)`, nunca la IP en claro, y filas borradas a la hora. Máximo 10 reportes por hora de reloj por IP. No se usan servicios externos (Upstash u otros) para esto. La IP sale solo de cabeceras que ponen nuestros proxies (`cf-connecting-ip`, `x-real-ip` o el último valor de `x-forwarded-for`), porque el cliente puede anteponer lo que quiera a `x-forwarded-for`.
- Todo ocurre en la función SQL `submit_report` en una sola transacción: crea la sal del día si falta, calcula los HMAC, aplica el límite e inserta. La Edge Function solo valida el cuerpo y responde `ok` (200), `invalid_report` (400), `unknown_barrio` (404) o `rate_limited` (429). No registra la IP ni el cuerpo.
- Límite en el teléfono: un reporte por servicio y barrio cada 15 minutos (`lastReports`), y la app pide confirmación antes de enviar.

**Agregación (`aggregate_reports`, pg_cron cada minuto):**

- **Conteo de dispositivos:** se toma el último estado de cada `dedup_hash` en la ventana y se suman los pesos **por día de sal**; vale el día con más dispositivos. Un teléfono que reporta antes y después de medianoche tiene dos hashes, pero cuenta una sola vez. Si hay error, es por contar de menos. `public_crowd_live` y el aprendizaje (`report_peaks`, §5.4) cuentan igual.
- Un barrio entra en `crowd_outages` cuando hay al menos `CROWD_MIN_DISTINCT` (por defecto 5) dispositivos cuyo último estado en 20 minutos es `out`.
- Sale cuando, en la ventana de 30 minutos, los `restored` superan a los `out`, o pasan 6 h sin reportes.
- Si coincide con un corte programado del mismo servicio y barrio, se marca `matched_outage_id` y **no** se manda aviso `crowd` (ya hubo aviso oficial).
- `public_crowd_live` muestra conteos redondeados a múltiplos de 5 y nunca menos de 3, para no exponer a nadie en un barrio pequeño.

---

## 8. App móvil (`apps/mobile`)

### 8.1 Pantallas

1. **Bienvenida (3 pasos).** Qué hace la app; "App independiente, no afiliada a la EEQ ni a Epmaps"; confirmación de tener 15 años o más; aceptación de la política de privacidad (enlace a la web).
2. **Permiso de notificaciones.** Explicación previa en una pantalla propia, justo después de la bienvenida, antes del diálogo del sistema. Si el usuario dice "Ahora no", puede activarlos después en Ajustes.
3. **Mis lugares.** Lista de lugares guardados con su estado actual (sin cortes / corte programado / vecinos reportan). Botón "Agregar lugar".
4. **Agregar lugar.** Mapa centrado en Quito. Opciones: "Usar mi ubicación" (permiso solo en primer plano, se pide aquí, precedido de una pantalla propia que explica que la ubicación se usa una sola vez para encontrar el barrio y nunca sale del teléfono), tocar el mapa o buscar barrio por nombre (búsqueda local). Quien no quiera dar permiso de ubicación puede usar la app igual con las otras dos opciones. Se muestra el barrio detectado para confirmar y un alias ("Casa", "Trabajo").
5. **Detalle del lugar.** Próximos cortes programados (luz y agua), fuente y hora de publicación de cada uno, estado de reportes de vecinos, botones grandes **"Se fue la luz" / "Volvió la luz"** y lo mismo para el agua.
6. **Mapa en vivo.** Selector Luz/Agua. Cada barrio se colorea según lo más fuerte que tenga para ese servicio: corte anunciado (high), "Sin confirmar" (medium) o "Vecinos reportan" (reportes). Leyenda clara. Nunca puntos individuales.
7. **Ajustes.** Estado de los avisos (con botón para activarlos), horario silencioso, ver política de privacidad, **"Borrar todos mis datos"** (borra MMKV y cancela todas las suscripciones), versión de la app, enlace al código en GitHub.

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
  ageConfirmed: boolean;
  privacyAcceptedVersion: number;
};
```

Las coordenadas se guardan solo para volver a dibujar el lugar en el mapa del propio teléfono. No se envían nunca.

La ciudad descargada (cortes, reportes y el GeoJSON de barrios con su versión) se guarda aparte en MMKV, como caché; "Borrar todos mis datos" también la borra.

### 8.3 Precisión opcional de luz

Para quien tiene su planilla: un botón abre el buscador oficial de la EEQ en el navegador del sistema (`expo-web-browser`). El usuario consulta su sector allí y luego lo elige, en el detalle de cada lugar, de la lista completa de `public_eeq_zones` que la app descarga y filtra en el teléfono. La app se suscribe a `v1_luz_z_<zoneId>`. La app **no** lee la página de la EEQ ni guarda el número de suministro.

### 8.4 Calidad

- Funciona sin conexión para "Mis lugares" y los últimos cortes descargados.
- El GeoJSON de barrios se actualiza solo si cambia `public_barrios_meta.version`.
- Accesibilidad: tamaños de texto dinámicos, contraste AA, etiquetas en botones de reporte.
- Sin Expo Go: se usa dev client por Firebase.
- Firebase solo con Messaging (`@react-native-firebase/app` y `messaging`): `apps/mobile/firebase.json` apaga la recolección automática de datos y Analytics. El token push no sale del SDK de FCM; la app solo se suscribe a temas.

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
RESEND_API_KEY=                   # alarmas por correo (§5.6)
ALERT_FROM_EMAIL=                 # opcional; por defecto el remitente de prueba de Resend
# Web
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_EMAIL=
```

En la app móvil solo van `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_URL` (para el enlace a la política de privacidad) y los archivos de Firebase (`google-services.json`, `GoogleService-Info.plist`), que se cargan como secretos de EAS y **no** se versionan.

La sal para deduplicar reportes **no** es una variable de entorno: es aleatoria y vive en `daily_salts` (§7).

---

## 12. Seguridad e incidentes

- `SECURITY.md` explica cómo reportar una vulnerabilidad en privado (correo de contacto o reporte privado de vulnerabilidades de GitHub, nunca issues públicos).
- Ante una filtración o acceso indebido: cortar el acceso, rotar las claves afectadas, evaluar qué datos se expusieron y, si hubo datos personales comprometidos, notificar a la Superintendencia de Protección de Datos Personales en el término de 5 días desde que se tuvo constancia de la vulneración (LOPDP art. 43 y Norma Técnica de Notificación de Vulneraciones, Resolución SPDP-SPD-2026-0040-R), por medios digitales a través del sistema de la Superintendencia (SISPDP), y avisar a los usuarios con un mensaje en la app y en la web.
- Los proveedores que tratan datos por nuestra cuenta (encargados) deben avisarnos de cualquier vulneración en un máximo de 2 días; se verifica en sus acuerdos de tratamiento de datos.
- Las transferencias internacionales a proveedores (Supabase, Vercel, Google) se documentan y la documentación se conserva al menos 3 años (Resolución SPDP-SPD-2026-0004-R).
- Con el diseño de esta SPEC, una filtración de la base expondría solo datos públicos y conteos anónimos. Mantener eso cierto es la mejor defensa: cualquier cambio que agregue datos personales al servidor requiere actualizar esta SPEC y la política de privacidad **antes** de programarlo.
- La API de Claude solo recibe documentos públicos (cronogramas y comunicados). Nunca se le envían reportes, IPs ni nada que venga de los usuarios.
