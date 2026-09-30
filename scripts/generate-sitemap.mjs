import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envProd = readFileSync(join(root, 'src/environments/environment.prod.ts'), 'utf8');
const originMatch = envProd.match(/appOriginUrl:\s*['"]([^'"]+)['"]/);
const origin = (originMatch?.[1] ?? 'https://mobilegastos.buildforge.work').replace(
  /\/$/,
  '',
);

const routesJson = JSON.parse(
  readFileSync(join(root, 'scripts/public-seo-routes.json'), 'utf8'),
);
const today = new Date().toISOString().slice(0, 10);

const urls = routesJson.routes
  .map(
    (r) => `  <url>
    <loc>${origin}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(join(root, 'public/sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml → ${routesJson.routes.length} URLs (${origin})`);
