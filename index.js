// Load .env.dev or .env.prod based on argument
const envFile = process.argv[2] || '.env';
require('dotenv').config({ path: envFile });

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is required in environment file');
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required in environment file');
  process.exit(1);
}

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

// System context for language learning
const SYSTEM_CONTEXT = `You are an educational assistant helping with language learning and school assignments. Important context:
- L2 = Tamil (Tamil language subject in school)
- L3 = Hindi (Hindi language subject in school)

When the user mentions "L2", they are referring to their Tamil subject/class. When they mention "L3", they are referring to their Hindi subject/class. This is how teachers designate language subjects in assignments and activities.

For example:
- "L2 Pick the Words activity" means a Pick the Words activity for Tamil
- "L3 homework" means Hindi homework
- "L2 assignment" means Tamil assignment

Always interpret L2 as Tamil and L3 as Hindi throughout the conversation, and provide relevant help for these language subjects.`;

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

// Function to detect if question needs real-time info
function needsRealTimeInfo(question) {
  const realTimeKeywords = [
    'current', 'latest', 'recent', 'today', 'now', 'this week', 'this month', 'this year',
    '2025', '2026', '2027', 'news', 'weather', 'stock', 'price', 'score', 'result',
    'who won', 'who is the', 'what happened', 'breaking', 'update', 'live',
    'right now', 'at the moment', 'as of', 'president', 'ceo', 'leader'
  ];
  
  const lowerQuestion = question.toLowerCase();
  return realTimeKeywords.some(keyword => lowerQuestion.includes(keyword));
}

// Function to handle any file type with Gemini
async function handleFileWithGemini(fileUrl, fileName, question) {
  try {
    console.log('Fetching file:', fileName);
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file (HTTP ${response.status})`);
    }
    
    // Check file size before downloading
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 20 * 1024 * 1024) {
      throw new Error('File is too large (max 20MB). Please use a smaller file.');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log('File size:', fileSizeMB, 'MB');
    
    // Double-check file size after download (in case content-length was missing)
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

// Function to handle AI questions (with automatic web search detection)
async function handleAIQuestion(question, channelId, replyFunction, fileData = null) {
  try {
    // If there's a file, use Gemini's file handling
    if (fileData) {
      const answer = await handleFileWithGemini(fileData.url, fileData.name, question);
      
      let finalAnswer = answer;
      if (finalAnswer.length > 3900) {
        finalAnswer = finalAnswer.substring(0, 3897) + '...';
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription(`**❓ ${question}** 📎 \`${fileData.name}\`\n\n${finalAnswer}`)
        .setFooter({ text: 'Powered by Google Gemini • Analyzed file' })
        .setTimestamp();

      await replyFunction({ embeds: [embed] });
      return;
    }
    
    // Check if question needs real-time info
    const useWebSearch = needsRealTimeInfo(question);
    
    if (useWebSearch) {
      console.log('🌐 Using web search for real-time info');
      
      // Use Gemini with Google Search grounding
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        tools: [{
          googleSearch: {}
        }]
      });
      
      const prompt = `${question}\n\nPlease provide a clear and concise answer with current, up-to-date information. Keep your response under 3500 characters while being comprehensive.`;
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      let answer = response.text();
      
      if (answer.length > 3900) {
        answer = answer.substring(0, 3897) + '...';
      }
      
      // Green embed for web search
      const embed = new EmbedBuilder()
        .setColor(0x00FF00) // Green for web search
        .setDescription(`**❓ ${question}** 🌐\n\n${answer}`)
        .setFooter({ text: 'Powered by Google Gemini • Searched the web for current info' })
        .setTimestamp();

      await replyFunction({ embeds: [embed] });
      return;
    }
    
    // No web search needed - use conversation history
    if (!conversationHistory.has(channelId)) {
      // Initialize with system context
      conversationHistory.set(channelId, [
        { role: 'user', parts: [{ text: SYSTEM_CONTEXT }] },
        { role: 'model', parts: [{ text: 'Understood! I will remember that L2 refers to Tamil subject and L3 refers to Hindi subject throughout our conversation. When you mention assignments or activities for L2 or L3, I\'ll know you mean Tamil or Hindi respectively. I\'m ready to assist with your language learning assignments!' }] }
      ]);
    }

    const history = conversationHistory.get(channelId);
    const prompt = `${question}\n\nPlease provide a clear and concise answer. Keep your response under 3500 characters while being comprehensive.`;

    const chat = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }).startChat({
      history: history,
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    let answer = response.text();

    history.push(
      { role: 'user', parts: [{ text: prompt }] },
      { role: 'model', parts: [{ text: answer }] }
    );

    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    if (answer.length > 3900) {
      answer = answer.substring(0, 3897) + '...';
    }

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