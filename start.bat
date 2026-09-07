@echo off
echo ==========================================
echo   Starting Django + React Shop
echo ==========================================

:: Start Django Backend
echo [1/2] Starting Django backend on port 8000...
start "Django Backend" /D "%~dp0backend" cmd /k ""%~dp0venv\Scripts\python.exe" manage.py runserver"

:: Wait a moment
timeout /t 2 /nobreak >nul

:: Start React Frontend
echo [2/2] Starting React frontend on port 5173...
start "React Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

echo ==========================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   Admin:    http://localhost:8000/django-admin
echo   API Docs: http://localhost:8000/api/docs/
echo ==========================================
pause
