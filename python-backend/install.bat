@echo off
echo Installing Python Face Recognition Backend...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo Python found. Installing dependencies...
echo.

REM Install pip if not available
python -m ensurepip --upgrade

REM Upgrade pip
python -m pip install --upgrade pip

REM Install dependencies
echo Installing FastAPI and face recognition libraries...
python -m pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo.
    echo If you get errors with face_recognition, try:
    echo 1. Install Visual Studio Build Tools
    echo 2. Or use: pip install face_recognition --no-deps
    echo 3. Then: pip install dlib cmake
    pause
    exit /b 1
)

echo.
echo ✅ Installation completed successfully!
echo.
echo To start the face recognition server, run:
echo python main.py
echo.
echo The server will be available at: http://localhost:8001
pause