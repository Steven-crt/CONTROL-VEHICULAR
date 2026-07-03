# 🚗 Guía de Monitoreo GPS en Tiempo Real

## ✅ Sistema Implementado - Estilo Uber/InDriver

El sistema ahora funciona como las aplicaciones de transporte (Uber, InDriver, etc.) con monitoreo GPS en tiempo real.

---

## 🔧 Cómo Funciona

### Para EMPLEADOS (Conductores):
1. Inician sesión en el sistema
2. Van a la página "Monitoreo GPS"
3. Hacen clic en su vehículo para activar el GPS
4. El navegador solicita permiso de ubicación
5. Una vez autorizado, el sistema:
   - 📡 Envía su ubicación cada 8 segundos vía WebSocket
   - 🗺️ Muestra su posición en el mapa en tiempo real
   - 📊 Muestra velocidad, precisión GPS y batería
   - 🔄 Se actualiza automáticamente

### Para ADMINISTRADORES:
1. Inician sesión en el sistema
2. Van a la página "Monitoreo GPS"
3. Ven el mapa con TODOS los empleados:
   - 🟢 **Verde**: Empleado en movimiento (velocidad > 5 km/h)
   - 🟠 **Naranja**: Empleado detenido (GPS activo, sin movimiento)
   - ⚫ **Gris**: Empleado sin GPS activo
4. Actualizaciones en tiempo real vía WebSocket
5. Pueden hacer clic en cualquier vehículo para ver detalles

---

## 🧪 Pasos para Probar

### Paso 1: Iniciar Backend
```bash
cd backend
npm start
```
El servidor debe estar corriendo en http://localhost:3000

### Paso 2: Iniciar Frontend (Desarrollo)
```bash
cd frontend
npm run dev
```
O usar el build de producción que ya está compilado en `frontend/dist`

### Paso 3: Abrir dos navegadores/pestañas

#### Navegador 1 - ADMINISTRADOR:
1. Ir a http://localhost:5173/login (o el puerto que uses)
2. Login como administrador
3. Ir a Monitoreo GPS
4. Deberías ver:
   - ✅ Mapa de OpenStreetMap visible
   - ✅ Badge "En vivo" (verde) = WebSocket conectado
   - ✅ Lista de empleados en el panel inferior
   - ✅ Empleados sin GPS aparecen como "Desconectado"

#### Navegador 2 - EMPLEADO:
1. Abrir en modo incógnito o diferente navegador
2. Login como empleado (que tenga vehículo asignado)
3. Ir a Monitoreo GPS
4. Hacer clic en su vehículo
5. Autorizar ubicación cuando el navegador lo solicite
6. Deberías ver:
   - ✅ Mapa con tu ubicación
   - ✅ Marcador con la primera letra de tu placa
   - ✅ Panel con velocidad y precisión GPS

### Paso 4: Verificar Monitoreo en Tiempo Real

En el navegador del **ADMINISTRADOR**, deberías ver:
- ✅ El marcador del empleado aparece en el mapa (si tiene GPS activo)
- ✅ Se actualiza cada 8 segundos con nueva posición
- ✅ Cambia de color según velocidad (verde si se mueve, naranja si está detenido)
- ✅ Al hacer clic muestra: empleado, velocidad, última actualización

---

## 🔍 Debugging - Consola del Navegador

Abre la consola del navegador (F12) y verás logs:

### EMPLEADO (enviando ubicación):
```
🚗 Activando GPS para vehículo: 1
✅ WebSocket conectado
📡 Enviando ubicación: {vehiculo_id: 1, latitud: -12.0464, longitud: -77.0428, ...}
✅ Enviando por WebSocket
✅ Ubicación confirmada: {id: 123, timestamp: "2026-06-06..."}
```

### ADMINISTRADOR (recibiendo ubicaciones):
```
✅ WebSocket conectado
📍 Ubicación recibida: {vehiculo_id: 1, placa: "ABC-123", latitud: -12.0464, ...}
```

---

## ⚙️ Configuración Importante

### Backend `.env`:
```env
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=tu_secreto_aqui
```

### Frontend (desarrollo):
El frontend se conecta automáticamente a:
- HTTP API: `/api` (proxy en vite)
- WebSocket: Same origin

---

## 🐛 Problemas Comunes

### 1. El mapa no se ve
- ✅ **SOLUCIONADO**: CSP actualizado para permitir tiles de OpenStreetMap
- Verifica en consola si hay errores de CSP

### 2. GPS no se activa
- Verifica que uses HTTPS o localhost (Chrome no permite geolocalización en HTTP)
- Verifica permisos del navegador para ubicación

### 3. Empleado no aparece en el mapa del admin
- Verifica que el empleado tenga un vehículo asignado
- Verifica que ambos estén conectados al WebSocket (badge "En vivo")
- Revisa logs en consola de ambos navegadores

### 4. WebSocket no conecta
- Verifica que el backend esté corriendo
- Verifica que no haya firewall bloqueando el puerto
- Revisa el token de autenticación en sessionStorage

---

## 📊 Características Implementadas

✅ Mapa con tiles de OpenStreetMap  
✅ WebSocket en tiempo real (prioridad)  
✅ HTTP backup para ubicaciones  
✅ Geolocation API del navegador  
✅ Actualización cada 8 segundos  
✅ Marcadores animados con rotación  
✅ Colores según estado (movimiento/detenido/offline)  
✅ Panel de información con detalles  
✅ Filtros por estado  
✅ Rastros de movimiento (trails)  
✅ Timestamp de última actualización  
✅ Velocidad en tiempo real  
✅ Precisión GPS  
✅ Nivel de batería  
✅ Vista empleado con su propio mapa  
✅ Confirmación de privacidad antes de activar GPS  

---

## 🎯 Prueba Rápida

1. Backend corriendo → ✅
2. Frontend corriendo → ✅
3. Admin login → Ve mapa con empleados → ✅
4. Empleado login → Activa GPS → ✅
5. Admin ve marcador moverse en tiempo real → ✅

**¡Listo! Sistema funcionando como Uber/InDriver** 🚀
