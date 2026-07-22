# Manual de Sistema: ParkSmart Pro

## 1. Tecnologías de Desarrollo

El sistema ha sido desarrollado utilizando un stack web moderno y robusto (MERN/PERN adaptado a MySQL):

- **Frontend (Interfaz de Usuario):**
  - **React 19:** Biblioteca principal para construir la interfaz.
  - **Vite:** Herramienta de compilación ultrarrápida.
  - **Tailwind CSS:** Framework de diseño para estilos modernos y responsivos.
  - **Lucide React & Recharts:** Para iconografía gráfica y diagramas de estadísticas.

- **Backend (Servidor y API):**
  - **Node.js con Express:** Entorno de ejecución y framework para la API REST.
  - **Bcryptjs & JWT (JSON Web Tokens):** Para encriptación de contraseñas y autenticación segura.
  - **Multer:** Para la subida y gestión de archivos (como el logo de la empresa).

- **Base de Datos:**
  - **MySQL:** Sistema de gestión de bases de datos relacional para guardar todo el registro de operaciones.

---

## 2. Funcionalidades del Sistema

1. **Autenticación y Seguridad:** Login seguro con roles jerárquicos (Administrador, Operador, Cajero).
2. **Control de Flujo de Vehículos:** Registro de entrada y salida con asignación de espacios, lector de placa y cálculo de tiempo.
3. **Mapa del Parqueo en Tiempo Real:** Vista gráfica para ver qué espacios están libres, ocupados o reservados por tipo (autos, motos, discapacitados).
4. **Tarifas Dinámicas:** Configuración de precios por hora, por fracción o tarifas planas, dependiente del tipo de vehículo.
5. **Gestión de Clientes Abonados:** Control para clientes frecuentes con pago de membresía mensual y acceso rápido.
6. **Módulo de Caja y Facturación:** Cobros en diferentes métodos (efectivo, tarjeta, QR), emisión de tickets y recibos, y cierre de caja.
7. **Panel de Reportes estadísticos:** Gráficas de ingresos, nivel de ocupación promedio, y exportación de reportes a PDF y Excel.
8. **Configuración del Negocio:** Personalización del sistema con logo propio, datos del ticket, número de pisos y zonas del parqueo.

---

## 3. Guía de Instalación en Computadora Nueva (Local)

### Requisitos Previos:
1. Descargar e instalar **Node.js** (versión LTS) desde *nodejs.org*.
2. Descargar e instalar **XAMPP** o **MySQL Server** para la base de datos.
3. Un editor de código como **Visual Studio Code**.

### Paso a Paso:
**Paso 1: Preparar la Base de Datos**
1. Abre XAMPP e inicia los servicios de `Apache` y `MySQL`.
2. Ve a `http://localhost/phpmyadmin` en tu navegador.
3. Crea una nueva base de datos llamada `sistema_parqueo`.
4. Importa el archivo `schema.sql` (ubicado dentro de la carpeta `database` del proyecto) hacia esa nueva base de datos.

**Paso 2: Configurar el Backend**
1. Abre la carpeta del proyecto y entra a la carpeta `backend`.
2. Renombra el archivo `.env.example` a `.env` (si existe) y asegúrate de que las credenciales de MySQL sean correctas (usuario: `root`, sin contraseña por defecto en XAMPP).
3. Abre una terminal en esta carpeta y ejecuta:
   `npm install`
4. Una vez instaladas las dependencias, inicia el servidor con:
   `npm run dev` (El servidor correrá en el puerto 3001).

**Paso 3: Configurar el Frontend**
1. Abre otra terminal e ingresa a la carpeta `frontend`.
2. Instala las dependencias ejecutando:
   `npm install`
3. Inicia la interfaz de usuario con:
   `npm run dev`

**Paso 4: Acceso al Sistema**
1. Abre tu navegador en la dirección que indique Vue/Vite (usualmente `http://localhost:5173`).
2. Ingresa con las credenciales por defecto:
   - **Usuario:** `admin`
   - **Contraseña:** `password`

---

## 4. Sugerencia de Hosting Web y Guía de Subida

El hosting web más recomendado y amigable para proyectos que integren React, Node.js y MySQL es **Hostinger** (Plan Premium o Business Hosting, ya que soportan Node.js a través de cPanel/hPanel) o el uso de un **VPS** de DigitalOcean/Hostinger. 

Otra alternativa moderna y gratuita/económica, es dividir el proyecto:
- **Vercel** (Para el Frontend - Gratis)
- **Render** o **Railway** (Para el Backend Node.js - Plan básico o gratis)
- **Aiven db** o **PlanetScale** (Para la base de datos MySQL - Gratis)

A continuación, te enseñaré el **paso a paso utilizando Hostinger (hPanel con soporte Node.js)** por ser el más demandado:

**Paso 1: Base de Datos en el Hosting**
1. En tu panel de Hostinger, ve a **Bases de Datos > Gestión de Bases de datos**.
2. Crea una base de datos MySQL, asigna un usuario y una contraseña segura.
3. Ingresa a **phpMyAdmin** desde Hostinger e importa tu archivo `schema.sql`.

**Paso 2: Despliegue del Backend (API)**
1. En tu editor, actualiza tu archivo `.env` del backend con los nuevos datos de la base de datos (Host, Usuario, BD y Contraseña).
2. Comprime los archivos de tu carpeta `backend` (OJO: excluye la carpeta `node_modules`).
3. Sube este `.zip` al administrador de archivos de Hostinger, sugeriblemente fuera de la carpeta `public_html` (ejemplo, en una carpeta llamada `api`).
4. Desde el hPanel, busca la herramienta **Configuración de Node.js** o Terminal, apunta a tu archivo `server.js`, instala los módulos `npm install` y arranca la aplicación.

**Paso 3: Despliegue del Frontend (React)**
1. En tu computadora, localiza el archivo que conecta tu frontend con el backend (ej: `axios.js` o `.env` en el frontend) y cambia la URL `http://localhost:3001/api` por tu dominio oficial `https://midominio.com/api`.
2. En la terminal de la carpeta `frontend`, ejecuta el comando de compilación:
   `npm run build`
3. Esto generará una carpeta llamada `dist`. Comprime el contenido de esa carpeta.
4. Sube este `.zip` dentro de la carpeta `public_html` de tu Hostinger y extráelo.
5. Visita tu dominio, ¡y el sistema ya estará en internet de manera exitosa!
