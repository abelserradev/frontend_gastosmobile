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
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apkSource = join(
  root,
  'android/app/build/outputs/apk/debug/app-debug.apk',
);
const apkDest = join(root, 'public/gastos-mobile.apk');

/** La APK embebe el bundle prod; sin clave real el backend responde X-API-KEY inválida. */
function assertProductionApiKey() {
  const envKey = (
    process.env.GASTOS_API_KEY ??
    process.env.SECRET_API_KEY ??
    ''
  ).trim();
  if (!envKey || /ci-placeholder|YOUR_GASTOS_API_KEY/i.test(envKey)) {
    console.error(
      '❌ Falta GASTOS_API_KEY (o SECRET_API_KEY) con el valor de producción.\n' +
        '   Debe coincidir con SECRET_API_KEY del backend en Coolify.\n' +
        '   Ejemplo: export GASTOS_API_KEY="..." && pnpm run mobile:publish-apk',
    );
    process.exit(1);
  }
}

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

console.log('🔑 API key producción…');
assertProductionApiKey();
run('node', ['scripts/write-api-key.mjs']);

console.log('📦 Build Angular (production)…');
run('pnpm', ['run', 'build', '--configuration=production']);

console.log('📱 Cap sync android…');
run('pnpm', ['exec', 'cap', 'sync', 'android']);

/** Gradle/AGP 8.14: JDK 17–21 para el daemon; JDK 25 rompe el build. Compilación → toolchain 21 en build.gradle. */
function javaMajor(dir) {
  const probe = spawnSync(join(dir, 'bin', 'java'), ['-version'], {
    encoding: 'utf8',
  });
  const verLine = `${probe.stderr ?? ''}${probe.stdout ?? ''}`;
  const versionMatch = /version "(\d+)/.exec(verLine);
  return Number(versionMatch?.[1] ?? 0);
}

function resolveJavaHome() {
  const candidates = [
    '/usr/lib/jvm/java-21-openjdk-amd64',
    '/usr/lib/jvm/java-17-openjdk-amd64',
    `${homedir()}/Descargas/android-studio-quail1-linux/android-studio/jbr`,
    process.env.JAVA_HOME,
  ].filter(Boolean);
  for (const dir of candidates) {
    if (!existsSync(join(dir, 'bin', 'java'))) {
      continue;
    }
    const major = javaMajor(dir);
    if (major >= 17 && major <= 21) {
      return dir;
    }
  }
  return null;
}

console.log('🔨 Gradle assembleDebug…');
const javaHome = resolveJavaHome();
if (!javaHome) {
  console.error(
    'Gradle necesita JDK 17–21 (AGP no soporta JDK 25).\n' +
      '  sudo apt install openjdk-21-jdk   # recomendado\n' +
      '  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64',
  );
  process.exit(1);
}
if (process.env.JAVA_HOME !== javaHome) {
  console.log(`   JAVA_HOME → ${javaHome}`);
}
const gradleEnv = { ...process.env, JAVA_HOME: javaHome };
function runGradle() {
  const r = spawnSync('./gradlew', ['assembleDebug'], {
    cwd: join(root, 'android'),
    stdio: 'inherit',
    shell: false,
    env: gradleEnv,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}
runGradle();

if (!existsSync(apkSource)) {
  console.error(`No se encontró APK en ${apkSource}`);
  process.exit(1);
}

mkdirSync(join(root, 'public'), { recursive: true });
copyFileSync(apkSource, apkDest);

console.log(`✅ APK publicada: public/gastos-mobile.apk`);
console.log('   Sube el archivo al repo y redespliega el frontend en Coolify.');
