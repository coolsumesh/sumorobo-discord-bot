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

// Track if last query used web search (per channel)
const lastUsedWebSearch = new Map();

// Store the school channel ID (will be set when bot finds a channel named "school")
let schoolChannelId = null;

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

// Function to detect if message is school-related
function isSchoolRelated(message) {
  const schoolKeywords = [
    'homework', 'assignment', 'test', 'exam', 'quiz', 'study', 'class', 'teacher',
    'school', 'subject', 'l2', 'l3', 'tamil', 'hindi', 'math', 'science', 'english',
    'chapter', 'lesson', 'textbook', 'notebook', 'project', 'presentation',
    'due date', 'submit', 'submission', 'grade', 'marks', 'score',
    'syllabus', 'curriculum', 'activity', 'worksheet', 'practice'
  ];

  const lowerContent = message.toLowerCase();
  return schoolKeywords.some(keyword => lowerContent.includes(keyword));
}

// Function to copy message to school channel
async function copyToSchoolChannel(message, client) {
  try {
    // Don't copy messages that are already in the school channel
    if (message.channel.name && message.channel.name.toLowerCase() === 'school') {
      return;
    }

    // Find the school channel if not already found
    if (!schoolChannelId) {
      const channels = await message.guild.channels.fetch();
      const schoolChannel = channels.find(ch => ch.name && ch.name.toLowerCase() === 'school');

      if (schoolChannel) {
        schoolChannelId = schoolChannel.id;
      } else {
        console.log('School channel not found');
        return;
      }
    }

    const schoolChannel = await client.channels.fetch(schoolChannelId);

    if (!schoolChannel) {
      console.log('Could not fetch school channel');
      return;
    }

    // Create an embed with the original message info
    const embed = new EmbedBuilder()
      .setColor(0xFFA500) // Orange for school-related
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL()
      })
      .setDescription(message.content)
      .addFields(
        { name: 'From Channel', value: `#${message.channel.name}`, inline: true },
        { name: 'Jump to Message', value: `[Click here](${message.url})`, inline: true }
      )
      .setFooter({ text: '📚 Auto-copied school-related message' })
      .setTimestamp(message.createdAt);

    // If message has attachments, add them
    if (message.attachments.size > 0) {
      const attachmentList = message.attachments.map(att => `[${att.name}](${att.url})`).join('\n');
      embed.addFields({ name: 'Attachments', value: attachmentList });

      // Set image if it's an image attachment
      const firstAttachment = message.attachments.first();
      if (firstAttachment.contentType && firstAttachment.contentType.startsWith('image/')) {
        embed.setImage(firstAttachment.url);
      }
    }

    await schoolChannel.send({ embeds: [embed] });
    console.log(`📚 Copied school-related message from #${message.channel.name} to #school`);

  } catch (error) {
    console.error('Error copying to school channel:', error);
  }
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

    const prompt = `${SYSTEM_CONTEXT}\n\nI've attached a file (${fileName}). ${question}\n\nPlease analyze the file and provide a clear, concise answer. Keep your response under 3500 characters while being comprehensive.`;
    
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

      // Initialize conversation history if needed
      if (!conversationHistory.has(channelId)) {
        conversationHistory.set(channelId, [
          { role: 'user', parts: [{ text: SYSTEM_CONTEXT }] },
          { role: 'model', parts: [{ text: 'Understood! I will remember that L2 refers to Tamil subject and L3 refers to Hindi subject throughout our conversation. When you mention assignments or activities for L2 or L3, I\'ll know you mean Tamil or Hindi respectively. I\'m ready to assist with your language learning assignments!' }] }
        ]);
      }

      // Add to conversation history for follow-up questions
      const history = conversationHistory.get(channelId);
      history.push(
        { role: 'user', parts: [{ text: `I've attached a file (${fileData.name}). ${question}\n\nPlease analyze the file and provide a clear, concise answer. Keep your response under 3500 characters while being comprehensive.` }] },
        { role: 'model', parts: [{ text: answer }] }
      );

      // Limit history to last 10 exchanges
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      // Clear web search flag since this is a file analysis
      lastUsedWebSearch.set(channelId, false);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription(`**❓ ${question}** 📎 \`${fileData.name}\`\n\n${finalAnswer}`)
        .setFooter({ text: 'Powered by Google Gemini • Analyzed file' })
        .setTimestamp();

      await replyFunction({ embeds: [embed] });
      return;
    }
    
    // Check if question needs real-time info
    // Also use web search if the previous query used it (for follow-ups)
    const directlyNeedsWebSearch = needsRealTimeInfo(question);
    const previousUsedWebSearch = lastUsedWebSearch.get(channelId) || false;

    // Use web search if directly needed OR if previous query used it (sticky mode)
    // This allows follow-up questions like "what about silver?" or "in AUD?" to also use web search
    const useWebSearch = directlyNeedsWebSearch || previousUsedWebSearch;

    if (useWebSearch) {
      console.log('🌐 Using web search for real-time info');

      // Initialize conversation history if needed
      if (!conversationHistory.has(channelId)) {
        conversationHistory.set(channelId, [
          { role: 'user', parts: [{ text: SYSTEM_CONTEXT }] },
          { role: 'model', parts: [{ text: 'Understood! I will remember that L2 refers to Tamil subject and L3 refers to Hindi subject throughout our conversation. When you mention assignments or activities for L2 or L3, I\'ll know you mean Tamil or Hindi respectively. I\'m ready to assist with your language learning assignments!' }] }
        ]);
      }

      // Use Gemini with Google Search grounding
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{
          googleSearch: {}
        }]
      });

      const prompt = `${SYSTEM_CONTEXT}\n\n${question}\n\nPlease provide a clear and concise answer with current, up-to-date information. Keep your response under 3500 characters while being comprehensive.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      let answer = response.text();

      if (answer.length > 3900) {
        answer = answer.substring(0, 3897) + '...';
      }

      // Add to conversation history for follow-up questions
      const history = conversationHistory.get(channelId);
      history.push(
        { role: 'user', parts: [{ text: `${question}\n\nPlease provide a clear and concise answer with current, up-to-date information. Keep your response under 3500 characters while being comprehensive.` }] },
        { role: 'model', parts: [{ text: answer }] }
      );

      // Limit history to last 10 exchanges
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      // Mark that this channel used web search for follow-up detection
      lastUsedWebSearch.set(channelId, true);

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

    // Don't immediately clear web search flag - let conversation context decide
    // Only clear if this seems like a completely different topic
    // The flag will naturally clear when user asks about unrelated topics

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

  // Check if message is school-related and copy to school channel
  if (content.trim() && isSchoolRelated(content)) {
    await copyToSchoolChannel(message, client);
  }

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
    lastUsedWebSearch.delete(channelId);
    message.reply('🧹 Conversation history cleared for this channel!');
    return;
  }

  // .analyse command - analyze a replied-to message or previous message
  if (lowerContent === '.analyse' || lowerContent === '.analyze') {
    try {
      let repliedMessage;

      // Check if this is a reply to another message
      if (message.reference) {
        // Fetch the replied-to message
        repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      } else {
        // No reply - fetch the previous message before this one
        const messages = await message.channel.messages.fetch({ limit: 2, before: message.id });
        const previousMessage = messages.first();

        if (!previousMessage) {
          message.reply('No previous message found to analyze.');
          return;
        }

        // Don't analyze bot's own messages
        if (previousMessage.author.bot) {
          message.reply('Cannot analyze bot messages. Please reply to a specific user message to analyze it.');
          return;
        }

        repliedMessage = previousMessage;
      }

      const messageToAnalyze = repliedMessage.content;

      if (!messageToAnalyze || messageToAnalyze.trim() === '') {
        message.reply('The message you replied to has no text content to analyze.');
        return;
      }

      // Check if the replied message has attachments
      let fileData = null;
      if (repliedMessage.attachments.size > 0) {
        const attachment = repliedMessage.attachments.first();
        fileData = {
          url: attachment.url,
          name: attachment.name
        };

        console.log('Analyzing message with file:', fileData.name);
        await message.channel.sendTyping();
        await message.reply(`🔍 Analyzing message with attachment \`${fileData.name}\`... This may take a moment.`);
      } else {
        await message.channel.sendTyping();
        await message.reply(`🔍 Analyzing message...`);
      }

      // Analyze the message content
      const analysisPrompt = fileData
        ? `Analyze this message and its attachment: "${messageToAnalyze}"`
        : `Analyze this message: "${messageToAnalyze}"`;

      // Initialize conversation history if needed (so follow-up questions work)
      if (!conversationHistory.has(message.channelId)) {
        conversationHistory.set(message.channelId, [
          { role: 'user', parts: [{ text: SYSTEM_CONTEXT }] },
          { role: 'model', parts: [{ text: 'Understood! I will remember that L2 refers to Tamil subject and L3 refers to Hindi subject throughout our conversation. When you mention assignments or activities for L2 or L3, I\'ll know you mean Tamil or Hindi respectively. I\'m ready to assist with your language learning assignments!' }] }
        ]);
      }

      await handleAIQuestion(analysisPrompt, message.channelId, async (content) => {
        await message.reply(content);
      }, fileData);

    } catch (error) {
      console.error('Error fetching replied message:', error);
      message.reply('Sorry, I couldn\'t fetch the message you replied to. Please try again.');
    }
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
    return;
  }

  // Auto-invoke bot for messages ending with '?'
  if (content.trim().endsWith('?')) {
    const question = content.trim();

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