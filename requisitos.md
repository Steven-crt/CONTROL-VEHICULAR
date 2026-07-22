# Requisitos del Sistema ParkSmart Pro

---

## REQUISITOS FUNCIONALES

### RF-01: Autenticación y Gestión de Usuarios
- **RF-01.1:** El sistema permitirá iniciar sesión con usuario y contraseña.
- **RF-01.2:** Las contraseñas se almacenarán encriptadas con bcrypt.
- **RF-01.3:** Se usarán JWT para mantener la sesión autenticada.
- **RF-01.4:** El sistema manejará tres roles: Administrador, Operador y Cajero.
- **RF-01.5:** Solo el Administrador podrá crear, editar y desactivar usuarios.
- **RF-01.6:** El usuario podrá cambiar su contraseña desde su perfil.
- **RF-01.7:** El sistema cerrará la sesión automáticamente tras inactividad prolongada.

### RF-02: Control de Entrada y Salida de Vehículos
- **RF-02.1:** El sistema registrará la entrada de un vehículo ingresando su placa.
- **RF-02.2:** Se asignará automáticamente un espacio disponible según el tipo de vehículo.
- **RF-02.3:** Se generará un ticket con código único, placa, tipo de vehículo, espacio asignado y hora de entrada.
- **RF-02.4:** El sistema registrará la salida y calculará automáticamente el tiempo transcurrido.
- **RF-02.5:** Se calculará el monto a cobrar según la tarifa aplicable.
- **RF-02.6:** Se aplicará el tiempo de gracia configurado antes de iniciar el cobro.
- **RF-02.7:** El sistema permitirá registrar observaciones en cada ticket.
- **RF-02.8:** El espacio se marcará como "libre" automáticamente al registrar la salida.

### RF-03: Mapa de Espacios en Tiempo Real
- **RF-03.1:** El sistema mostrará una vista gráfica de todos los espacios del parqueo.
- **RF-03.2:** Cada espacio indicará su estado: libre, ocupado o en mantenimiento.
- **RF-03.3:** Se podrán filtrar espacios por tipo: auto, moto, discapacitado, VIP.
- **RF-03.4:** El mapa se actualizará en tiempo real al registrar entradas/salidas.
- **RF-03.5:** Se mostrará la disponibilidad total por tipo de espacio.
- **RF-03.6:** Se mostrarán los espacios agrupados por zona y piso.

### RF-04: Gestión de Tarifas
- **RF-04.1:** El sistema permitirá configurar tarifas por hora, por fracción, por día y mensual.
- **RF-04.2:** Las tarifas serán diferenciadas por tipo de vehículo.
- **RF-04.3:** Se podrá configurar un tiempo de gracia por tipo de vehículo/modalidad.
- **RF-04.4:** El sistema calculará automáticamente el monto a cobrar al momento de la salida.
- **RF-04.5:** Los clientes abonados con membresía activa no serán cobrados por uso diario.
- **RF-04.6:** El Administrador podrá habilitar/deshabilitar tarifas.

### RF-05: Gestión de Clientes Abonados
- **RF-05.1:** El sistema permitirá registrar clientes con sus datos personales (nombre, cédula, teléfono, email).
- **RF-05.2:** Se asociará una o más placas a cada cliente.
- **RF-05.3:** Se gestionarán membresías mensuales o anuales con fecha de vencimiento.
- **RF-05.4:** El sistema alertará vencimientos de membresía próximos.
- **RF-05.5:** Se consultará el historial de visitas del cliente.
- **RF-05.6:** El acceso de abonados será rápido por placa registrada.

### RF-06: Módulo de Caja y Facturación
- **RF-06.1:** El sistema registrará cobros en efectivo, tarjeta, QR y transferencia.
- **RF-06.2:** Se calculará automáticamente el cambio al pagar en efectivo.
- **RF-06.3:** Se generará un comprobante/recibo de pago.
- **RF-06.4:** El Cajero/Operador realizará apertura y cierre de caja.
- **RF-06.5:** El cierre de caja mostrará el desglose por método de pago (efectivo, tarjeta, QR).
- **RF-06.6:** El cierre de caja mostrará el total de vehículos atendidos en el turno.
- **RF-06.7:** Se almacenará un histórico de todos los cierres de caja.

