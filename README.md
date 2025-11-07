# SumoRobo Discord Bot

A powerful AI-powered Discord bot built with Google Gemini 2.5 Flash, featuring intelligent conversation, real-time web search, and multi-format file analysis.

## 🌟 Features

### AI Capabilities
- **Intelligent Conversations** - Powered by Google Gemini 2.5 Flash AI model
- **Automatic Web Search** - Detects when questions need current information and searches the web automatically
- **Persistent Web Search** - Follow-up questions maintain web search mode for continuous real-time information
- **Conversation Memory** - Remembers context within each Discord channel for natural follow-up questions
- **Multi-Format File Support** - Analyze PDFs, Word documents, images, text files, and more
- **Language Learning Context** - Built-in understanding of L2 (Tamil) and L3 (Hindi) language subjects for educational assistance

### Commands
- `/ask [question]` or `.ask [question]` - Ask the AI a question
- `.analyse` or `.analyze` - Analyze a message (reply to a message or automatically analyzes the previous message)
- `.clear` - Clear conversation history and web search mode for the current channel
- `/ping` or `!ping` - Check bot status
- `/hello` or `!hello` - Greet the bot

### Smart Features
- **Real-Time Information** - Automatically searches the web for queries containing keywords like "current", "latest", "2025", "news", "weather", "stock price", etc.
- **Persistent Web Search Mode** - Once web search is triggered, follow-up questions automatically use web search for consistent real-time information
- **Question Mark Auto-Invoke** - Messages ending with '?' automatically invoke the bot without needing .ask command
- **Auto School Message Copying** - Automatically detects and copies school-related messages to a dedicated "school" channel
- **Visual Indicators** - Color-coded embeds (🔵 Blue = knowledge base, 🟢 Green = web search used, 🟠 Orange = school-related copy)
- **File Analysis** - Attach documents, images, or PDFs and ask questions about them
- **Message Analysis** - Use .analyse to analyze any message (with or without attachments) and continue the conversation naturally
- **Case-Insensitive Commands** - Commands work regardless of capitalization

## 🛠️ Tech Stack

- **Language:** Node.js (JavaScript)
- **Discord API:** discord.js v14
- **AI Model:** Google Gemini 2.5 Flash
- **File Processing:** Native Gemini file handling
- **Hosting:** Render.com (Free tier)
- **Monitoring:** UptimeRobot + Render Health Checks

## 📦 Dependencies
```json
{
  "discord.js": "^14.14.1",
  "@google/generative-ai": "^0.21.0",
  "dotenv": "^16.3.1",
  "node-fetch": "^2.7.0"
}
```

## 🚀 Setup

### Prerequisites
- Node.js 18 or higher
- Discord account
- Google AI Studio account (for Gemini API)

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/coolsumesh/sumorobo-discord-bot.git
   cd sumorobo-discord-bot
```

2. **Install dependencies**
```bash
   npm install
```

3. **Set up environment variables**
   
   Create `.env` file for production:
```env
   DISCORD_TOKEN=your_discord_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   CLIENT_ID=your_bot_application_id
```

   Create `.env.dev` file for development:
```env
   DISCORD_TOKEN=your_dev_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   CLIENT_ID=your_dev_bot_application_id
```

4. **Register slash commands**
```bash
   # For development bot
   npm run register:dev
   
   # For production bot
   npm run register:prod
```

5. **Run the bot**
```bash
   # Development
   npm run dev
   
   # Production
   npm start
```

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** tab and create a bot
4. Enable **Message Content Intent** under Privileged Gateway Intents
5. Copy the bot token
6. Go to **OAuth2 → URL Generator**
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Read Message History`
7. Use the generated URL to invite the bot to your server

### Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the API key
4. Add to your `.env` file

## 🌐 Deployment (Render)

### Prerequisites
- GitHub account
- Render account (free tier)

### Steps

1. **Push code to GitHub**
```bash
   git add .
   git commit -m "Initial commit"
   git push
```

2. **Deploy on Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click **"New +" → "Web Service"**
   - Connect your GitHub repository
   - Configure:
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Instance Type:** Free
   - Add environment variables:
     - `DISCORD_TOKEN`
     - `GEMINI_API_KEY`
     - `CLIENT_ID`
   - Click **"Create Web Service"**

3. **Set up health checks** (in Render Settings)
   - **Health Check Path:** `/`
   - Render will auto-restart if service becomes unhealthy

