@echo off
title NeuroClass Auto-Starter
echo ===================================================
echo     Starting NeuroClass Services... Please Wait
echo ===================================================

cd /d "%~dp0"

echo [1/3] Starting Backend Server...
start "NeuroClass Backend" cmd /k "cd backend && npm run dev"

timeout /t 2 /nobreak > nul

echo [2/3] Starting Frontend (React/Vite)...
start "NeuroClass Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 2 /nobreak > nul

echo [3/3] Starting AI Module (Python)...
start "NeuroClass AI" cmd /k "cd ai_module && ..\.venv\Scripts\python.exe main.py"

echo.
echo ===================================================
echo All services have been launched in separate windows!
echo You can now refresh your browser (http://localhost:5173).
echo ===================================================
pause
