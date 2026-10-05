# APK en `public/`

`gastos-mobile.apk` se copia aquí con `pnpm run mobile:publish-apk` y viaja al contenedor nginx en cada deploy de Coolify.

**Antes de publicar la APK** exportá la misma clave que el backend (`SECRET_API_KEY`):

```bash
export GASTOS_API_KEY="<valor de SECRET_API_KEY en Coolify backend>"
pnpm run mobile:publish-apk
```

Sin eso el bundle lleva un placeholder y en el móvil falla el login (`X-API-KEY inválida`). El deploy web en Docker sí inyecta `GASTOS_API_KEY` en build, pero **la APK no se regenera sola**: hay que volver a ejecutar el script con la clave y commit del `.apk`.

**No hace falta subir el APK manualmente al servidor.** Solo commit + redeploy del frontend.

URL en producción: `https://mobilegastos.buildforge.work/gastos-mobile.apk`

La página `/app-android` (solo usuarios logueados) enlaza a esa URL como respaldo si no llega el correo de Firebase.
