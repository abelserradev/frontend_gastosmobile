#!/usr/bin/env node
/**
 * Build producción + APK debug y la deja en public/gastos-mobile.apk
 * para que Coolify la empaquete en la imagen nginx al hacer deploy.
 *
 * Uso: pnpm run mobile:publish-apk
 * Luego: git add public/gastos-mobile.apk && commit && redeploy Coolify
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apkSource = join(
  root,
  'android/app/build/outputs/apk/debug/app-debug.apk',
);
const apkDest = join(root, 'public/gastos-mobile.apk');
const googleServicesPath = join(root, 'android/app/google-services.json');

function printDebugSha1Hint() {
  const keystore =
    process.platform === 'win32'
      ? join(process.env.USERPROFILE ?? homedir(), '.android', 'debug.keystore')
      : join(homedir(), '.android', 'debug.keystore');
  console.error(
    '\n   SHA-1 del keystore debug (regístralo en Firebase → app Android com.gastos.mobile):\n' +
      `   keytool -list -v -keystore "${keystore}" -alias androiddebugkey -storepass android -keypass android\n`,
  );
}

/** Google Sign-In nativo exige google-services.json (no va al repo). */
function ensureGoogleServicesJson() {
  const b64 = process.env.GOOGLE_SERVICES_JSON_BASE64?.trim();
  if (b64 && !existsSync(googleServicesPath)) {
    writeFileSync(googleServicesPath, Buffer.from(b64, 'base64'));
    console.log('   google-services.json escrito desde GOOGLE_SERVICES_JSON_BASE64');
  }
  if (existsSync(googleServicesPath)) {
    return;
  }
  console.error(
    '❌ Falta android/app/google-services.json — sin esto Firebase no inicia en Android,\n' +
      '   el plugin FirebaseAuthentication no carga y verás "plugin is not implemented on android".\n' +
      '   1. Firebase Console → proyecto gastos-2b187 → añade app Android com.gastos.mobile\n' +
      '   2. Registra el SHA-1 del keystore con el que firmas (debug abajo; release el de tu upload key)\n' +
      '   3. Descarga google-services.json → android/app/google-services.json\n' +
      '   4. Vuelve a ejecutar pnpm run mobile:publish-apk (Coolify/PR #188 solo despliega web + APK ya commiteada)\n' +
      '   (CI: export GOOGLE_SERVICES_JSON_BASE64="<json en base64>")\n',
  );
  printDebugSha1Hint();
  if (process.env.ALLOW_APK_WITHOUT_GOOGLE_SERVICES === '1') {
    console.warn(
      '⚠️  ALLOW_APK_WITHOUT_GOOGLE_SERVICES=1 — continuando sin Google nativo (solo email/contraseña).',
    );
    return;
  }
  process.exit(1);
}

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
  // Windows: pnpm/gradlew need shell or .cmd resolution
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

console.log('🔑 API key producción…');
assertProductionApiKey();
ensureGoogleServicesJson();
run('node', ['scripts/write-api-key.mjs']);

/** La APK en public/ no debe embeberse en dist ni en la siguiente APK (inflaba ~120 MB). */
function stashPublicApkForBuild() {
  if (!existsSync(apkDest)) {
    return null;
  }
  const stash = join(root, 'public/.gastos-mobile.apk.build-stash');
  copyFileSync(apkDest, stash);
  return stash;
}

function restorePublicApkAfterBuild(stashPath) {
  if (!stashPath || !existsSync(stashPath)) {
    return;
  }
  copyFileSync(stashPath, apkDest);
}

console.log('📦 Build Angular (production)…');
const apkStash = stashPublicApkForBuild();
run('pnpm', ['run', 'build', '--configuration=production']);
restorePublicApkAfterBuild(apkStash);

console.log('📱 Cap sync android…');
run('pnpm', ['exec', 'cap', 'sync', 'android']);

/** Gradle/AGP 8.14: JDK 17–21 para el daemon; JDK 25 rompe el build. Compilación → toolchain 21 en build.gradle. */
function javaBin(dir) {
  const name = process.platform === 'win32' ? 'java.exe' : 'java';
  return join(dir, 'bin', name);
}

function javaMajor(dir) {
  const probe = spawnSync(javaBin(dir), ['-version'], {
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
    'C:\\Program Files\\Microsoft\\jdk-21.0.13.21-hotspot',
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    process.env.JAVA_HOME,
  ].filter(Boolean);
  for (const dir of candidates) {
    if (!existsSync(javaBin(dir))) {
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
  const gradlew =
    process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const r = spawnSync(gradlew, ['assembleDebug'], {
    cwd: join(root, 'android'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
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
