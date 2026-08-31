const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const auth = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MIME_A_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};
const EXTENSIONES_VALIDAS = Object.values(MIME_A_EXT);

// Detecta el formato real por magic bytes, sin confiar en mimetype declarado
function detectarTipo(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png';
  if (buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return '.webp';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif';
  return null;
}

function baseUrlSegura(req) {
  const envBase = (process.env.PUBLIC_URL || (process.env.CORS_ORIGIN || '').split(',')[0] || '').replace(/\/$/, '');
  if (envBase) {
    try {
      const u = new URL(envBase);
      if (!['https:', 'http:'].includes(u.protocol)) return `${req.protocol}://${req.get('host')}`;
      return envBase;
    } catch { /* fallback */ }
  }
  return `${req.protocol}://${req.get('host')}`;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Nombre aleatorio criptográfico; extensión se corregirá tras validar magic bytes
    const rnd = crypto.randomBytes(8).toString('hex');
    const ext = MIME_A_EXT[file.mimetype] || '.png';
    cb(null, 'logo-' + Date.now().toString(36) + '-' + rnd + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeValido = file.mimetype in MIME_A_EXT;
    if (!mimeValido || !EXTENSIONES_VALIDAS.includes(ext)) {
      return cb(new Error('Formato no admitido. Usa JPG, PNG, WebP o GIF.'));
    }
    cb(null, true);
  }
});

async function procesarUpload(req, res, mensaje) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  try {
    const buf = await fs.promises.readFile(req.file.path);
    const tipoReal = detectarTipo(buf);
    if (!tipoReal) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'El archivo no es una imagen válida.' });
    }
    const extActual = path.extname(req.file.filename);
    if (extActual !== tipoReal) {
      const nuevaRuta = req.file.path.slice(0, -extActual.length) + tipoReal;
      try {
        await fs.promises.rename(req.file.path, nuevaRuta);
      } catch (e) {
        if (e.code === 'EXDEV') {
          await fs.promises.copyFile(req.file.path, nuevaRuta);
          await fs.promises.unlink(req.file.path).catch(() => {});
        } else throw e;
      }
      req.file.filename = path.basename(nuevaRuta);
    }
    const imageUrl = baseUrlSegura(req) + '/uploads/' + req.file.filename;
    res.json({ message: mensaje, url: imageUrl });
  } catch (err) {
    console.error('[upload]', err);
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/upload/logo — solo admin
router.post('/logo', auth(['admin']), upload.single('logo'), (req, res) => procesarUpload(req, res, 'Logo subido exitosamente'));

// POST /api/upload/anomalia — cualquier usuario autenticado
router.post('/anomalia', auth(), upload.single('foto'), (req, res) => procesarUpload(req, res, 'Foto subida exitosamente'));

// Manejar errores de multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo supera el máximo de 5 MB.'
      : err.code === 'LIMIT_FILE_COUNT'
        ? 'Solo se permite un archivo.'
        : 'Error al subir el archivo.';
    return res.status(400).json({ error: msg });
  }
  if (err && err.message === 'Formato no admitido. Usa JPG, PNG, WebP o GIF.') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
