// Load .env.dev or .env.prod based on argument
const envFile = process.argv[2] || '.env';
require('dotenv').config({ path: envFile });

const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

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

// Function to get MIME type from filename
function getMimeType(fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes = {
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    // Video
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Function to handle any file type with Gemini
async function handleFileWithGemini(fileUrl, fileName, question) {
  try {
    console.log('Fetching file:', fileName);
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file (HTTP ${response.status})`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log('File size:', fileSizeMB, 'MB');
    
    // Check file size (Gemini has limits)
    if (buffer.length > 20 * 1024 * 1024) { // 20MB limit
      throw new Error('File is too large (max 20MB). Please use a smaller file.');
    }
    
    // Get MIME type
    const mimeType = getMimeType(fileName);
    console.log('MIME type:', mimeType);
    
    // Convert buffer to base64
    const base64Data = buffer.toString('base64');
    
    // Send to Gemini with inline data
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `I've attached a file (${fileName}). ${question}\n\nPlease analyze the file and provide a clear, concise answer. Keep your response under 3500 characters while being comprehensive.`;
    
    console.log('Sending to Gemini...');
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      },
      prompt
    ]);
    
    const geminiResponse = result.response;
    const answer = geminiResponse.text();
    
    console.log('Response received, length:', answer.length);
    return answer;
    
  } catch (error) {
    console.error('Error processing file:', error.message);
    throw error;
  }
}

// Function to handle AI questions (with or without files)
async function handleAIQuestion(question, channelId, replyFunction, fileData = null) {
  try {
    // If there's a file, use Gemini's file handling
    if (fileData) {
      const answer = await handleFileWithGemini(fileData.url, fileData.name, question);
      
      // Truncate if too long
      let finalAnswer = answer;
      if (finalAnswer.length > 3900) {
        finalAnswer = finalAnswer.substring(0, 3897) + '...';
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription(`**❓ ${question}** 📎 \`${fileData.name}\`\n\n${finalAnswer}`)
        .setFooter({ text: 'Powered by Google Gemini • Analyzed file' })
        .setTimestamp();

      await replyFunction({ embeds: [embed] });
      return;
    }
    
    // No file - use conversation history
    if (!conversationHistory.has(channelId)) {
      conversationHistory.set(channelId, []);
    }
    
    const history = conversationHistory.get(channelId);
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

    // Limit history to last 10 exchanges
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Truncate if too long
    if (answer.length > 3900) {
      answer = answer.substring(0, 3897) + '...';
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setDescription(`**❓ ${question}**\n\n${answer}`)
      .setFooter({ text: 'Powered by Google Gemini • Remembers conversation' })
      .setTimestamp();

    await replyFunction({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error handling AI question:', error.message);
    
    let errorMsg = 'Sorry, I encountered an error! ';
    if (error.message.includes('too large')) {
      errorMsg += error.message;
    } else if (error.message.includes('download')) {
      errorMsg += 'Could not download the file.';
    } else {
      errorMsg += 'Please try again.';
    }
    
    await replyFunction(errorMsg);
  }
}

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

      await interaction.deferReply();

      await handleAIQuestion(question, channelId, async (content) => {
        await interaction.editReply(content);
      });
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

// Handle text commands
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  
  const content = message.content;
  const lowerContent = content.toLowerCase();
  
  // Basic commands
  if (lowerContent === '!ping') {
    message.reply('🏓 Pong!');
    return;
  }
  
  if (lowerContent === '!hello') {
    message.reply('👋 Hello! I am SumoRobo!');
    return;
  }

  if (lowerContent === '.clear') {
    const channelId = message.channelId;
    conversationHistory.delete(channelId);
    message.reply('🧹 Conversation history cleared for this channel!');
    return;
  }

  // .ask command with optional file attachment
  if (lowerContent.startsWith('.ask ')) {
    const question = content.slice(5).trim();
    
    if (!question) {
      message.reply('Please provide a question after `.ask`');
      return;
    }

    // Check for any file attachment
    let fileData = null;
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      fileData = {
        url: attachment.url,
        name: attachment.name
      };
      
      console.log('File attached:', fileData.name);
      await message.channel.sendTyping();
      await message.reply(`📎 Analyzing \`${fileData.name}\`... This may take a moment.`);
    }

    // Show typing indicator
    await message.channel.sendTyping();

    // Handle the question
    await handleAIQuestion(question, message.channelId, async (content) => {
      await message.reply(content);
    }, fileData);
  }
});

client.login(process.env.DISCORD_TOKEN);