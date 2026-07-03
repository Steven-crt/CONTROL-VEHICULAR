const { Router } = require('express');
const router = Router();
const { login, refresh, me, logout, cambiarPassword } = require('../controllers/authController');
const { autenticar } = require('../middlewares/auth');
const { loginValidator } = require('../middlewares/validators');
const { limiterPassword } = require('../middlewares/security');

router.post('/login', loginValidator, login);
router.post('/refresh', refresh);
router.get('/me', autenticar, me);
router.post('/logout', autenticar, logout);
router.put('/cambiar-password', autenticar, limiterPassword, cambiarPassword);

module.exports = router;
