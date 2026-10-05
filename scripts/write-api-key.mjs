import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const target = path.join(repoRoot, 'src/environments/api-key.ts');
// Coolify: GASTOS_API_KEY (front) o SECRET_API_KEY (mismo valor que el backend), marcadas "Available at Buildtime".
const envKey = process.env.GASTOS_API_KEY ?? process.env.SECRET_API_KEY;

/** Valores de CI o plantilla; no sirven contra API prod (X-API-KEY inválida en APK). */
function isPlaceholderApiKey(value) {
  const v = (value ?? '').trim();
  if (!v) {
    return true;
  }
  return /ci-placeholder|YOUR_GASTOS_API_KEY/i.test(v);
}

function readKeyFromGeneratedFile() {
  if (!fs.existsSync(target)) {
    return '';
  }
  const content = fs.readFileSync(target, 'utf8');
  const m = /export const gastosApiKey = (.+);/.exec(content);
  if (!m) {
    return '';
  }
  try {
    return JSON.parse(m[1]);
  } catch {
    return '';
  }
}

if (envKey && envKey.trim() !== '') {
  fs.writeFileSync(
    target,
    `/** Generado por scripts/write-api-key.mjs (GASTOS_API_KEY o SECRET_API_KEY). */\nexport const gastosApiKey = ${JSON.stringify(envKey.trim())};\n`,
  );
  process.exit(0);
}

if (fs.existsSync(target)) {
  const existing = readKeyFromGeneratedFile();
  if (isPlaceholderApiKey(existing)) {
    console.error(
      [
        'write-api-key: src/environments/api-key.ts tiene un placeholder (login móvil fallará con X-API-KEY inválida).',
        '  export GASTOS_API_KEY="<mismo valor que SECRET_API_KEY del backend>"',
        '  pnpm run build   # o mobile:publish-apk',
      ].join('\n'),
    );
    process.exit(1);
  }
  process.exit(0);
}

const examplePath = path.join(repoRoot, 'src/environments/api-key.example.ts');
if (!fs.existsSync(examplePath)) {
  console.error('write-api-key: falta api-key.example.ts');
  process.exit(1);
}

console.error(
  [
    'write-api-key: falta GASTOS_API_KEY (o SECRET_API_KEY) y no existe src/environments/api-key.ts.',
    '  Coolify: Environment Variables → GASTOS_API_KEY = mismo valor que SECRET_API_KEY del backend',
    '           → marcar "Available at Buildtime" (no solo runtime).',
    '  Local:',
    '    • export GASTOS_API_KEY=... && pnpm run build',
    '    • cp src/environments/api-key.example.ts src/environments/api-key.ts y edita la constante',
  ].join('\n'),
);
process.exit(1);
