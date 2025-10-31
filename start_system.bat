@echo off
echo 🌊 AquaListen System Launcher
echo ================================

REM Activate virtual environment
echo 📋 Activating Python virtual environment...
call venv\Scripts\activate

REM Check if activation was successful
if errorlevel 1 (
    echo ❌ Failed to activate virtual environment
    echo Please ensure venv exists: python -m venv venv
    pause
    exit /b 1
)

echo ✅ Virtual environment activated

REM Run the full system
echo 🚀 Starting AquaListen Full System...
python run_full_system.py

pause
