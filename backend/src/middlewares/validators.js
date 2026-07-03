const { body, validationResult } = require('express-validator');

const manejarErrores = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

const loginValidator = [
  body('email')
    .isEmail().withMessage('Email invalido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contrasena es requerida')
    .isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
  manejarErrores
];

const vehiculoValidator = [
  body('placa')
    .notEmpty().withMessage('La placa es requerida')
    .isLength({ max: 20 }).withMessage('La placa no puede exceder 20 caracteres')
    .matches(/^[a-zA-Z0-9\-]+$/).withMessage('La placa solo puede contener letras, numeros y guiones'),
  body('marca')
    .notEmpty().withMessage('La marca es requerida')
    .isLength({ max: 100 }).withMessage('La marca no puede exceder 100 caracteres'),
  body('modelo')
    .notEmpty().withMessage('El modelo es requerido')
    .isLength({ max: 100 }),
  body('ano')
    .notEmpty().withMessage('El año es requerido')
    .isInt({ min: 1980, max: 2030 }).withMessage('Año invalido'),
  body('tipo_vehiculo_id')
    .isInt().withMessage('Tipo de vehiculo invalido'),
  body('capacidad_combustible')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Capacidad de combustible invalida'),
  body('kilometraje_actual')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Kilometraje invalido'),
  manejarErrores
];

const solicitudCombustibleValidator = [
  body('vehiculo_id')
    .isInt().withMessage('Vehiculo invalido'),
  body('galones_solicitados')
    .notEmpty().withMessage('Los galones solicitados son requeridos')
    .isFloat({ min: 0.01, max: 9999 }).withMessage('Cantidad de galones invalida (0.01 - 9999)'),
  body('observaciones')
    .optional()
    .isLength({ max: 500 }).withMessage('Las observaciones no pueden exceder 500 caracteres'),
  manejarErrores
];

const usuarioValidator = [
  body('nombre')
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras'),
  body('apellido')
    .notEmpty().withMessage('El apellido es requerido')
    .isLength({ max: 100 }),
  body('email')
    .isEmail().withMessage('Email invalido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('La contrasena debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contrasena debe contener mayuscula, minuscula y numero'),
  body('rol_id')
    .isInt().withMessage('Rol invalido'),
  manejarErrores
];

const mantenimientoValidator = [
  body('vehiculo_id')
    .isInt().withMessage('Vehiculo invalido'),
  body('tipo_mantenimiento_id')
    .isInt().withMessage('Tipo de mantenimiento invalido'),
  body('costo')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Costo invalido'),
  body('kilometraje_programado')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Kilometraje invalido'),
  manejarErrores
];

const cambiarEstadoValidator = [
  body('estado')
    .notEmpty().withMessage('El estado es requerido')
    .isIn(['Aprobada', 'Surtida', 'Rechazada']).withMessage('Estado invalido. Debe ser Aprobada, Surtida o Rechazada'),
  body('galones_surtidos')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0.01, max: 99999 }).withMessage('Galones surtidos invalidos (min: 0.01, max: 99999)'),
  body('costo_total')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Costo total invalido'),
  body('precio_por_galon')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Precio por galon invalido'),
  body('kilometraje_actual')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Kilometraje actual invalido'),
  body('observaciones')
    .optional()
    .isLength({ max: 500 }).withMessage('Las observaciones no pueden exceder 500 caracteres'),
  manejarErrores
];

module.exports = {
  loginValidator,
  vehiculoValidator,
  solicitudCombustibleValidator,
  usuarioValidator,
  mantenimientoValidator,
  cambiarEstadoValidator
};
