const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { registrarCliente, stats } = require('../realtime');

// GET /api/realtime/stream - Conexión SSE persistente.
// El cliente EventSource se conecta con la cookie de sesión (withCredentials).
// El servidor mantiene la conexión abierta y emitirá eventos de invalidación
// cada vez que algo cambie en el sistema.
router.get('/stream', auth(), (req, res) => {
  const cliente = registrarCliente(res, req.user);

  // El navegador cierra la conexión al cambiar de página / desloguearse.
  // Mantenemos la respuesta abierta indefinidamente (proxies la terminan solos
  // si el cliente desaparece).
  res.setTimeout(0);
});

// GET /api/realtime/stats - Info del hub (útil para debugging, admin)
router.get('/stats', auth(['admin']), (req, res) => {
  res.json(stats());
});

module.exports = router;
