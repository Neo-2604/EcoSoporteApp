// Configuración dinámica: toma el archivo de Firebase (notificaciones push) si existe.
// En EAS se entrega como variable de archivo GOOGLE_SERVICES_JSON (no hace falta subirlo a GitHub);
// en tu PC puedes dejar google-services.json en la raíz del proyecto.
const fs = require('fs');

module.exports = ({ config }) => {
  const file = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);
  return {
    ...config,
    android: { ...config.android, ...(file ? { googleServicesFile: file } : {}) },
  };
};
