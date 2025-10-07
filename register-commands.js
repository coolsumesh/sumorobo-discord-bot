// Load .env.dev or .env.prod based on argument
const envFile = process.argv[2] || '.env';
require('dotenv').config({ path: envFile });

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask SumoRobo a question')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if the bot is online'),
  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello to SumoRobo'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Loading environment from: ${envFile}`);
    console.log('Started refreshing application (/) commands.');
    console.log(`Using CLIENT_ID: ${process.env.CLIENT_ID}`);

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log('✅ Successfully registered application commands!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();