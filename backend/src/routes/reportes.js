const { Router } = require("express");
const router = Router();
const { autenticar } = require("../middlewares/auth");
const {
  combustible,
  mantenimiento,
  kilometraje,
} = require("../controllers/reportesController");

router.use(autenticar);
const { limiterPorUsuario } = require("../middlewares/security");
router.use(limiterPorUsuario(60));

router.get("/combustible", combustible);
router.get("/mantenimiento", mantenimiento);
router.get("/kilometraje", kilometraje);

module.exports = router;
