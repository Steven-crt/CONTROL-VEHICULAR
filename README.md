# ParkSmart Pro — Iniciar Sistema

## Opción 1: Script automático (recomendado)
Doble clic en `start.bat`

## Opción 2: Manual

### 1. Base de datos (una sola vez)
```
mysql -u root -p < database/schema.sql
```

### 2. Backend
```
cd backend
npm run dev
```

### 3. Frontend (nueva terminal)
```
cd frontend
npm run dev
```

### Acceso
- Frontend: http://localhost:5173
- API: http://localhost:3001/api

### Credenciales de prueba
| Usuario | Contraseña | Rol |
|---------|----------|-----|
| admin | password | Administrador |
| operador1 | password | Operador |
| cajero1 | password | Cajero |
