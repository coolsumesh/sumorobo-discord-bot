# SumoRobo Discord Bot

A powerful AI-powered Discord bot built with Google Gemini, featuring intelligent conversation, real-time web search, and multi-format file analysis.

## 🌟 Features

### AI Capabilities
- **Intelligent Conversations** - Powered by Google's Gemini AI model (always the latest Flash release, via the `gemini-flash-latest` alias)
- **Automatic Web Search** - Detects when questions need current information and searches the web automatically
- **Persistent Web Search** - Follow-up questions maintain web search mode for continuous real-time information
- **Conversation Memory** - Remembers context within each Discord channel for natural follow-up questions
- **Multi-Format File Support** - Analyze PDFs, Word documents, images, text files, and more
- **Subject Designation Context** - Optional built-in understanding of however your child's school labels subjects (L2/L3 or anything else), configured per family via the `subjects` array in `config.json` (leave it empty if your school doesn't use this kind of labeling)
- **Discord-Friendly Formatting** - Math and exponents (e.g. 10¹⁰) render as clean text/Unicode instead of raw LaTeX, since Discord doesn't support LaTeX rendering

### Commands
- `/ask [question]` or `.ask [question]` - Ask the AI a question
- `.analyse` or `.analyze` - Analyze a message (reply to a message or automatically analyzes the previous message)
- `.clear` - Clear conversation history and web search mode for the current channel
- `/ping` or `!ping` - Check bot status and version information
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
- **AI Model:** Google Gemini (`gemini-flash-latest` alias, always the current Flash release)
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

### Discord Server Setup

If you don't already have a Discord account/server for your family, start here.

