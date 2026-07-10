# Pangasa — Localizador de boutiques

App estática que muestra en qué boutiques está disponible cada prenda de la
temporada actual. Datos en tiempo real desde SIMSS (`EComPrendasServidas`)
cruzados con el catálogo Shopify (título/foto/enlace por referencia).

- `npm run build` regenera `web/data.json` (requiere env `SIMSS_*` y `SHOPIFY_*`).
- `npm test` corre los tests (`node --test`).
- `npm run serve` sirve `web/` en http://localhost:4321 para desarrollo.

## Despliegue

Se publica en **GitHub Pages** desde la carpeta `web/` vía Actions
(`.github/workflows/deploy.yml`). El cron `.github/workflows/refresh.yml`
regenera `web/data.json` a diario y, al hacer push, dispara el redeploy.

Se embebe por iframe en la página *Boutiques* de la web Pangasa.

## Estructura

- `build/` — pipeline de datos: `simss.mjs` (ERP), `shopify.mjs` (catálogo),
  `transform.mjs` (índice puro), `build-index.mjs` (orquestador).
- `web/` — app estática: `index.html`, `styles.css`, `app.js`, `search.js`, `data.json`.
- `test/` — tests unitarios de la lógica pura.
