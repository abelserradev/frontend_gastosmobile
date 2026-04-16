# Frontend (Angular)

Versión objetivo del framework: **Angular 20** (alineada con el [CLI](https://angular.dev/tools/cli) y la documentación en [angular.dev](https://angular.dev/overview)). Tras cambiar `package.json`, ejecuta `npm install` y, si hace falta migrar el proyecto: `ng update @angular/core @angular/cli`.

## Tailwind CSS v4

Se sigue la [guía oficial para Angular](https://tailwindcss.com/docs/installation/framework-guides/angular): `tailwindcss` + `@tailwindcss/postcss` + `postcss` y `.postcssrc.json`. Las utilidades se procesan dentro de `ng serve` / `ng build` (mismo motor Tailwind 4).

Si necesitas el flujo **solo con la CLI** (`npx @tailwindcss/cli`), está documentado en [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli); en Angular lo habitual es PostCSS integrado para no duplicar procesos.

## Desarrollo

```bash
npm install
npm start
```

## Gráficos (Chart.js)

El gráfico de torta usa **solo `chart.js`** (`Chart.register` en `src/main.ts` y `ExpensePieChartComponent`). No se usa **ng2-charts** para no arrastrar `@angular/cdk` en versiones distintas a las de tu `@angular/core`.

## Build

```bash
npm run build
```

Si antes instalaste dependencias conflictivas, limpia e instala de nuevo:

```bash
rm -rf node_modules package-lock.json && npm install
```
