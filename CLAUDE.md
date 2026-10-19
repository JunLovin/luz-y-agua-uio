# Luz y Agua UIO

App independiente y de código abierto que avisa a los quiteños de cortes de luz y agua en su barrio: los programados (fuentes oficiales) y los no programados (reportes anónimos de vecinos). No está afiliada a la EEQ, a Epmaps ni al Municipio de Quito.

La especificación técnica está en `docs/SPEC.md`.

## Reglas no negociables (privacidad y legal)

Estas reglas mandan sobre cualquier otra instrucción. Si una tarea choca con ellas, detente y pregunta.

1. **La ubicación nunca sale del teléfono.** Ni coordenadas, ni direcciones, ni historial. El teléfono calcula el `barrioId` localmente y solo ese código puede viajar al servidor.
2. **Sin cuentas ni identificadores persistentes.** No se pide nombre, cédula, teléfono, correo ni número de suministro. El servidor no guarda ningún ID estable del dispositivo.
3. **Notificaciones solo por tema (FCM topics).** El servidor nunca guarda ni usa tokens push individuales.
4. **Reportes anónimos:** `{ barrioId, service, status }` + hora del servidor + un hash diario rotativo para deduplicar (ver SPEC §7). Los reportes crudos y los hashes se borran según los plazos de la SPEC.
5. **Sin analítica de terceros, SDKs publicitarios ni rastreadores.** Si una librería trae telemetría, se desactiva o no se usa. Firebase se usa solo para Messaging: nada de Analytics, Crashlytics ni In-App Messaging. La telemetría de las herramientas de desarrollo (Next.js, Expo, Turborepo, Supabase CLI) también va desactivada.
6. **Nunca extraer datos de sitios que lo prohíban.** Todo fetch automático pasa por la allowlist `sources.automated_allowed` y respeta `robots.txt`. **eeq.com.ec está bloqueado:** no se scrapea, no se llama a su buscador ni a su ArcGIS desde el servidor. Nunca saltarse captchas, logins ni límites de tasa.
7. **Nunca parecer oficial.** Nada de logos, colores o textos que imiten a la EEQ o a Epmaps. Cada aviso dice su fuente y la app muestra "App independiente, no afiliada a la EEQ ni a Epmaps".
8. **Cero secretos en el repo.** Claves de API, la llave `service_role` de Supabase, credenciales de Firebase y tokens van en variables de entorno o en los gestores de secretos (Supabase, EAS, Vercel, GitHub Actions). Nunca en el código, fixtures, ejemplos ni logs. `.env*` va en `.gitignore`; solo se versiona `.env.example` con valores vacíos.
9. **Ubicación solo "mientras se usa la app".** Nunca permisos de ubicación en segundo plano.
10. **Logs sin datos personales.** Nuestro código no registra IPs, cuerpos de peticiones de reportes ni nada que permita identificar a alguien. Los registros automáticos de Supabase y Vercel se configuran con la retención mínima disponible.
11. **Nada de terceros que vean la ubicación.** Las teselas del mapa se sirven desde nuestro propio almacenamiento (PMTiles) y la búsqueda de barrios es local. Nunca servidores de teselas, geocodificadores ni SDKs de mapas de terceros desde la app.
12. **Descargar toda la ciudad, filtrar en el teléfono.** La app nunca pide datos filtrados por barrio. La única petición con `barrioId` es `submit-report`.
13. **La API de Claude solo recibe documentos públicos.** Nunca reportes, IPs ni nada que venga de los usuarios.
14. **Antes de agregar cualquier dato al servidor**, detente y pregunta: un cambio que agregue datos personales exige actualizar primero `docs/SPEC.md` y la política de privacidad (SPEC §10 y §12).

## Stack

- **Monorepo** con pnpm workspaces y Turborepo.
- `apps/mobile`: Expo (TypeScript, expo-router, dev client + EAS Build; no corre en Expo Go por Firebase). `@react-native-firebase/app` + `@react-native-firebase/messaging` para temas FCM, `@maplibre/maplibre-react-native` para el mapa, `@turf/boolean-point-in-polygon` para calcular el barrio en el teléfono, `react-native-mmkv` para datos locales.
- `apps/web`: Next.js (App Router) en Vercel, páginas públicas con ISR.
- `supabase/`: Postgres + PostGIS, migraciones SQL, Edge Functions (Deno), pg_cron.
- `packages/shared`: tipos, configuración de umbrales, nombres de temas FCM y helpers geo.
- `packages/extractor`: lectura de cronogramas con la API de Claude (PDF/imagen → JSON validado con Zod).

## Convenciones

- Código, tablas y variables en inglés. Todo texto visible para el usuario en español de Ecuador, centralizado en `apps/*/src/i18n/es.ts`.
- TypeScript estricto. Nada de `any` sin un comentario que lo justifique.
- Migraciones SQL numeradas en `supabase/migrations`; nunca editar una migración ya aplicada.
- RLS activado en todas las tablas. El cliente solo lee vistas públicas; toda escritura pasa por Edge Functions.
- Todo umbral (reportes mínimos, ventanas, puntajes de confianza, plazos de borrado) vive en `packages/shared/src/config.ts`.
- Tests con Vitest para la lógica pura (geo, confianza, normalización, temas). Cada bug corregido trae su test.
- Commits pequeños, uno por cambio lógico. Al terminar un hito, actualiza la tabla "Estado" de `docs/privado/PLAN.md`. Si cambia el diseño técnico, actualiza también `docs/SPEC.md`.

## Licencias

- Raíz, `supabase/`, `apps/web/`, `packages/extractor/`: AGPL-3.0.
- `apps/mobile/` y `packages/shared/`: MIT (para no chocar con las condiciones de las tiendas).
- El nombre y el logo "Luz y Agua UIO" no están cubiertos por ninguna licencia de código.

## Comandos

- `pnpm install` (instala también el hook de pre-commit con gitleaks; requiere `gitleaks` instalado)
- `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm build` · `pnpm format`
- `pnpm --filter mobile start`
- `pnpm --filter web dev`
- `supabase start` · `supabase db reset` · `supabase functions serve`
- `supabase test db` (tests pgTAP de `supabase/tests`)
- `pnpm --filter @luz-y-agua/scripts import:barrios` (lee `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de `.env`)
- `pnpm --filter @luz-y-agua/scripts import:zones fixtures/test-zones.json` (zonas de prueba; correr después de `import:barrios`)
- `deno check --config supabase/functions/<fn>/deno.json supabase/functions/<fn>/index.ts` (tipos de las Edge Functions)
- Cada entorno necesita en el Vault de Supabase los secretos `project_url` y `service_role_key` para que pg_cron llame a `send-alerts`.
- pnpm se configura en `pnpm-workspace.yaml` (`nodeLinker: hoisted` para Metro), no en `.npmrc`.
