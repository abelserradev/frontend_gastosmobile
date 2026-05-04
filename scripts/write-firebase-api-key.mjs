import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const target = path.join(repoRoot, 'src/environments/firebase-api-key.ts');
const envKey = process.env.FIREBASE_WEB_API_KEY;

if (envKey && envKey.trim() !== '') {
  fs.writeFileSync(
    target,
    `/** Generado por scripts/write-firebase-api-key.mjs (variable FIREBASE_WEB_API_KEY). */\nexport const firebaseWebApiKey = ${JSON.stringify(envKey.trim())};\n`,
  );
  process.exit(0);
}

if (fs.existsSync(target)) {
  process.exit(0);
}

const examplePath = path.join(repoRoot, 'src/environments/firebase-api-key.example.ts');
if (!fs.existsSync(examplePath)) {
  console.error('write-firebase-api-key: falta firebase-api-key.example.ts');
  process.exit(1);
}

console.error(
  [
    'write-firebase-api-key: no hay FIREBASE_WEB_API_KEY ni src/environments/firebase-api-key.ts.',
    '  Opciones:',
    '    • export FIREBASE_WEB_API_KEY=... && npm run build',
    '    • cp src/environments/firebase-api-key.example.ts src/environments/firebase-api-key.ts y edita la constante',
  ].join('\n'),
);
process.exit(1);
