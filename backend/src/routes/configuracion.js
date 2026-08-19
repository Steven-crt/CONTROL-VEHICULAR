const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { internalError } = require('../utils/httpErrors');
const { str } = require('../utils/validate');

// Claves que NUNCA deben exponerse al cliente aunque estén en la tabla
const CLAVES_PRIVADAS = ['jwt_secret', 'db_password', 'api_key', 'webhook_secret'];

// Claves permitidas al escribir (evita crear claves arbitrarias que el cliente
// podría usar para sobreescribir configuración de otros módulos).
// Incluye TODAS las claves que usa el frontend (pages/Configuracion.jsx).
const CLAVES_PERMITIDAS = new Set([
  // Flota
  'total_vehiculos', 'formato_placa', 'tipos_vehiculo',
  // Mantenimiento
  'intervalo_mant_km', 'intervalo_mant_dias', 'alerta_combustible',
  // Seguridad / GPS
  'monitoreo_gps', 'alertas_vencimiento',
  // Negocio
  'nombre_negocio', 'direccion', 'logo_url', 'telefono', 'email_contacto'
]);

// GET /api/configuracion — requiere autenticación válida.
// Cacheable 60s en el navegador: la configuración cambia poco y este endpoint
// se llama al cargar cada página (private = no cacheable por proxies compartidos).
router.get('/', auth(), async (req, res) => {
  res.setHeader('Cache-Control', 'private, max-age=60');
  try {
    const [rows] = await db.query('SELECT clave, valor FROM configuracion');
    const config = {};
    rows.forEach(r => {
      // Filtrar claves sensibles que no deben llegar al frontend
      if (!CLAVES_PRIVADAS.includes(r.clave.toLowerCase())) {
        config[r.clave] = r.valor;
      }
    });
    res.json(config);
  } catch (err) {
    internalError(res, err, 'configuracion');
  }
});

// PUT /api/configuracion — solo admin
router.put('/', auth(['admin']), async (req, res) => {
  const entries = Object.entries(req.body);
  if (!entries.length) return res.status(400).json({ error: 'No hay datos para actualizar' });

  // Sanitizar: solo claves permitidas, valores string/number, límite de longitud
  const entradaValida = entries.filter(([clave, valor]) => {
    if (!CLAVES_PERMITIDAS.has(clave)) return false;
    if (typeof clave !== 'string' || clave.length > 100) return false;
    if (typeof valor !== 'string' && typeof valor !== 'number') return false;
    if (typeof valor === 'string' && valor.length > 255) return false;
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
