@echo off
cd /d "%~dp0backend"
echo Starting Muscle OS backend...
echo Listening at http://localhost:8000
echo.
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload --log-level info
pause
