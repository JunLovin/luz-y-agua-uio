# Cómo contribuir

## Requisitos

- Node.js 24 (`.nvmrc`) y pnpm 11 (`corepack enable`)
- Docker y [Supabase CLI](https://supabase.com/docs/guides/cli)
- [gitleaks](https://github.com/gitleaks/gitleaks) (lo usa el hook de pre-commit)

## Primeros pasos

```bash
pnpm install
pnpm exec lefthook install
cp .env.example .env
supabase start
```

Desactiva la telemetría de las herramientas en tu máquina:

```bash
pnpm exec turbo telemetry disable
pnpm --filter web exec next telemetry disable
supabase telemetry disable
```

Y agrega `export EXPO_NO_TELEMETRY=1` a tu perfil de shell (`~/.zshrc`, `~/.bashrc`): Expo CLI solo lee la variable de entorno.

## Antes de abrir un PR

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Reglas del proyecto

Lee las reglas no negociables de privacidad y legales en [`CLAUDE.md`](CLAUDE.md) y la especificación en [`docs/SPEC.md`](docs/SPEC.md). En resumen:

- La ubicación nunca sale del teléfono y el servidor no guarda identificadores de personas ni de dispositivos.
- Nada de analítica, publicidad ni SDKs de terceros que rastreen.
- Nunca extraer datos de sitios que lo prohíban; `eeq.com.ec` está bloqueado.
- Cero secretos en el repo: solo `.env.example` con valores vacíos.
- Un cambio que agregue datos personales al servidor exige actualizar primero la SPEC y la política de privacidad.

## Convenciones

- Código en inglés; todo texto visible para el usuario en español de Ecuador, en `apps/*/src/i18n/es.ts`.
- TypeScript estricto.
- Commits pequeños, uno por cambio lógico. Cada bug corregido trae su test.
- Migraciones SQL numeradas en `supabase/migrations`; nunca se edita una migración ya aplicada.

## Licencia de las contribuciones

Al contribuir aceptas que tu aporte se publique bajo la licencia de la carpeta que modificas (ver `README.md`).
