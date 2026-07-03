const { Router } = require('express');
const router = Router();
const { autenticar } = require('../middlewares/auth');
const { combustible, mantenimiento, kilometraje } = require('../controllers/reportesController');

router.use(autenticar);

router.get('/combustible', combustible);
router.get('/mantenimiento', mantenimiento);
router.get('/kilometraje', kilometraje);

module.exports = router;
