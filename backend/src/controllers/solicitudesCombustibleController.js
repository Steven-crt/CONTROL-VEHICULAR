const { Op } = require("sequelize");
const {
  SolicitudCombustible,
  Vehiculo,
  Usuario,
  Asignacion,
} = require("../models");
const {
  crearNotificacion,
  notificarAdmins,
} = require("../services/notificacionService");

exports.listar = async (req, res) => {
  try {
    const { estado, vehiculo_id, desde, hasta } = req.query;
    const where = {};

    if (req.usuario.rol !== "Administrador") {
      where.solicitante_id = req.usuario.id;
    }

    if (estado) where.estado = estado;
    if (vehiculo_id) where.vehiculo_id = vehiculo_id;
    if (desde && hasta) {
      where.fecha_solicitud = {
        [Op.between]: [new Date(desde), new Date(hasta)],
      };
    }

    const solicitudes = await SolicitudCombustible.findAll({
      where,
      include: [
        { association: "vehiculo", attributes: ["placa", "marca", "modelo"] },
        { association: "solicitante", attributes: ["nombre", "apellido"] },
        { association: "atendido_por", attributes: ["nombre", "apellido"] },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json(solicitudes);
  } catch (error) {
    console.error("Error en listar solicitudes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

exports.crear = async (req, res) => {
  try {
    const { vehiculo_id, galones_solicitados, observaciones } = req.body;

    if (!vehiculo_id || !galones_solicitados) {
      return res
        .status(400)
        .json({ error: "Campos requeridos: vehiculo_id, galones_solicitados" });
    }

    if (req.usuario.rol === "Administrador") {
      return res.status(403).json({
        error:
          "El administrador no puede crear solicitudes, solo aprobarlas o rechazarlas",
      });
    }

    const asignado = await Asignacion.findOne({
      where: { usuario_id: req.usuario.id, vehiculo_id },
    });
    if (!asignado) {
      return res
        .status(403)
        .json({ error: "No tienes este vehiculo asignado" });
    }

    const vehiculo = await Vehiculo.findByPk(vehiculo_id);
    if (!vehiculo?.activo) {
      return res
        .status(400)
        .json({ error: "Vehiculo no encontrado o inactivo" });
    }

    const count = await SolicitudCombustible.count();
    const codigo = `SC-${String(count + 1).padStart(5, "0")}`;

    const solicitud = await SolicitudCombustible.create({
      codigo,
      vehiculo_id,
      solicitante_id: req.usuario.id,
      galones_solicitados,
      kilometraje_actual: vehiculo.kilometraje_actual,
      observaciones,
    });

    const result = await SolicitudCombustible.findByPk(solicitud.id, {
      include: [
        { association: "vehiculo", attributes: ["placa", "marca", "modelo"] },
        { association: "solicitante", attributes: ["nombre", "apellido"] },
      ],
    });

    await notificarAdmins(
      "Nueva solicitud de combustible",
      `${req.usuario.nombre} ${req.usuario.apellido} solicito ${galones_solicitados} galones para el vehiculo ${vehiculo.placa}`,
      "info",
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Error en crear solicitud:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

exports.obtener = async (req, res) => {
  try {
    const solicitud = await SolicitudCombustible.findByPk(req.params.id, {
      include: [
        {
          association: "vehiculo",
          attributes: ["placa", "marca", "modelo", "capacidad_combustible"],
        },
        {
          association: "solicitante",
          attributes: ["nombre", "apellido", "email"],
        },
        { association: "atendido_por", attributes: ["nombre", "apellido"] },
      ],
    });

    if (!solicitud) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    if (
      req.usuario.rol !== "Administrador" &&
      solicitud.solicitante_id !== req.usuario.id
    ) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para ver esta solicitud" });
    }

    res.json(solicitud);
  } catch (error) {
    console.error("Error en obtener solicitud:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    let {
      estado,
      galones_surtidos,
      costo_total,
      precio_por_galon,
      kilometraje_actual,
      observaciones,
    } = req.body;

    // Validar tipo y valor de estado
    if (
      typeof estado !== "string" ||
      !["Aprobada", "Surtida", "Rechazada"].includes(estado)
    ) {
      return res.status(400).json({
        error: "Estado invalido. Debe ser Aprobada, Surtida o Rechazada",
      });
    }

    // Validar tipo de observaciones si existe
    if (observaciones !== undefined && typeof observaciones !== "string") {
      return res
        .status(400)
        .json({ error: "Las observaciones deben ser texto" });
    }
    if (observaciones && observaciones.length > 500) {
      return res
        .status(400)
        .json({ error: "Las observaciones no pueden exceder 500 caracteres" });
    }

    // Validar y convertir tipos numericos cuando estado es Surtida
    if (estado === "Surtida") {
      if (
        galones_surtidos === undefined ||
        galones_surtidos === null ||
        galones_surtidos === ""
      ) {
        return res
          .status(400)
          .json({ error: "Debe indicar los galones surtidos" });
      }

      galones_surtidos = Number(galones_surtidos);
      if (
        Number.isNaN(galones_surtidos) ||
        galones_surtidos <= 0 ||
        galones_surtidos > 99999
      ) {
        return res.status(400).json({
          error:
            "Galones surtidos invalidos (debe ser un numero positivo, max 99999)",
        });
      }

      if (
        costo_total !== undefined &&
        costo_total !== null &&
        costo_total !== ""
      ) {
        costo_total = Number(costo_total);
        if (Number.isNaN(costo_total) || costo_total < 0) {
          return res.status(400).json({
            error: "Costo total invalido (debe ser un numero positivo)",
          });
        }
      }

      if (
        precio_por_galon !== undefined &&
        precio_por_galon !== null &&
        precio_por_galon !== ""
      ) {
        precio_por_galon = Number(precio_por_galon);
        if (Number.isNaN(precio_por_galon) || precio_por_galon < 0) {
          return res.status(400).json({
            error: "Precio por galon invalido (debe ser un numero positivo)",
          });
        }
      }

      if (
        kilometraje_actual !== undefined &&
        kilometraje_actual !== null &&
        kilometraje_actual !== ""
      ) {
        kilometraje_actual = Number(kilometraje_actual);
        if (Number.isNaN(kilometraje_actual) || kilometraje_actual < 0) {
          return res.status(400).json({
            error: "Kilometraje actual invalido (debe ser un numero positivo)",
          });
        }
      }
    }

    const solicitud = await SolicitudCombustible.findByPk(req.params.id, {
      include: [{ association: "vehiculo" }],
    });

    if (!solicitud) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    if (solicitud.estado === "Surtida" || solicitud.estado === "Rechazada") {
      return res
        .status(400)
        .json({ error: `La solicitud ya esta ${solicitud.estado}` });
    }

    const updateData = {
      estado,
      atendido_por_id: req.usuario.id,
      fecha_atencion: new Date(),
      observaciones: observaciones || solicitud.observaciones,
    };

    if (estado === "Surtida") {
      updateData.galones_surtidos = galones_surtidos;
      updateData.costo_total = costo_total;
      updateData.precio_por_galon = precio_por_galon;
      updateData.kilometraje_actual =
        kilometraje_actual || solicitud.kilometraje_actual;

      await Vehiculo.update(
        { kilometraje_actual: updateData.kilometraje_actual },
        { where: { id: solicitud.vehiculo_id } },
      );
    }

    await solicitud.update(updateData);

    const result = await SolicitudCombustible.findByPk(solicitud.id, {
      include: [
        { association: "vehiculo", attributes: ["placa", "marca", "modelo"] },
        { association: "solicitante", attributes: ["nombre", "apellido"] },
        { association: "atendido_por", attributes: ["nombre", "apellido"] },
      ],
    });

    const tipoNotif =
      estado === "Aprobada"
        ? "success"
        : estado === "Rechazada"
          ? "danger"
          : "info";
    await crearNotificacion(
      solicitud.solicitante_id,
      `Solicitud ${solicitud.codigo} - ${estado}`,
      `Tu solicitud de combustible para el vehiculo ${result.vehiculo?.placa} fue ${estado.toLowerCase()}`,
      tipoNotif,
    );

    res.json(result);
  } catch (error) {
    console.error("Error en cambiarEstado:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

exports.reportes = async (req, res) => {
  try {
    const { desde, hasta, vehiculo_id } = req.query;
    const where = { estado: "Surtida" };

    if (desde && hasta) {
      where.fecha_solicitud = {
        [Op.between]: [new Date(desde), new Date(hasta)],
      };
    }
    if (vehiculo_id) where.vehiculo_id = vehiculo_id;

    const sequelize = require("../config/database");
    const { fn, col } = sequelize;

    const totales = await SolicitudCombustible.findAll({
      attributes: [
        "vehiculo_id",
        [fn("COUNT", col("SolicitudCombustible.id")), "total_solicitudes"],
        [
          fn("COALESCE", fn("SUM", col("galones_surtidos")), 0),
          "total_galones",
        ],
        [fn("COALESCE", fn("SUM", col("costo_total")), 0), "total_costo"],
        [fn("AVG", col("precio_por_galon")), "precio_promedio"],
      ],
      where,
      include: [
        { association: "vehiculo", attributes: ["placa", "marca", "modelo"] },
      ],
      group: ["vehiculo_id"],
      order: [[fn("COALESCE", fn("SUM", col("galones_surtidos")), 0), "DESC"]],
    });

    res.json(totales);
  } catch (error) {
    console.error("Error en reportes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
