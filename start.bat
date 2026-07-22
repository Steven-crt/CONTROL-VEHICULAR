@echo off
echo ==========================================
echo    Sistema de Control Vehicular
echo ==========================================

echo.
echo [1/2] Iniciando Backend (puerto 3001)...
start "Control Vehicular - Backend" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak > nul

echo [2/2] Iniciando Frontend (puerto 5173)...
start "Control Vehicular - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak > nul

echo.
echo Sistema iniciado. Abriendo navegador...
start http://localhost:5173

echo.
echo Para detener: cierra las ventanas de terminal.
pause
