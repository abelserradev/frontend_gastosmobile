#!/usr/bin/env node
/**
 * Build producción + APK debug y la deja en public/gastos-mobile.apk
 * para que Coolify la empaquete en la imagen nginx al hacer deploy.
 *
 * Uso: pnpm run mobile:publish-apk
 * Luego: git add public/gastos-mobile.apk && commit && redeploy Coolify
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apkSource = join(
  root,
  'android/app/build/outputs/apk/debug/app-debug.apk',
);
const apkDest = join(root, 'public/gastos-mobile.apk');

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

console.log('📦 Build Angular (production)…');
run('pnpm', ['run', 'build', '--configuration=production']);

console.log('📱 Cap sync android…');
run('pnpm', ['exec', 'cap', 'sync', 'android']);

console.log('🔨 Gradle assembleDebug…');
run('./gradlew', ['assembleDebug'], join(root, 'android'));

if (!existsSync(apkSource)) {
  console.error(`No se encontró APK en ${apkSource}`);
  process.exit(1);
}

mkdirSync(join(root, 'public'), { recursive: true });
copyFileSync(apkSource, apkDest);

console.log(`✅ APK publicada: public/gastos-mobile.apk`);
console.log('   Subí el archivo al repo y redeployá el frontend en Coolify.');
