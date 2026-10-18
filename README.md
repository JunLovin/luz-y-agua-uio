# Luz y Agua UIO

App gratuita y de código abierto que avisa a los quiteños de cortes de luz y agua en su barrio: los programados, a partir de fuentes oficiales públicas, y los no programados, a partir de reportes anónimos de vecinos.

> App independiente, no afiliada a la EEQ, a Epmaps ni al Municipio de Quito.

## Privacidad por diseño

- Sin cuentas: no pedimos nombre, cédula, teléfono, correo ni número de suministro.
- Tu ubicación nunca sale del teléfono: el barrio se calcula localmente.
- Los avisos llegan por temas de barrio; no sabemos quién recibe cada aviso.
- Sin analítica, publicidad ni rastreadores.

El diseño técnico completo está en [`docs/SPEC.md`](docs/SPEC.md).

## Estructura

| Carpeta              | Contenido                                           | Licencia |
| -------------------- | --------------------------------------------------- | -------- |
| `apps/mobile`        | App móvil (Expo)                                    | MIT      |
| `apps/web`           | Web pública (Next.js)                               | AGPL-3.0 |
| `packages/shared`    | Tipos, umbrales y temas de notificación compartidos | MIT      |
| `packages/extractor` | Lectura de cronogramas oficiales                    | AGPL-3.0 |
| `supabase`           | Base de datos, migraciones y funciones              | AGPL-3.0 |

El resto del repositorio está bajo AGPL-3.0. El nombre y el logo "Luz y Agua UIO" no están cubiertos por ninguna licencia de código.

## Desarrollo

Requisitos y pasos en [`CONTRIBUTING.md`](CONTRIBUTING.md).

```bash
pnpm install
pnpm test
pnpm --filter mobile start
pnpm --filter web dev
supabase start
```

## Seguridad

Para reportar una vulnerabilidad, lee [`SECURITY.md`](SECURITY.md). No abras issues públicos para eso.
