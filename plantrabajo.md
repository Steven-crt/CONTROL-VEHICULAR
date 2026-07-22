# Sistema de Gestión de Parqueo 🚗

Aquí te presento las funcionalidades completas del sistema:

---

## 🏗️ Arquitectura del Sistema

**Frontend:** React + Vite + Tailwind CSS
**Backend:** Node.js + Express
**Base de Datos:** MySQL
**Autenticación:** JWT + bcrypt

---

## 📦 Módulos y Funcionalidades

### 1. 🔐 Autenticación y Usuarios
- Login / Logout con JWT
- Roles: **Administrador**, **Operador**, **Cajero**
- Gestión de usuarios (CRUD)
- Cambio de contraseña y perfil

---

### 2. 🚘 Control de Entrada y Salida
- Registro de entrada de vehículo (placa, tipo, hora)
- Escaneo o ingreso manual de placa
- Asignación automática de espacio disponible
- Registro de salida con cálculo automático del tiempo
- Impresión de ticket de entrada/salida

---

### 3. 🗺️ Mapa de Espacios (Vista en Tiempo Real)
- Vista gráfica del parqueo con espacios libres/ocupados
- Filtro por tipo de espacio (moto, auto, discapacitados, VIP)
- Indicador de disponibilidad en tiempo real

---

### 4. 💰 Tarifas y Cobros
- Configuración de tarifas por hora, fracción o tarifa plana
- Tarifas diferenciadas por tipo de vehículo
- Tarifas especiales (mensuales, abonados)
- Cálculo automático del monto a cobrar
- Aplicación de descuentos y validaciones

---

### 5. 🧾 Facturación y Pagos
- Registro del cobro (efectivo, tarjeta, QR)
- Generación de comprobante/recibo
- Historial de pagos por turno
- Cierre de caja por operador

---

### 6. 👥 Clientes Frecuentes / Abonados
- Registro de clientes con membresía mensual
- Control de acceso por placa registrada
- Vencimiento y renovación de membresía
- Historial de visitas del cliente

---

### 7. 📊 Reportes y Estadísticas
- Ingresos por día, semana, mes
- Vehículos atendidos por período
- Ocupación promedio del parqueo
- Reporte de turnos por operador
- Exportación a PDF y Excel

---

### 8. ⚙️ Configuración General
- Datos del negocio (nombre, logo, RUC)
- Número de pisos y espacios por zona
- Configuración de turnos
- Parámetros de tiempo de gracia
- Backup y restauración de datos

---

## 🗄️ Entidades principales en MySQL

| Tabla | Descripción |
|---|---|
| `usuarios` | Operadores y administradores |
| `vehiculos` | Registro de placas y tipos |
| `espacios` | Mapa de lugares del parqueo |
| `tickets` | Entradas y salidas activas |
| `pagos` | Historial de cobros |
| `tarifas` | Configuración de precios |
| `clientes` | Abonados y frecuentes |
| `reportes` | Cierres y resúmenes de caja |

---

¿Quieres que proceda a **generar el código completo** del sistema con esta estructura, o deseas ajustar/agregar alguna funcionalidad antes de comenzar?