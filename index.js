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

// Store conversation history per channel
// Format: { channelId: [{ role: 'user', parts: [{ text: '...' }] }, ...] }
const conversationHistory = new Map();

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
      const channelId = interaction.channelId;

      // Defer reply because AI might take time
      await interaction.deferReply();

      // Get or create conversation history for this channel
      if (!conversationHistory.has(channelId)) {
        conversationHistory.set(channelId, []);
      }
      
      const history = conversationHistory.get(channelId);

      // Add instruction to keep response concise
      const prompt = `${question}\n\nPlease provide a clear and concise answer. Keep your response under 3500 characters while being comprehensive.`;

      // Create chat session with history
      const chat = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }).startChat({
        history: history,
      });

      // Send message and get response
      const result = await chat.sendMessage(prompt);
      const response = result.response;
      let answer = response.text();

      // Update conversation history
      history.push(
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text: answer }] }
      );

      // Limit history to last 10 exchanges (20 messages) to avoid token limits
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      // Safety check - if still too long, truncate
      if (answer.length > 3900) {
        answer = answer.substring(0, 3897) + '...';
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord blurple color
        .setDescription(`**❓ ${question}**\n\n${answer}`)
        .setFooter({ text: 'Powered by Google Gemini • Remembers conversation' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    if (commandName === 'clear') {
      const channelId = interaction.channelId;
      conversationHistory.delete(channelId);
      await interaction.reply('🧹 Conversation history cleared for this channel!');
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