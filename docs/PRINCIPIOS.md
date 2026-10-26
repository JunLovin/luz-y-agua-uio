# Principios del proyecto

Luz y Agua UIO avisa de cortes de luz y agua sin saber quién eres. Estas reglas mandan sobre cualquier otra decisión técnica: si un cambio choca con alguna, ábrelo primero como issue para discutirlo. El código las cita como "PRINCIPIOS.md rule N".

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
14. **Antes de agregar cualquier dato al servidor**, se discute primero: un cambio que agregue datos personales exige actualizar primero `docs/SPEC.md` y la política de privacidad (SPEC §10 y §12).
