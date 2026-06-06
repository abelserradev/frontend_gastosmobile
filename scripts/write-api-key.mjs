import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const target = path.join(repoRoot, 'src/environments/api-key.ts');
const envKey = process.env.GASTOS_API_KEY;

if (envKey && envKey.trim() !== '') {
  fs.writeFileSync(
    target,
    `/** Generado por scripts/write-api-key.mjs (variable GASTOS_API_KEY). */\nexport const gastosApiKey = ${JSON.stringify(envKey.trim())};\n`,
  );
  process.exit(0);
}

if (fs.existsSync(target)) {
  process.exit(0);
}

const examplePath = path.join(repoRoot, 'src/environments/api-key.example.ts');
if (!fs.existsSync(examplePath)) {
  console.error('write-api-key: falta api-key.example.ts');
  process.exit(1);
}

console.error(
  [
    'write-api-key: no hay GASTOS_API_KEY ni src/environments/api-key.ts.',
    '  Opciones:',
    '    • export GASTOS_API_KEY=... && pnpm run build',
    '    • cp src/environments/api-key.example.ts src/environments/api-key.ts y edita la constante',
  ].join('\n'),
);
process.exit(1);
