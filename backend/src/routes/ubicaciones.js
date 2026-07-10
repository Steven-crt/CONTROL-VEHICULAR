const { Router } = require("express");
const router = Router();
const { autenticar, autorizar } = require("../middlewares/auth");
const {
  reportar,
  actuales,
  misVehiculos,
  historial,
} = require("../controllers/ubicacionesController");

// Rutas privadas (requieren token)
router.use(autenticar);

// Empleado reporta su ubicación
router.post("/", reportar);

// Admin obtiene todas las ubicaciones actuales
router.get("/actuales", autorizar("Administrador"), actuales);

// Empleado obtiene sus vehículos asignados con ubicaciones
router.get("/mis-vehiculos", misVehiculos);

// Admin obtiene historial de un vehículo específico
router.get("/:vehiculoId/historial", historial);

module.exports = router;
