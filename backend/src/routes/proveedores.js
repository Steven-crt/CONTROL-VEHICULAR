const { Router } = require('express');
const router = Router();
const { autenticar, autorizar } = require('../middlewares/auth');
const { registrarAccion } = require('../middlewares/audit');
const { listar, crear, obtener, actualizar, eliminar } = require('../controllers/proveedoresController');

router.use(autenticar);

router.get('/', autorizar('Administrador'), listar);
router.post('/', autorizar('Administrador'), registrarAccion('proveedores', 'crear'), crear);
router.get('/:id', autorizar('Administrador'), obtener);
router.put('/:id', autorizar('Administrador'), registrarAccion('proveedores', 'actualizar'), actualizar);
router.delete('/:id', autorizar('Administrador'), registrarAccion('proveedores', 'eliminar'), eliminar);

module.exports = router;
