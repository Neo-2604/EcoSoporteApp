# EcoSoporte Digital — App para técnicos

App móvil (Expo / React Native) para técnicos y administrador. Usa la misma API y base de datos que la web (repositorio EcoSoporte-Digital-Backend).

- La documentación del proyecto se entrega aparte (archivos Word), no se guarda en el repositorio.
- Desarrollo: `npm install` y `npx expo start`. La URL del backend se toma de `EXPO_PUBLIC_API_URL` (en `eas.json` ya apunta a Render).
- APK para técnicos: `eas build -p android --profile preview`; luego copia el enlace de descarga a la variable `APP_DOWNLOAD_URL` del servicio en Render.
- La app envía un «latido» cada minuto para aparecer en *Actividad en vivo* de la web.
