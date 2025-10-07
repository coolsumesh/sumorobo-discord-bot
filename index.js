// Load .env.dev or .env.prod based on argument
const envFile = process.argv[2] || '.env';
require('dotenv').config({ path: envFile });

const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

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
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'ping') {
      await interaction.reply('🏓 Pong!');
    }

    if (commandName === 'hello') {
      await interaction.reply('👋 Hello! I am SumoRobo!');
    }

    if (commandName === 'ask') {
      const question = interaction.options.getString('question');

      // Defer reply because AI might take time
      await interaction.deferReply();

      // Add instruction to keep response concise
      const prompt = `${question}\n\nPlease provide a clear and concise answer. Keep your response under 3500 characters while being comprehensive.`;

      // Get AI response from Gemini
      const result = await model.generateContent(prompt);
      const response = result.response;
      let answer = response.text();

      // Safety check - if still too long, truncate
      if (answer.length > 3900) {
        answer = answer.substring(0, 3897) + '...';
      }

      // Create embed without redundant title
      const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord blurple color
        .setDescription(`**❓ ${question}**\n\n${answer}`)
        .setFooter({ text: 'Powered by Google Gemini' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error handling command:', error.message);
    
    try {
      if (interaction.deferred) {
        await interaction.editReply('Sorry, I encountered an error! Please try again.');
      } else {
        await interaction.reply('Sorry, I encountered an error! Please try again.');
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError.message);
    }
  }
});

// Keep text commands as backup
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