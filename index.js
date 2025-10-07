require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

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
      
      // Your Hugging Face code here
      // (keep whatever is working for you)
      
    } catch (error) {
      console.error('Error:', error);
      message.reply('Sorry, I encountered an error!');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);