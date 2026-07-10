const { Router } = require("express");
const router = Router();
const { autenticar, autorizar } = require("../middlewares/auth");
const { vehiculoValidator } = require("../middlewares/validators");
const { limiterCreacion } = require("../middlewares/security");
const { registrarAccion } = require("../middlewares/audit");
const {
  listar,
  crear,
  obtener,
  actualizar,
  eliminar,
  historialCombustible,
  mantenimientos,
} = require("../controllers/vehiculosController");

router.use(autenticar);

router.get("/", listar);
router.post(
  "/",
  autorizar("Administrador", "Empleado"),
  limiterCreacion,
  vehiculoValidator,
  registrarAccion("vehiculos", "crear"),
  crear,
);
router.get("/:id", obtener);
router.put(
  "/:id",
  autorizar("Administrador"),
  vehiculoValidator,
  registrarAccion("vehiculos", "actualizar"),
  actualizar,
);
router.patch(
  "/:id/estado",
  autorizar("Administrador"),
  registrarAccion("vehiculos", "cambiar_estado"),
  eliminar,
);
router.delete(
  "/:id",
  autorizar("Administrador"),
  registrarAccion("vehiculos", "eliminar"),
  eliminar,
);
router.get("/:id/historial-combustible", historialCombustible);
router.get("/:id/mantenimientos", mantenimientos);

module.exports = router;
