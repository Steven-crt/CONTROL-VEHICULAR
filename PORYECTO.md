Plan: crear README.md en la raíz del repo
Una sola acción: crear README.md en D:\PROYECTOS EMPRESAS\CONTROL-VEHICULAR\. Actualmente no existe ninguno en la raíz (solo hay un frontend/README.md genérico de Vite). No tocaré código ni haré commit salvo que lo pidas.
Contenido propuesto (en español, alineado al proyecto)
# Sistema de Control Vehicular

Plataforma web para la gestión integral de una flota vehicular: control de
combustible, mantenimiento, movimientos, anomalías, reportes financieros y
usuarios en tiempo real.

## Módulos principales

- **Vehículos** — alta/baja, detalle por unidad (SOAT, fotos, documentos).
- **Combustible** — registro de cargas, historial y KPIs de gasto.
- **Mantenimiento** — órdenes y costos por vehículo.
- **Movimientos** — bitácora de uso/desplazamientos de cada unidad.
- **Anomalías** — reporte y seguimiento de incidencias.
- **Reportes** — KPIs del dashboard y consultas filtrables.
- **Configuración** — parámetros globales y usuarios del sistema (roles admin/empleado).
- **Tiempo real (SSE)** — actualización en vivo de pedidos, anomalías y vehículos.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite, React Router 7, styled-components + Tailwind, Recharts |
| Backend | Node.js + Express 4, JWT (cookie httpOnly), SSE, multer |
| Base de datos | MySQL (Aiven), pool + cifrado AES-256-GCM de datos sensibles |
| Deploy | API en Render · frontend en Vercel |

## Estructura del repositorio

backend/     API Express (rutas, middlewares, scripts de BD)
frontend/    SPA React (páginas, API client, contexto de configuración)
render.yaml  Config de despliegue del backend en Render
vercel.json  Config del frontend en Vercel (CSP, rewrite SPA)

## Puesta en marcha (local)

Requisitos: Node >= 18, MySQL local o Aiven.

```bash
# Backend (puerto 3001)
cd backend
cp .env.example .env      # configura DB_* , JWT_SECRET, etc.
npm install
npm run dev

# Frontend (puerto 5173)
cd frontend
npm install
npm run dev
Primer admin: define ADMIN_INITIAL_PASSWORD en .env; luego puedes
cambiarlo con npm run reset:admin.
Variables de entorno del backend
Claves principales (ver .env.example completo):
- DATABASE_URL o DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME + DB_SSL
- JWT_SECRET (obligatorio) y JWT_EXPIRES_IN (default 8h)
- DATA_ENCRYPTION_KEY — cifra email y secretos 2FA (si se omite quedan en claro)
- CORS_ORIGIN — orígenes permitidos separados por coma
- PORT, NODE_ENV, RATE_LIMIT_*, DB_POOL_SIZE, REPORTES_CACHE_MS
Despliegue
- API — Render (web service Node, rootDir backend): usa render.yaml.
SECRETOS deben rellenarse en el panel a mano (sync: false).
- Frontend — Vercel: vercel.json (build frontend, rewrite SPA, cabeceras CSP/HSTS).
Scripts útiles
Comando
npm run migrate:soat
npm run migrate:full
npm run reset:admin
npm run audit (raíz)
Seguridad
- JWT en cookie httpOnly + SameSite, chequeo de Origin contra CSRF.
- Rate limiting por IP sobre /api (login con límite propio).
- Límites de conexiones SSE (por usuario y global).
- Enmascaramiento anti-enumeración en login, autorización server-side por rol.
- Helmet (backend) y CSP/HSTS (Vercel) en el frontend.

### Notas
- **Idioma**: propongo español (toda la app y tu repo están en español). Dímelo si lo prefieres en inglés.
- Secciones opcionales que puedo añadir si quieres: **capturas de pantalla**, **lista de endpoints de la API**, **licencia**, o **changelog**.
