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

// Function to extract text from PDF
async function extractPDFText(pdfUrl) {
  try {
    console.log('Fetching PDF from:', pdfUrl);
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('PDF fetched successfully');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('Buffer size:', buffer.length, 'bytes');
    
    console.log('Parsing PDF...');
    
    // Require pdf-parse inside the function to handle module loading
    const pdfParse = require('pdf-parse');
    console.log('pdf-parse loaded, type:', typeof pdfParse);
    
    const data = await pdfParse(buffer);
    console.log('Pages:', data.numpages);
    console.log('Text length:', data.text.length, 'characters');
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF appears to be empty or image-based (scanned). I can only read text-based PDFs.');
    }
    
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Function to handle AI questions (used by both slash and text commands)
async function handleAIQuestion(question, channelId, replyFunction, pdfText = null) {
  try {
    // Get or create conversation history for this channel
    if (!conversationHistory.has(channelId)) {
      conversationHistory.set(channelId, []);
    }
    
    const history = conversationHistory.get(channelId);

    // Build prompt with PDF context if available
    let prompt;
    if (pdfText) {
      // Limit PDF text to avoid token limits (first 10000 characters)
      const limitedPdfText = pdfText.substring(0, 10000);
      prompt = `I have a PDF document with the following content:\n\n${limitedPdfText}\n\nQuestion: ${question}\n\nPlease answer based on the PDF content. Keep your response under 3500 characters while being comprehensive.`;
    } else {
      prompt = `${question}\n\nPlease provide a clear and concise answer. Keep your response under 3500 characters while being comprehensive.`;
    }

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

    // Limit history to last 10 exchanges (20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Safety check - if still too long, truncate
    if (answer.length > 3900) {
      answer = answer.substring(0, 3897) + '...';
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setDescription(`**❓ ${question}**${pdfText ? ' 📄' : ''}\n\n${answer}`)
      .setFooter({ text: pdfText ? 'Powered by Google Gemini • Analyzed PDF' : 'Powered by Google Gemini • Remembers conversation' })
      .setTimestamp();

    await replyFunction({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error handling AI question:', error.message);
    await replyFunction('Sorry, I encountered an error! Please try again.');
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

      // Defer reply because AI might take time
      await interaction.deferReply();

      // Use the shared function
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

  // .ask command with optional PDF
  if (lowerContent.startsWith('.ask ')) {
    const question = content.slice(5).trim();
    
    if (!question) {
      message.reply('Please provide a question after `.ask`');
      return;
    }

    // Check for PDF attachment
    let pdfText = null;
    const pdfAttachment = message.attachments.find(att => att.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfAttachment) {
      try {
        await message.channel.sendTyping();
        const statusMsg = await message.reply('📄 Reading PDF... This may take a moment.');
        pdfText = await extractPDFText(pdfAttachment.url);
        console.log(`✅ Successfully extracted ${pdfText.length} characters from PDF`);
        await statusMsg.delete(); // Remove the "reading" message
      } catch (error) {
        console.error('PDF extraction failed:', error.message);
        
        let errorMsg = '❌ ' + error.message;
        if (!error.message.includes('PDF')) {
          errorMsg = '❌ Failed to read the PDF file. ' + error.message;
        }
        
        message.reply(errorMsg);
        return;
      }
    }

    // Show typing indicator
    await message.channel.sendTyping();

    // Use the shared function
    await handleAIQuestion(question, message.channelId, async (content) => {
      await message.reply(content);
    }, pdfText);
  }
});

client.login(process.env.DISCORD_TOKEN);