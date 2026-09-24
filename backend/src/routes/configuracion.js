const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { internalError } = require('../utils/httpErrors');
const { str } = require('../utils/validate');


const CLAVES_PRIVADAS = ['jwt_secret', 'db_password', 'api_key', 'webhook_secret'];


const CLAVES_PERMITIDAS = new Set([
  // Flota
  'total_vehiculos', 'formato_placa', 'tipos_vehiculo',
  // Mantenimiento
  'intervalo_mant_km', 'intervalo_mant_dias', 'alerta_combustible',
  // Seguridad / GPS
  'monitoreo_gps', 'alertas_vencimiento',
  // Negocio
  'nombre_negocio', 'direccion', 'logo_url', 'telefono', 'email_contacto',
  'ruc', 'moneda'
]);

function esUrlSegura(v) {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
}

router.get('/', auth(), async (req, res) => {
  res.setHeader('Cache-Control', 'private, max-age=60');
  try {
    const [rows] = await db.query('SELECT clave, valor FROM configuracion');
    const config = {};
    rows.forEach(r => {

      if (!CLAVES_PRIVADAS.includes(r.clave.toLowerCase())) {
        config[r.clave] = r.valor;
      }
    });
    res.json(config);
  } catch (err) {
    internalError(res, err, 'configuracion');
  }
});


router.put('/', auth(['admin']), async (req, res) => {
  const entries = Object.entries(req.body);
  if (!entries.length) return res.status(400).json({ error: 'No hay datos para actualizar' });


  const entradaValida = entries.filter(([clave, valor]) => {
    if (!CLAVES_PERMITIDAS.has(clave)) return false;
    if (typeof clave !== 'string' || clave.length > 100) return false;
    if (typeof valor !== 'string' && typeof valor !== 'number') return false;
    if (typeof valor === 'string' && valor.length > 500) return false;
    if (clave === 'logo_url' && typeof valor === 'string' && valor && !esUrlSegura(valor)) return false;
    if (clave === 'logo_url' && typeof valor === 'string' && /^\s*javascript:/i.test(valor)) return false;
    if (clave === 'logo_url' && typeof valor === 'string' && /^\s*data:/i.test(valor) && !/^data:image\//i.test(valor)) return false;
    return true;
  });

  if (!entradaValida.length) return res.status(400).json({ error: 'Ningún dato válido para actualizar' });

  try {
    for (const [clave, valor] of entradaValida) {
      await db.query(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor=?',
        [clave, String(valor), String(valor)]
      );
    }
    res.json({ message: 'Configuración actualizada' });
  } catch (err) {
    internalError(res, err, 'configuracion');
  }
});

module.exports = router;