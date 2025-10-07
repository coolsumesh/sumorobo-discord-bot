const envFile = process.argv[2] || '.env';
require('dotenv').config({ path: envFile });

const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Create HTTP server for Render
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SumoRobo Bot is running!');
}).listen(PORT, () => {
  console.log(`✅ HTTP server running on port ${PORT}`);
});

// Initialize Gemini 2.5 Flash
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Discord bot imports
const { Client, GatewayIntentBits } = require('discord.js');

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
  
  if (message.content.toLowerCase().startsWith('@answer')) {
    const question = message.content.slice(7).trim();
    
    if (!question) {
      message.reply('Please ask a question after @answer!');
      return;
    }
    
    try {
      await message.channel.sendTyping();
      
      // Use Gemini 2.5 Flash
      const result = await model.generateContent(question);
      const response = result.response;
      const answer = response.text();
      
      // Discord has 2000 character limit
      if (answer.length > 2000) {
        message.reply(answer.substring(0, 1997) + '...');
      } else {
        message.reply(answer);
      }
      
    } catch (error) {
      console.error('Error:', error);
      message.reply('Sorry, I encountered an error! Please try again.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);