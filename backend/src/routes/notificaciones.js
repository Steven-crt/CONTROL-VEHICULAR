const { Router } = require('express');
const router = Router();
const { autenticar, autorizar } = require('../middlewares/auth');
const { listar, marcarLeida, marcarTodasLeidas, eliminar, solicitarVehiculo, solicitudesPendientes } = require('../controllers/notificacionesController');

router.use(autenticar);

router.get('/', listar);
router.post('/solicitar-vehiculo', solicitarVehiculo);
router.get('/solicitudes-pendientes', autorizar('Administrador'), solicitudesPendientes);
router.patch('/:id/leida', marcarLeida);
router.patch('/leer-todas', marcarTodasLeidas);
router.delete('/:id', eliminar);

module.exports = router;
