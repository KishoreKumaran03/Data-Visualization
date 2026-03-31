@echo off
REM Stop and cleanup Docker containers

echo.
echo ========================================
echo   Stopping Docker Services
echo ========================================
echo.

cd /d "%~dp0"

echo Stopping containers...
docker-compose down

echo.
echo [✓] Services stopped
echo.
echo To remove volumes (database data), run:
echo   docker-compose down -v
echo.
pause