1. Go to [discord.com](https://discord.com) and create a free account (or download the desktop/mobile app — either works)
2. Create a server: click the **+** icon in the left sidebar → **Create My Own** → give it a name (e.g. "Our Family")
3. Create the channels the bot uses: right-click **TEXT CHANNELS** in your server's sidebar → **Create Channel** → name it `school` (a place where school-related messages get collected)
4. Optionally repeat step 3 to create a `bot_test` channel (a private space for you to test bot commands — see the note about hiding it from kids further below)
5. Invite your kids/family to the server: click the server name → **Invite People**, and share the invite link

### Discord Bot Setup

Do this first — you'll need the values it gives you (`CLIENT_ID`, `DISCORD_TOKEN`) for the Installation steps below.

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. On the **General Information** tab, copy the **Application ID** — this is your `CLIENT_ID`
4. Go to **Bot** tab and create a bot
5. Enable **Message Content Intent** under Privileged Gateway Intents
6. Copy the bot token — this is your `DISCORD_TOKEN`
7. Go to **OAuth2 → URL Generator**
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Read Message History`
8. Use the generated URL to invite the bot to your server

### Gemini API Setup

Also do this first — you'll need the key (`GEMINI_API_KEY`) for the Installation steps below.

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the API key

### Installation

By now you should have your `CLIENT_ID`, `DISCORD_TOKEN`, and `GEMINI_API_KEY` from the two sections above.

1. **Get your own copy of the repository**

   Click **"Fork"** at the top of this repo on GitHub to create your own copy under your account. You'll need this because deploying to Render (below) connects to a GitHub repo you own, and `git push` only works on a repo you have write access to.

   Then clone your fork:
```bash
   git clone https://github.com/YOUR_USERNAME/sumorobo-discord-bot.git
   cd sumorobo-discord-bot
```

2. **Install dependencies**
```bash
   npm install
```

3. **Set up environment variables** (credentials only — see step 4 for everything else)

   Create `.env` file for production:
```env
   DISCORD_TOKEN=your_discord_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   CLIENT_ID=your_bot_application_id
   GEMINI_API_KEY_FREE=your_free_tier_gemini_api_key   # optional, see Cost section
```

   Create `.env.dev` file for development:
```env
   DISCORD_TOKEN=your_dev_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   CLIENT_ID=your_dev_bot_application_id
```

4. **Edit `config.json`** for non-sensitive settings (channel names, subject designations, keywords)
```json
   {
     "schoolChannelName": "school",
     "botTestChannelName": "bot_test",
     "subjects": [
       { "designation": "L2", "name": "Spanish", "description": "second language subject in school" }
     ],
     "schoolKeywords": ["homework", "assignment", "..."]
   }
```
   - `schoolChannelName` / `botTestChannelName` - rename these if your server uses different channel names
   - `subjects` - a list of however your school labels subjects in assignments. Each entry needs:
     - `designation` - the label your school actually uses (e.g. `"L2"`, `"Second Language"`, `"Elective 1"` — whatever your teachers write)
     - `name` - the real subject (e.g. `"Spanish"`)
     - `description` - how to explain it to the bot (e.g. `"second language subject in school"`) — not limited to languages, describe it however fits your curriculum

     Add as many entries as you need, or leave the array empty (`[]`) if your school doesn't use designations like this at all.
   - `schoolKeywords` - the list of words that trigger auto-copying a message to your school channel; add or remove freely

5. **Register slash commands**

   Not comfortable with the terminal? Double-click **`register-commands.bat`** (Windows) or **`register-commands.command`** (Mac) instead — it does the same thing as the commands below, using your `.env` file. (On Mac, right-click → Open the first time, since it's from an unidentified developer.)
```bash
   # For development bot
   npm run register:dev
   
   # For production bot
   npm run register:prod
```

6. **Run the bot**
```bash
   # Development
   npm run dev
   
   # Production
   npm start
```

## 🌐 Deployment (Render)

### Prerequisites
- GitHub account
- Render account (free tier)

### Steps

1. **Push code to GitHub** (make sure your `config.json` edits from step 4 above are committed — that's how Render picks up your channel names/subjects, there's no env var for these)
```bash
   git add .
   git commit -m "Configure for my server"
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
   - Add environment variables (credentials only — everything else comes from `config.json` in your repo):
     - `DISCORD_TOKEN` (required)
     - `GEMINI_API_KEY` (required)
     - `CLIENT_ID` (required)
     - `GEMINI_API_KEY_FREE` (optional — see Cost section)
   - Click **"Create Web Service"**

3. **Set up health checks** (in Render Settings)
   - **Health Check Path:** `/`
   - Render will auto-restart if service becomes unhealthy

4. **Keep bot awake** (prevent free tier spin-down)
   - Go to [UptimeRobot](https://uptimerobot.com)
   - Add monitor with your Render URL
   - Check interval: 5 minutes

## 📊 Monitoring

- **Status Page:** If you set up UptimeRobot with a public status page, its URL goes here
- **Render Dashboard:** Check logs and deployments
- **Health Check:** `https://your-app-name.onrender.com/` should return "SumoRobo Bot is running!"

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

### Subject Designation Context (example using L2/L3 designations)
```
User: .ask Help me with my L2 Pick the Words activity
Bot: [Provides help with your configured L2 subject]

User: What homework do I have for L3?
Bot: [Understands L3 = your configured L3 subject and responds accordingly]
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
├── register-commands.bat    # Windows double-click wrapper to register commands
├── register-commands.command # Mac double-click wrapper to register commands
├── config.json             # Non-sensitive settings: channel names, subject designations, keywords
├── package.json            # Dependencies and scripts
├── .env                    # Production environment variables - credentials only (not in git)
├── .env.dev               # Development environment variables - credentials only (not in git)
├── .gitignore             # Git ignore file
└── README.md              # This file
```

## 🔧 Development

### Available Scripts
```bash
npm run dev           # Run development bot (uses .env.dev)
npm run prod          # Run production bot locally (uses .env)
npm run register:dev  # Register commands for dev bot (uses .env.dev)
npm run register:prod # Register commands for prod bot (uses .env)
```

### Environment Files

- `.env` - Production bot configuration, used for local production testing and by `register-commands.bat`/`.command`. Render itself doesn't read this file — it uses the environment variables you set in its dashboard instead, which should hold the same values.
- `.env.dev` - Development bot configuration

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

### Subject Designation Context

The bot optionally understands however your child's school labels subjects in assignments, set via the `subjects` array in `config.json`. Each entry has:
- `designation` - the label your school actually uses (e.g. `"L2"`, `"Second Language"`, `"Elective 1"`) — not limited to "L2"/"L3", use whatever your teachers write
- `name` - the real subject (e.g. `"Spanish"`, `"Tamil"`)
- `description` - how to explain it to the bot (e.g. `"second language subject in school"`) — not limited to languages, describe it however fits your curriculum

Add one entry per designation your school uses, or leave the array empty if it doesn't use this kind of labeling at all — the bot works fine either way. When configured, this context is automatically applied to all conversations, so when teachers or students mention "L2 assignment" (or whatever your configured designation is), the bot understands which subject is being referenced.

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

The full list lives in `schoolKeywords` in `config.json` — add or remove words freely, no code changes needed. Out of the box it includes things like `homework`, `assignment`, `test`, `exam`, `quiz`, `study`, `class`, `teacher`, `school`, `subject`, `chapter`, `lesson`, `textbook`, `project`, `worksheet`, `due date`, `submit`, `grade`, and more. Each configured entry in `subjects` (both its `designation` and `name`) is automatically added on top of this list.

**Setup requirements:**
- Create a Discord channel named "school" (case-insensitive), or set `schoolChannelName` in `config.json` to whatever you named it
- Bot will automatically find and use this channel
- No additional configuration needed
- Optional: create a channel named "bot_test" (or set `botTestChannelName` in `config.json`) for testing the bot without triggering auto-copies to your school channel
  - Consider setting this channel's permissions so only you (the parent/admin) can view it — that way it stays a private space for testing bot commands without kids seeing it or being tempted to use it instead of the real channels

### Rate Limits

- **Gemini API:** Free-tier request/token limits depend on whatever model `gemini-flash-latest` currently resolves to, and change over time — check [Google's current rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) rather than relying on a number here. This is exactly why `GEMINI_API_KEY_FREE` (see Cost section) exists — a paid fallback key absorbs whatever the free tier's limit turns out to be.
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
- Google Gemini API: Free, up to whatever [Google's current free-tier limits](https://ai.google.dev/gemini-api/docs/rate-limits) are for the active model — see Rate Limits below
- Discord Bot: Free
- UptimeRobot: Free (50 monitors, 5-min checks)

**Total: $0/month**

**Optional upgrades:**
- Render Starter: $7/month (no spin-down, better resources)
- UptimeRobot Pro: $7/month (webhooks, 1-min checks)

**Free + paid Gemini key fallback:**
Set `GEMINI_API_KEY_FREE` to a second Gemini API key from a separate, billing-free Google account/project. The bot tries that key first for every AI request, and only falls back to the paid `GEMINI_API_KEY` if the free key hits its rate/quota limit — invisible to Discord users. This keeps day-to-day usage free and only incurs cost during heavy usage bursts.

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

**Status:** ✅ Production Ready | **Version:** 2.2.0