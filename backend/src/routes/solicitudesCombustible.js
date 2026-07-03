const { Router } = require('express');
const router = Router();
const { autenticar, autorizar } = require('../middlewares/auth');
const { solicitudCombustibleValidator, cambiarEstadoValidator } = require('../middlewares/validators');
const { limiterCreacion, limiterPorUsuario } = require('../middlewares/security');
const { registrarAccion } = require('../middlewares/audit');
const { listar, crear, obtener, cambiarEstado, reportes } = require('../controllers/solicitudesCombustibleController');

router.use(autenticar);

router.get('/', limiterPorUsuario(100), listar);
router.post('/', limiterCreacion, solicitudCombustibleValidator, registrarAccion('solicitudes_combustible', 'crear'), crear);
router.get('/reportes', limiterPorUsuario(50), reportes);
router.get('/:id', limiterPorUsuario(100), obtener);
router.patch('/:id/estado', autorizar('Administrador'), cambiarEstadoValidator, registrarAccion('solicitudes_combustible', 'cambiar_estado'), cambiarEstado);

module.exports = router;
