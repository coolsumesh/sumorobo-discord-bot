#!/bin/bash
cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
  echo ""
  echo "Something went wrong installing dependencies. Make sure Node.js is installed: https://nodejs.org"
  read -p "Press Enter to close..."
  exit 1
fi

echo ""
echo "Registering Discord slash commands..."
node register-commands.js .env
if [ $? -ne 0 ]; then
  echo ""
  echo "Something went wrong registering commands. Check that your .env file has DISCORD_TOKEN and CLIENT_ID set correctly."
  read -p "Press Enter to close..."
  exit 1
fi

echo ""
echo "Done! Your bot's slash commands are registered."
echo "(Slash commands can take 5-10 minutes to show up in Discord.)"
read -p "Press Enter to close..."
