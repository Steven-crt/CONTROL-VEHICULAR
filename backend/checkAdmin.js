require("dotenv").config();
const { sequelize, Usuario, Rol } = require("./src/models");

async function checkAdmin() {
  try {
    await sequelize.authenticate();
    console.log("✓ Conexión a DB exitosa");

    const admin = await Usuario.findOne({
      where: { email: process.env.EMAIL_ADDRESS },
      include: [{ model: Rol, as: "rol" }],
    });

    if (admin) {
      console.log("✓ Usuario admin encontrado:");
      console.log("  ID:", admin.id);
      console.log("  Email:", admin.email);
      console.log("  Activo:", admin.activo);
      console.log("  Rol:", admin.rol?.nombre);
    } else {
      console.log("✗ Usuario admin NO ENCONTRADO en la base de datos");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkAdmin();
