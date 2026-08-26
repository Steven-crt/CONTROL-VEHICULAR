@echo off
title Sistema de Control Vehicular
echo ==========================================
echo    Sistema de Control Vehicular
echo ==========================================
echo.
echo  Que base de datos quieres usar?
echo   [1] BD LOCAL de pruebas  (127.0.0.1:3309 / control_vehicular_test)
echo   [2] Aiven PRODUCCION     (backend\.env)
echo.
choice /C 12 /N /M " Selecciona 1 o 2: "
if errorlevel 2 goto aiven

:local
echo.
echo [1/2] Iniciando Backend con BD LOCAL de pruebas (puerto 3001)...
start "Control Vehicular - Backend" cmd /k "set DB_HOST=127.0.0.1&& set DB_PORT=3309&& set DB_USER=root&& set DB_PASSWORD=160507&& set DB_NAME=control_vehicular_test&& set DB_SSL=false&& cd /d %~dp0backend && npm run dev"
goto frontend

:aiven
echo.
echo [1/2] Iniciando Backend con AIVEN PRODUCCION (puerto 3001)...
start "Control Vehicular - Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:frontend
timeout /t 3 /nobreak > nul
echo [2/2] Iniciando Frontend (puerto 5173)...
start "Control Vehicular - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak > nul
echo Abriendo navegador...
start http://localhost:5173
echo.
echo Usuarios de prueba (BD LOCAL):
echo    test_admin     / test1234   (administrador)
echo    test_empleado  / test1234   (empleado)
echo.
echo Para detener: cierra las ventanas de terminal.
pause
