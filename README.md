# Frontend

SPA Angular del proyecto `Gastos`.

## Desarrollo local

```bash
npm install
npm start
```

Por defecto `ng serve` usa configuración `development`.

## Build de producción

```bash
npm run build
```

La salida útil para despliegue está en:

```text
dist/web/browser
```

## Variables y entorno

El frontend productivo consume:

- `https://api-gastos.buildforge.work/api`
- `https://mobilegastos.buildforge.work`

La configuración Firebase web se mantiene en:

- `src/environments/firebase-options.ts`

## Docker (producción)

Imagen multi-etapa: Node `22.12.0` para `ng build` y Nginx para servir `dist/web/browser`.

```bash
cd frontend
docker build -t gastos-frontend .
docker run --rm -p 8080:80 gastos-frontend
```

En Coolify elige despliegue por **Dockerfile**, raíz del repo `frontend/`, puerto expuesto **80** (mapea en proxy a `443` si aplica).

## Despliegue con Coolify

La guía completa para desplegar este frontend con Cloudflare y Coolify está en:

- `docs/despliegue-coolify-cloudflare.md`

## Notas operativas

- El build de producción reemplaza `src/environments/environment.ts` por `src/environments/environment.prod.ts`.
- Si el backend responde pero el navegador muestra `0 Unknown Error`, valida primero `OPTIONS /api/auth/register` y el dominio `api-gastos.buildforge.work`.
