@echo off
cd /d "%~dp0mobile"
echo.
echo Starting Muscle OS mobile app...
echo.
echo If port 8081 is busy, the QR code will appear on port 8082.
echo Open the URL in your browser to see the developer menu with QR code.
echo.
npx expo start --port 8081
pause