### RF-07: Reportes y Estadísticas
- **RF-07.1:** El sistema generará reportes de ingresos por día, semana y mes.
- **RF-07.2:** Se mostrará la cantidad de vehículos atendidos por período.
- **RF-07.3:** Se calculará el porcentaje de ocupación promedio del parqueo.
- **RF-07.4:** Se generará reporte de turnos por operador/cajero.
- **RF-07.5:** Los reportes se podrán exportar a PDF.
- **RF-07.6:** Los reportes se podrán exportar a Excel.
- **RF-07.7:** El Dashboard mostrará gráficas de tendencias de ingresos y ocupación.

### RF-08: Configuración General del Sistema
- **RF-08.1:** El Administrador podrá configurar los datos del negocio (nombre, RUC, dirección, teléfono, email).
- **RF-08.2:** Se podrá subir y cambiar el logo del parqueo.
- **RF-08.3:** Se configurará la cantidad de pisos, zonas y espacios por zona.
- **RF-08.4** Se definirá el tiempo de gracia general del sistema.
- **RF-08.5** Se configurará la moneda del sistema.
- **RF-08.6** El sistema dispondrá de opción de backup y restauración de datos.

### RF-09: Gestión de Vehículos
- **RF-09.1** El sistema mantendrá un registro de vehículos con placa, tipo, color, marca, modelo y año.
- **RF-09.2** Se podrá asociar un vehículo a un cliente abonado.
- **RF-09.3** Se consultará el historial de entradas/salidas de cada vehículo.

### RF-10: Control de Combustible (Vehículos Internos)
- **RF-10.1** El sistema registrará cargas de combustible por vehículo.
- **RF-10.2** Se registrará litros, precio unitario, costo total, kilometeraje y tipo de combustible.
- **RF-10.3** Se mantendrá un historial de cargas por vehículo.

### RF-11: Control de Mantenimiento (Vehículos Internos)
- **RF-11.1** El sistema registrará servicios de mantenimiento preventivo y correctivo.
- **RF-11.2** Se almacenará descripción, costo, proveedor y kilometeraje del servicio.
- **RF-11.3** Se mantendrá un historial de mantenimiento por vehículo.

### RF-12: Seguimiento GPS (Vehículos Internos)
- **RF-12.1** El sistema almacenará ubicaciones GPS históricas de vehículos.
- **RF-12.2** Se registrarán lecturas manuales de kilometeraje.

---

## REQUISITOS NO FUNCIONALES

### RNF-01: Rendimiento
- **RNF-01.1:** El tiempo de respuesta de cualquier consulta no excederá 2 segundos.
- **RNF-01.2:** El mapa de espacios se actualizará en menos de 1 segundo ante cambios de estado.
- **RNF-01.3:** El sistema soportará al menos 50 usuarios concurrentes sin degradación.
- **RNF-01.4:** Las consultas de reportes se completarán en menos de 5 segundos.

### RNF-02: Disponibilidad
- **RNF-02.1:** El sistema estará disponible el 99% del tiempo en horario laboral.
- **RNF-02.2:** Se implementará manejo de errores gracefully en cada endpoint.
- **RNF-02.3:** Los errores del servidor retornarán mensajes descriptivos en formato JSON.

### RNF-03: Seguridad
- **RNF-03.1:** Todas las contraseñas se almacenarán hasheadas con bcrypt (mínimo 10 rounds).
- **RNF-03.2:** Las rutas protegidas requerirán token JWT válido.
- **RNF-03.3** El token JWT expirará en un plazo máximo de 24 horas.
- **RNF-03.4** El sistema validará permisos por rol en cada endpoint (RBAC).
- **RNF-03.5** Se sanitizarán todas las entradas para prevenir inyección SQL.
- **RNF-03.6** Se habilitará CORS con orígenes configurados.
- **RNF-03.7** Las credenciales sensibles no se expondrán en el frontend.

### RNF-04: Usabilidad
- **RNF-04.1:** La interfaz será responsiva (se adaptará a dispositivos móviles y escritorio).
- **RNF-04.2** El diseño utilizará Tailwind CSS para mantener consistencia visual.
- **RNF-04.3** El sistema contará con navegación intuitive y menús claros por módulo.
- **RNF-04.4** Los formularios incluirán validación en tiempo real antes del envío.
- **RNF-04.5** El sistema mostrará notificaciones toast para confirmar acciones exitosas o errores.