4. **Keep bot awake** (prevent free tier spin-down)
   - Go to [UptimeRobot](https://uptimerobot.com)
   - Add monitor with your Render URL
   - Check interval: 5 minutes

## 📊 Monitoring

- **Status Page:** https://stats.uptimerobot.com/svhTjEciNu
- **Render Dashboard:** Check logs and deployments
- **Health Check:** `https://sumorobo-discord-bot.onrender.com/` should return "SumoRobo Bot is running!"

## 🎯 Usage Examples

### Basic Questions
```
/ask What is Python?
.ask Explain quantum physics
What is JavaScript? (question mark auto-invokes the bot)
```

### Real-Time Information (Auto Web Search)
```
/ask Who is the current president of US?
.ask Latest news about SpaceX
What's the weather in New York today? (green embed indicates web search)
```

### Persistent Web Search
```
User: .ask What is the price of gold today?
Bot: [Green embed with web search results]
User: What about in AUD? (automatically continues with web search)
Bot: [Green embed with AUD price]
```

### File Analysis
Upload a PDF/Word/Image and type:
```
.ask What is this document about?
.ask Summarize this PDF
What's in this image?
```

### Message Analysis
```
# Reply to a message with .analyse
User A: [Shares a complex message or document]
User B: .analyse (replies to User A's message)
Bot: [Analyzes the message/document]

# Or let it auto-analyze the previous message
User: [Sends a message]
User: .analyse (bot analyzes the previous message automatically)
Bot: [Provides analysis]
User: Can you elaborate? (continues the conversation with context)
```

### Language Learning (L2/L3 Context)
```
User: .ask Help me with my L2 Pick the Words activity
Bot: [Provides help with Tamil language activity]

User: What homework do I have for L3?
Bot: [Understands L3 = Hindi and responds accordingly]
```

### Auto School Message Copying
```
# Messages in any channel with school-related keywords are automatically copied to #school
User (in #general): Don't forget about the L2 homework due tomorrow!
Bot: [Silently copies message to #school channel with orange embed]

User (in #random): Can someone help with the math assignment?
Bot: [Auto-copies to #school with author info and jump link]

# The copied message shows:
- Original author and avatar
- Full message content
- Source channel name
- Jump link to original
- Any attachments (with image preview)
```

### Conversation Follow-ups
```
User: .ask What is Python?
Bot: [Explains Python]
User: What are its main uses?
Bot: [Remembers context and answers about Python's uses]
```

## 🏗️ Project Structure
```
sumorobo-discord-bot/
├── index.js                 # Main bot file
├── register-commands.js     # Slash command registration
├── package.json            # Dependencies and scripts
├── .env                    # Production environment variables (not in git)
├── .env.dev               # Development environment variables (not in git)
├── .env.prod              # Production environment template (not in git)
├── .gitignore             # Git ignore file
└── README.md              # This file
```

## 🔧 Development

### Available Scripts
```bash
npm run dev           # Run development bot
npm run prod          # Run production bot
npm run register:dev  # Register commands for dev bot
npm run register:prod # Register commands for prod bot
```

### Environment Files

- `.env` - Production bot configuration
- `.env.dev` - Development bot configuration
- `.env.prod` - Production environment template

### Two-Bot Setup

The project supports separate development and production bots:
- **Dev bot** - For testing new features locally
- **Prod bot** - Deployed on Render, always online

## 📝 Configuration

### Supported File Types

- **Documents:** PDF, Word (.docx), Text, Markdown, CSV, JSON, XML, HTML
- **Images:** JPG, PNG, GIF, WebP, BMP
- **Audio:** MP3, WAV, M4A
- **Video:** MP4, MOV, AVI

### Language Learning Context

The bot has built-in understanding of educational language subject designations:
- **L2** = Tamil (Tamil language subject)
- **L3** = Hindi (Hindi language subject)

This context is automatically applied to all conversations, so when teachers or students mention "L2 assignment" or "L3 homework", the bot understands which language subject is being referenced.

### Auto Web Search Keywords

Bot automatically searches the web when questions contain:
- `current`, `latest`, `recent`, `today`, `now`
- `2025`, `2026`, `2027`, `news`, `weather`
- `stock`, `price`, `who won`, `what happened`

### Web Search Persistence

Once a query triggers web search (either automatically or manually), follow-up questions in the same channel will continue using web search mode until:
- Conversation moves to a completely different topic
- User clears conversation history with `.clear`

### Auto School Message Copying

The bot automatically monitors all messages and copies school-related content to a channel named "school":

**How it works:**
- Detects messages containing school-related keywords
- Automatically copies them to the #school channel
- Does not copy messages already in the school channel
- Works silently in the background

**School-related keywords detected:**
- `homework`, `assignment`, `test`, `exam`, `quiz`, `study`
- `class`, `teacher`, `school`, `subject`
- `l2`, `l3`, `tamil`, `hindi`, `math`, `science`, `english`
- `chapter`, `lesson`, `textbook`, `notebook`
- `project`, `presentation`, `worksheet`, `practice`
- `due date`, `submit`, `submission`, `grade`, `marks`
- And more educational terms

**Setup requirements:**
- Create a Discord channel named "school" (case-insensitive)
- Bot will automatically find and use this channel
- No additional configuration needed

### Rate Limits

- **Gemini API:** 15 requests/minute, 1M tokens/day (free tier)
- **Discord:** Standard rate limits apply
- **File size limit:** 20MB per file

## 🐛 Troubleshooting

### Bot not responding
- Check if bot is online (green dot in Discord)
- Verify **Message Content Intent** is enabled in Developer Portal
- Check Render logs for errors
- Restart Discord (`Ctrl + R`)

### Health check failing
- Visit `https://your-app.onrender.com/` - should show "SumoRobo Bot is running!"
- Check Render logs for errors
- Verify bot process is running

### Commands not appearing
- Slash commands take 5-10 minutes to propagate
- Try restarting Discord
- Re-run `npm run register:prod` if needed

## 💰 Cost

**Free tier includes:**
- Render: Free (with 400 build hours/month)
- Google Gemini API: Free (15 req/min, 1M tokens/day)
- Discord Bot: Free
- UptimeRobot: Free (50 monitors, 5-min checks)

**Total: $0/month**

**Optional upgrades:**
- Render Starter: $7/month (no spin-down, better resources)
- UptimeRobot Pro: $7/month (webhooks, 1-min checks)

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📄 License

MIT License

## 🙏 Acknowledgments

- Built with [discord.js](https://discord.js.org/)
- Powered by [Google Gemini](https://ai.google.dev/)
- Hosted on [Render](https://render.com/)

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Uptime:** ~99.5%