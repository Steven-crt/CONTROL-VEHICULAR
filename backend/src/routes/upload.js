const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Detecta el formato real por los primeros bytes, sin confiar en el mimetype declarado
function detectarTipo(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png';
  if (buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return '.webp';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif';
  return null;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = MIME_A_EXT[file.mimetype] || '.png';
    cb(null, 'logo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + ext);
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

// POST /api/upload/logo
router.post('/logo', auth(['admin']), upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    // El mimetype puede ser falsificado: validar el contenido real del archivo
    const buf = fs.readFileSync(req.file.path);
    const tipoReal = detectarTipo(buf);
    if (!tipoReal) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'El archivo no es una imagen válida.' });
    }

    // Renombrar a la extensión real para que express.static sirva el Content-Type correcto
    const extActual = path.extname(req.file.filename);
    if (extActual !== tipoReal) {
      const nuevaRuta = req.file.path.slice(0, -extActual.length) + tipoReal;
      fs.renameSync(req.file.path, nuevaRuta);
      req.file.filename = path.basename(nuevaRuta);
    }

    const rootUrl = req.protocol + '://' + req.get('host');
    const imageUrl = rootUrl + '/uploads/' + req.file.filename;

    res.json({
      message: 'Logo subido exitosamente',
      url: imageUrl
    });
  } catch (err) {
    console.error('[upload/logo]', err);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Manejar errores de multer (archivo muy grande, más de un archivo, formato)
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
