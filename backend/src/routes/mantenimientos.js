const { Router } = require('express');
const router = Router();
const { autenticar, autorizar } = require('../middlewares/auth');
const { mantenimientoValidator } = require('../middlewares/validators');
const { limiterCreacion } = require('../middlewares/security');
const { registrarAccion } = require('../middlewares/audit');
const { listar, crear, obtener, actualizar, eliminar, proximos } = require('../controllers/mantenimientosController');

router.use(autenticar);

router.get('/', listar);
router.post('/', autorizar('Administrador', 'Empleado'), limiterCreacion, mantenimientoValidator, registrarAccion('mantenimientos', 'crear'), crear);
router.get('/proximos', proximos);
router.get('/:id', obtener);
router.put('/:id', autorizar('Administrador'), mantenimientoValidator, registrarAccion('mantenimientos', 'actualizar'), actualizar);
router.delete('/:id', autorizar('Administrador'), registrarAccion('mantenimientos', 'eliminar'), eliminar);

module.exports = router;
