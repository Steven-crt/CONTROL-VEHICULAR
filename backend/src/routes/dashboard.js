const { Router } = require("express");
const router = Router();
const { autenticar } = require("../middlewares/auth");
const { limiterPorUsuario } = require("../middlewares/security");
const {
  kpis,
  combustibleMensual,
  actividadReciente,
  proximosMantenimientos,
  vehiculosEstado,
  gastoMantenimiento,
} = require("../controllers/dashboardController");

router.use(autenticar);
router.use(limiterPorUsuario(60));

router.get("/kpis", kpis);
router.get("/combustible-mensual", combustibleMensual);
router.get("/actividad-reciente", actividadReciente);
router.get("/proximos-mantenimientos", proximosMantenimientos);
router.get("/vehiculos-estado", vehiculosEstado);
router.get("/gasto-mantenimiento", gastoMantenimiento);

module.exports = router;
