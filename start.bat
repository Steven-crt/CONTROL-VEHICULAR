@echo off
setlocal enabledelayedexpansion
title Sistema de Control Vehicular
color 0A
echo.
echo  ==========================================
echo     Sistema de Control Vehicular
echo  ==========================================
echo.
echo  [1/2] Iniciando Backend con MySQL LOCAL (puerto 3001)...
start "CV - Backend LOCAL" cmd /k "title CV-Backend-LOCAL & cd /d "%~dp0backend" & set "DB_HOST=localhost" & set "DB_PORT=3309" & set "DB_USER=root" & set "DB_PASSWORD=160507" & set "DB_NAME=control_vehicular_test" & set "DB_SSL=false" & set "JWT_SECRET=mi_clave_secreta_super_segura_123" & npm run dev"

timeout /t 4 /nobreak >nul
echo  [2/2] Iniciando Frontend (puerto 5173)...
start "CV - Frontend" cmd /k "title CV-Frontend & cd /d "%~dp0frontend" & npm run dev"

timeout /t 6 /nobreak >nul
echo.
echo  Abriendo navegador en http://localhost:5173 ...
start http://localhost:5173

echo.
echo  ==========================================
echo   Sistema listo
echo  ==========================================
echo.
echo  Para detener: cierra las ventanas de terminal.
echo.
pause
endlocal
