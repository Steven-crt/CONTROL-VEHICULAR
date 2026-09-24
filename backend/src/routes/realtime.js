const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { registrarCliente, stats } = require('../realtime');


router.get('/stream', auth(), (req, res) => {
  const cliente = registrarCliente(res, req.user);
  if (!cliente) return; // límite alcanzado: registrarCliente ya respondió el error

  res.setTimeout(0);
});

// GET /api/realtime/stats - Info del hub (útil para debugging, admin)
router.get('/stats', auth(['admin']), (req, res) => {
  res.json(stats());
});

module.exports = router;
