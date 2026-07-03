const { Router } = require('express');
const router = Router();
const { autenticar } = require('../middlewares/auth');
const { listar, marcarLeida, marcarTodasLeidas, eliminar } = require('../controllers/notificacionesController');

router.use(autenticar);

router.get('/', listar);
router.patch('/:id/leida', marcarLeida);
router.patch('/leer-todas', marcarTodasLeidas);
router.delete('/:id', eliminar);

module.exports = router;