### RNF-05: Escalabilidad
- **RNF-05.1** La arquitectura será modular (frontend separado del backend por API REST).
- **RNF-05.2** El backend exppondrá una API RESTful estandarizada.
- **RNF-05.3** La base de datos usará relaciones y claves foráneas para integridad referencial.
- **RNF-05.4** El sistema permitirá migrarse a despliegue en la nube (Vercel/Railway/Render).

### RNF-06: Mantenibilidad
- **RNF-06.1** El código seguirá convenciones de nombres consistentes (camelCase en JS, snake_case en DB).
- **RNF-06.2** Las rutas del backend estarán organizadas por módulo en archivos separados.
- **RNF-06.3** Los componentes React seguirán una estructura de carpetas por funcionalidad.
- **RNF-06.4** El proyecto incluirá documentación de instalación y configuración.

### RNF-07: Compatibilidad
- **RNF-07.1** El sistema será compatible con los navegadores modernos (Chrome, Firefox, Edge, Safari).
- **RNF-07.2** El backend correrá en Node.js versión 18+ (LTS).
- **RNF-07.3** La base de datos será compatible con MySQL 8+.
- **RNF-07.4** El frontend se compilará con Vite y React 19.

### RNF-08: Integridad de Datos
- **RNF-08.1** Todas las tablas usarán claves primarias autoincrementales.
- **RNF-08.2** Se aplicarán restricciones NOT NULL en campos obligatorios.
- **RNF-08.3** Los campos de tipo ENUM restringirán los valores permitidos a nivel de base de datos.
- **RNF-08.4** Se usarán timestamps automáticos (created_at, updated_at) en todas las tablas principales.
- **RNF-08.5** Las eliminaciones en cascada (ON DELETE CASCADE) se aplicarán donde la dependencia sea estricta.

---

## TECNOLOGÍAS ASOCIADAS

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Lucide React, Recharts |
| Backend | Node.js, Express, Bcryptjs, JWT, Multer |
| Base de Datos | MySQL 8+ |
| Despliegue | Hostinger / Vercel + Railway + PlanetScale |

---

## DESCRIPCIÓN DEL PROYECTO

**ParkSmart Pro** es un sistema web diseñado para la gestión integral de un negocio de parqueo vehicular. Su propósito es digitalizar y automatizar todas las operaciones diarias que un parqueo necesita: desde el registro de entrada y salida de vehículos, hasta el control de cobros, reportes financieros y administración de clientes frecuentes.

### Problema que resuelve

Los parqueos tradicionales operan de forma manual o con sistemas básicos que generan pérdidas por errores de cálculo, falta de control de ingresos, mal manejo de espacios y ausencia de reportes confiables. ParkSmart Pro elimina estos problemas centralizando toda la operación en una sola plataforma web accesible desde cualquier navegador.

### Qué hace el sistema

El sistema permite al administrador configurar completamente el parqueo (zonas, espacios, tarifas, datos del negocio) y brinda a los operadores y cajeros las herramientas para registrar cada vehículo que entra y sale, asignar espacios automáticamente según el tipo de vehículo, calcular el tiempo de permanencia y el monto a cobrar, y procesar pagos en múltiples métodos (efectivo, tarjeta, QR, transferencia).

Además, ofrece una vista gráfica en tiempo real del estado de todos los espacios, un módulo de clientes abonados con membresías, un panel de reportes estadísticos con exportación a PDF y Excel, y funcionalidades de control de combustible, mantenimiento y seguimiento GPS para flotas vehiculares internas.

### Público objetivo

Está dirigido a propietarios y administradores de parqueos, estacionamientos y flotas vehiculares que buscan una solución moderna, económica y fácil de usar para profesionalizar la operación, reducir pérdidas y obtener información clara para la toma de decisiones.

### Modelo de negocio

El sistema está diseñado para operar como producto SaaS (Software as a Service) o como instalación local, con posibilidad de despliegue en plataformas cloud de bajo costo. El plan inicial incluye funcionalidades core (entrada/salida, cobros, reportes) y funcionalidades avanzadas (clientes abonados, combustible, GPS) como módulos complementarios.

---

*Documento generado para el proyecto ParkSmart Pro — Sistema de Gestión de Parqueo*
