# CI y seguridad en GitHub (frontend)

## Workflows

| Workflow | Cuándo corre | Qué hace |
|----------|--------------|----------|
| **CI** | Push y PR a `main`, `master`, `develop` | `pnpm install --frozen-lockfile`, genera environments CI, Prettier check, ESLint (`--max-warnings=0`), tests headless Karma, build producción |
| **Security audit** | Push/PR + lunes 06:00 UTC + manual | `pnpm audit` (aviso moderate) |
| **SonarCloud** | Push/PR a `main`, `master`, `develop` | Tests con cobertura + análisis SonarCloud |
| **Deploy Coolify** | Solo manual | Webhook de deploy (no sustituye CI) |

## Bloqueo por vulnerabilidades

- El workflow **Security audit** alerta sobre vulnerabilidades moderate+.
- Corregir high/critical antes de mergear; moderate puede gestionarse vía Dependabot u overrides.

## Hooks locales (pre-commit)

El repo incluye [`.pre-commit-config.yaml`](../.pre-commit-config.yaml) con:

| Hook | Stage | Descripción |
|------|-------|-------------|
| **gitleaks** | pre-commit | Detección de secretos en staged files. |
| **prettier** | pre-commit | Verifica formato de TS/HTML/SCSS staged. |
| **eslint** | pre-commit | Lint de archivos TS staged vía `ng lint web`. |
| **lint + tests** | pre-push | Ejecuta `pnpm run lint:ci && ng test --no-watch --browsers=ChromeHeadlessNoSandbox`. |

### Instalación

```bash
pip install pre-commit   # o brew install pre-commit
pre-commit install
pre-commit install --hook-type pre-push
pre-commit run --all-files
```

### Nota sobre ESLint

El proyecto usa [angular-eslint](https://github.com/angular-eslint/angular-eslint) con flat config (`eslint.config.js`). Tras clonar o cambiar ramas:

```bash
pnpm install
pnpm run lint:ci
```

La primera ejecución puede requerir ajustar el baseline si el schematic genera advertencias en código existente.

## Branch protection (configurar en GitHub)

Repo → **Settings** → **Branches** → **Add rule** (o editar regla de `develop`/`main`):

1. **Branch name pattern:** `develop` (repetir para `main`).
2. Activar:
   - **Require a pull request before merging**.
   - **Require status checks to pass before merging**.
3. Buscar y marcar:
   - `Frontend (Angular)` (workflow CI)
   - SonarCloud si está activado.
4. Opcional: **Require branches to be up to date before merging**.

## Dependabot

El repo sigue la misma política que el backend: Dependabot agrupa actualizaciones y CI bloquea merge si hay vulnerabilidades high/critical.

## Secretos

No commitear `.env` ni `environment*.ts` con valores reales. Los workflows CI usan placeholders cuando los secrets no están definidos (`secrets.FIREBASE_WEB_API_KEY || 'ci-placeholder-...'`).
