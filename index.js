// Load .env.dev or .env.prod based on argument
const envFile = process.argv[2] || '.env';
require('dotenv').config({ path: envFile });

const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Client, GatewayIntentBits } = require('discord.js');

// Create HTTP server for Render
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SumoRobo Bot is running!');
}).listen(PORT, () => {
  console.log(`✅ HTTP server running on port ${PORT}`);
});

// Verify environment variables
console.log('Environment check:');
console.log('- DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? 'Set ✅' : 'Missing ❌');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set ✅' : 'Missing ❌');
console.log('- CLIENT_ID:', process.env.CLIENT_ID ? 'Set ✅' : 'Missing ❌');

// Initialize Gemini 2.5 Flash
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('clientReady', () => {
  console.log(`✅ ${client.user.tag} is online!`);
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  console.log('Interaction received:', interaction.commandName);
  
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'ping') {
      console.log('Handling ping command');
      await interaction.reply('🏓 Pong!');
    }

    if (commandName === 'hello') {
      console.log('Handling hello command');
      await interaction.reply('👋 Hello! I am SumoRobo!');
    }

    if (commandName === 'ask') {
      console.log('Handling ask command');
      const question = interaction.options.getString('question');
      console.log('Question:', question);

      // Defer reply because AI might take time
      await interaction.deferReply();
      console.log('Reply deferred');

      // Get AI response from Gemini
      console.log('Calling Gemini API...');
      const result = await model.generateContent(question);
      const response = result.response;
      const answer = response.text();
      console.log('Got response from Gemini');

      // Discord has 2000 character limit
      if (answer.length > 2000) {
        await interaction.editReply(answer.substring(0, 1997) + '...');
      } else {
        await interaction.editReply(answer);
      }
      console.log('Reply sent successfully');
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    console.error('Error stack:', error.stack);
    
    try {
      if (interaction.deferred) {
        await interaction.editReply('Sorry, I encountered an error! Please try again.');
      } else {
        await interaction.reply('Sorry, I encountered an error! Please try again.');
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
});

// Keep text commands as backup (optional)
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  
  const content = message.content.toLowerCase();
  
  if (content === '!ping') {
    message.reply('🏓 Pong!');
    return;
  }
  
  if (content === '!hello') {
    message.reply('👋 Hello! I am SumoRobo!');
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);