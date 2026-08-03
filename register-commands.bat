@echo off
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
  echo.
  echo Something went wrong installing dependencies. Make sure Node.js is installed: https://nodejs.org
  pause
  exit /b 1
)

echo.
echo Registering Discord slash commands...
call node register-commands.js .env
if %errorlevel% neq 0 (
  echo.
  echo Something went wrong registering commands. Check that your .env file has DISCORD_TOKEN and CLIENT_ID set correctly.
  pause
  exit /b 1
)

echo.
echo Done! Your bot's slash commands are registered.
echo (Slash commands can take 5-10 minutes to show up in Discord.)
pause
