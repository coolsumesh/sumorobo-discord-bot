require('dotenv').config();
const http = require('http');

// Create HTTP server for Render
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SumoRobo Bot is running!');
}).listen(PORT, () => {
  console.log(`✅ HTTP server running on port ${PORT}`);
});

// Discord bot imports
const { Client, GatewayIntentBits } = require('discord.js');
const { HfInference } = require('@huggingface/inference');

// Initialize Hugging Face
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

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
      
      // Use Hugging Face model
      let fullResponse = '';
      
      for await (const chunk of hf.chatCompletionStream({
        model: "mistralai/Mistral-7B-Instruct-v0.2",
        messages: [
          { role: "user", content: question }
        ],
        max_tokens: 500,
      })) {
        if (chunk.choices && chunk.choices[0]?.delta?.content) {
          fullResponse += chunk.choices[0].delta.content;
        }
      }
      
      // Split long messages (Discord has 2000 char limit)
      if (fullResponse.length > 2000) {
        message.reply(fullResponse.substring(0, 1997) + '...');
      } else {
        message.reply(fullResponse || 'Sorry, I could not generate a response.');
      }
      
    } catch (error) {
      console.error('Error:', error);
      message.reply('Sorry, I encountered an error! Please try again.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);