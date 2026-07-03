const { Router } = require('express');
const router = Router();
const { autenticar, autorizar } = require('../middlewares/auth');
const { registrarAccion } = require('../middlewares/audit');
const { misVehiculos, listar, crear, eliminar } = require('../controllers/asignacionesController');

router.use(autenticar);

router.get('/mis-vehiculos', misVehiculos);
router.get('/', autorizar('Administrador'), listar);
router.post('/', autorizar('Administrador'), registrarAccion('asignaciones', 'crear'), crear);
router.delete('/:id', autorizar('Administrador'), registrarAccion('asignaciones', 'eliminar'), eliminar);

module.exports = router;
