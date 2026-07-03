const { Router } = require('express');
const router = Router();
const { autenticar, autorizar } = require('../middlewares/auth');
const { usuarioValidator } = require('../middlewares/validators');
const { limiterCreacion } = require('../middlewares/security');
const { registrarAccion } = require('../middlewares/audit');
const {
  tiposVehiculo, tiposMantenimiento, roles,
  listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario
} = require('../controllers/catalogosController');

router.use(autenticar);

router.get('/tipos-vehiculo', tiposVehiculo);
router.get('/tipos-mantenimiento', tiposMantenimiento);
router.get('/roles', autorizar('Administrador'), roles);

router.get('/usuarios', autorizar('Administrador'), listarUsuarios);
router.post('/usuarios', autorizar('Administrador'), limiterCreacion, usuarioValidator, registrarAccion('usuarios', 'crear'), crearUsuario);
router.put('/usuarios/:id', autorizar('Administrador'), registrarAccion('usuarios', 'actualizar'), actualizarUsuario);
router.delete('/usuarios/:id', autorizar('Administrador'), registrarAccion('usuarios', 'eliminar'), eliminarUsuario);

module.exports = router;
