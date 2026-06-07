# APK en `public/`

`gastos-mobile.apk` se copia aquí con `pnpm run mobile:publish-apk` y viaja al contenedor nginx en cada deploy de Coolify.

**No hace falta subir el APK manualmente al servidor.** Solo commit + redeploy del frontend.

URL en producción: `https://mobilegastos.buildforge.work/gastos-mobile.apk`

La página `/app-android` (solo usuarios logueados) enlaza a esa URL como respaldo si no llega el correo de Firebase.
