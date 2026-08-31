const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let ephemeral = null;

/**
 * Intenta persistir un JWT_SECRET generado automáticamente en el archivo .env
 * del backend para que sobreviva reinicios del servidor.
 */
function persistirSecret(secret) {
  try {
    const envPath = path.join(__dirname, '../../.env');
    let contenido = '';
    try {
      contenido = fs.readFileSync(envPath, 'utf8');
    } catch {
      // .env no existe — se creará
    }
    if (contenido.includes('JWT_SECRET=')) {
      // Ya existe una línea JWT_SECRET — NO sobrescribir.
      // Si llegamos aquí es porque dotenv no cargó el .env (ej. test externo).
      // Evitar sobrescribir un secreto válido que otro proceso está usando.
      console.log('ℹ️  JWT_SECRET ya existe en .env — no se sobrescribe.');
      return;
    }
    // Agregar al final
    const separador = contenido.endsWith('\n') ? '' : '\n';
    contenido += `${separador}JWT_SECRET=${secret}\n`;
    fs.writeFileSync(envPath, contenido, 'utf8');
    // También cargar en process.env para que esté disponible inmediatamente
    process.env.JWT_SECRET = secret;
    console.log('✅ JWT_SECRET generado y guardado en .env (persiste entre reinicios)');
  } catch (err) {
    console.error('⚠️  No se pudo guardar JWT_SECRET en .env:', err.message);
    console.warn('⚠️  Los tokens serán efímeros (se invalidan al reiniciar el servidor)');
  }
}

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s) {
    if (s.length < 32) {
      const msg = 'JWT_SECRET es demasiado corto (<32 chars). Usa un valor generado con crypto.randomBytes.';
      if (process.env.NODE_ENV === 'production') throw new Error(msg);
      console.warn('⚠️  ' + msg);
    }
    return s;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET no está configurado. Añádelo en Render > Environment ' +
      '(genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))")'
    );
  }
  // Modo desarrollo: generar un secreto y persistirlo en .env para que
  // sobreviva reinicios del servidor. Así los tokens JWT no se invalidan
  // cada vez que se reinicia el backend.
  if (!ephemeral) {
    ephemeral = crypto.randomBytes(32).toString('hex');
    persistirSecret(ephemeral);
  }
  
  return ephemeral;
}

module.exports = { getJwtSecret };
