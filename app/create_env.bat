@echo off
echo Creating .env file...
echo DATABASE_URL=mongodb+srv://aqualisten:aqualisten25@aqualisten.ukxoenp.mongodb.net/aqualisten?retryWrites=true^&w=majority^&appName=AquaListen > .env
echo PORT=3002 >> .env
echo NODE_ENV=development >> .env
echo .env file created successfully!
echo.
echo Contents:
type .env
pause
