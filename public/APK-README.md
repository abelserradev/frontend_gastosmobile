# APK en `public/`

`gastos-mobile.apk` se copia aquí con `pnpm run mobile:publish-apk` y viaja al contenedor nginx en cada deploy de Coolify.

**Antes de publicar la APK** exporta la misma clave que el backend (`SECRET_API_KEY`):

```bash
export GASTOS_API_KEY="<valor de SECRET_API_KEY en Coolify backend>"
pnpm run mobile:publish-apk
```

Sin eso el bundle lleva un placeholder y en el móvil falla el login (`X-API-KEY inválida`). El deploy web en Docker sí inyecta `GASTOS_API_KEY` en build, pero **la APK no se regenera sola**: hay que volver a ejecutar el script con la clave y commit del `.apk`.

### Google Sign-In en la APK

El archivo `android/app/google-services.json` **no está en git**. Sin él Gradle no aplica el plugin de Firebase, **FirebaseApp no inicia** y Capacitor muestra *FirebaseAuthentication plugin is not implemented on android*.

**Coolify (p. ej. PR #188)** solo construye la imagen **web** (nginx + `dist/web`). La APK en `public/gastos-mobile.apk` **no se recompila** en ese deploy; hay que generarla en local/CI con `mobile:publish-apk` y commitear el `.apk` si quieres servirla desde producción.

1. Firebase → proyecto **gastos-2b187** → app Android `com.gastos.mobile`.
2. Añade el **SHA-1** del keystore debug (Windows):

   ```powershell
   keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
   ```

3. Descarga `google-services.json` y colócalo en `android/app/`.
4. Vuelve a `pnpm run mobile:publish-apk`.

Si Google muestra **`[16] account reauth failed`**: añade también el SHA-1 del keystore con el que firmas la APK (debug abajo) y vuelve a descargar el JSON. La app usa `useCredentialManager: false` (selector clásico de Google).

En CI puedes usar `GOOGLE_SERVICES_JSON_BASE64`. Para probar solo email/contraseña sin Google: `ALLOW_APK_WITHOUT_GOOGLE_SERVICES=1`.

**No hace falta subir el APK manualmente al servidor.** Solo commit + redeploy del frontend.

URL en producción: `https://mobilegastos.buildforge.work/gastos-mobile.apk`

La página `/app-android` (solo usuarios logueados) enlaza a esa URL como respaldo si no llega el correo de Firebase.
