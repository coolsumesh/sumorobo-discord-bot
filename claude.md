# Claude.md - SumoRobo Discord Bot

This file provides context for AI assistants (like Claude) working on this project.

## Project Overview

**Name:** SumoRobo Discord Bot
**Version:** 2.0.0
**Purpose:** Educational AI-powered Discord bot with intelligent conversation, web search, and file analysis
**Tech Stack:** Node.js, discord.js v14, Google Gemini 2.5 Flash
**Deployment:** Render.com (Free tier)

## Core Architecture

### Entry Point
- `index.js` - Main bot file (~450 lines)
- `register-commands.js` - Slash command registration

### Key Dependencies
```json
{
  "discord.js": "^14.14.1",        // Discord API
  "@google/generative-ai": "^0.21.0", // Gemini AI
  "dotenv": "^16.3.1",             // Environment config
  "node-fetch": "^2.7.0"           // HTTP requests
}
```

### Environment Files
- `.env` - Production configuration
- `.env.dev` - Development configuration
- `.env.prod` - Production template

**Required Variables:**
- `DISCORD_TOKEN` - Discord bot token
- `GEMINI_API_KEY` - Google Gemini API key
- `CLIENT_ID` - Discord application ID

## Code Architecture

### State Management (index.js)

```javascript
// Lines 34-40
const conversationHistory = new Map();  // Per-channel conversation context
const lastUsedWebSearch = new Map();    // Per-channel web search persistence
let schoolChannelId = null;             // Cached school channel ID
```

### System Context (Lines 43-54)

Educational context injected into all AI conversations:
- **L2 = Tamil** (language subject)
- **L3 = Hindi** (language subject)

This context is prepended to every Gemini API call to maintain educational assistant behavior.

### Core Functions

#### 1. `handleAIQuestion(question, channelId, replyFunction, fileData)` (Lines 144-303)
Main AI interaction handler with three execution paths:

**Path A: File Analysis** (Lines 147-186)
- Uses `handleFileWithGemini()` for file processing
- Supports PDFs, images, documents, audio, video
- Base64 encoding for Gemini inline data
- Clears web search flag

**Path B: Web Search** (Lines 188-250)
- Triggered by real-time keywords OR previous web search
- Uses Gemini with `googleSearch` tool
- Persistent mode: follow-ups inherit web search
- Green embed (0x00FF00)

**Path C: Regular Conversation** (Lines 252-296)
- Uses conversation history
- Maintains context across messages
- Blue embed (0x5865F2)

#### 2. `handleFileWithGemini(fileUrl, fileName, question)` (Lines 172-206)
- Fetches file from Discord CDN
- Converts to base64
- Determines MIME type via `getMimeType()`
- Sends to Gemini with system context

#### 3. `isSchoolRelated(message)` (Lines 96-107)
Keyword detection for auto-copying to school channel:
- 25+ educational keywords
- Case-insensitive matching
- Returns boolean

#### 4. `copyToSchoolChannel(message, client)` (Lines 110-170)
- Finds/caches school channel by name
- Creates orange embed (0xFFA500)
- Includes author, content, source channel, jump link
- Handles image attachments

#### 5. `needsRealTimeInfo(question)` (Lines 83-93)
Real-time keyword detection:
- Date-related: "today", "latest", "current", "2025", etc.
- Dynamic content: "news", "weather", "stock price"
- Event-related: "who won", "what happened"

### Message Handlers

#### Slash Commands (Lines 424-470)
- `/ping` - Version info embed
- `/hello` - Simple greeting
- `/ask` - AI question with deferred reply

#### Text Commands (Lines 481-449)
- `!ping` - Version info embed
- `!hello` - Simple greeting
- `.clear` - Clear conversation history + web search flag
- `.analyse` / `.analyze` - Analyze replied or previous message
- `.ask [question]` - AI question
- `[message ending with ?]` - Auto-invoke AI

### Auto-Features (Lines 279-282)

**School Message Copying:**
Runs silently on every non-bot message before command processing.

**Question Mark Trigger:**
Messages ending with `?` automatically invoke AI (Lines 423-448).

## Important Patterns

### 1. Conversation History Management
- Stored per-channel in Map
- Limited to last 20 messages (10 exchanges)
- Initialized with SYSTEM_CONTEXT
- Model response included for context continuity

### 2. Web Search Persistence
```javascript
// Initial query triggers web search
directlyNeedsWebSearch = true
lastUsedWebSearch.set(channelId, true)

// Follow-up inherits web search mode
previousUsedWebSearch = lastUsedWebSearch.get(channelId)
useWebSearch = directlyNeedsWebSearch || previousUsedWebSearch
```

### 3. Embed Color Coding
- 🔵 Blue (0x5865F2) - Knowledge base / regular AI
- 🟢 Green (0x00FF00) - Web search used / ping status
- 🟠 Orange (0xFFA500) - School-related auto-copy

### 4. File Size Limits
- Discord: 20MB per file
- Response length: 3900 chars (truncated with '...')
- Gemini prompt: includes 3500 char target

### 5. Error Handling
- Try-catch blocks around all async operations
- User-friendly error messages
- Console logging for debugging
- Graceful degradation (e.g., school channel not found)

## Key Behaviors

### Auto School Message Copying
1. Runs on EVERY message (before commands)
2. Skips if already in school channel
3. Silent operation (no user notification)
4. Lazy-loads school channel ID
5. Handles missing channel gracefully

### Conversation Context Initialization
Every path initializes history with:
```javascript
[
  { role: 'user', parts: [{ text: SYSTEM_CONTEXT }] },
  { role: 'model', parts: [{ text: 'Understood! I will remember...' }] }
]
```

### Message Analysis (.analyse)
1. Checks for replied message first
2. Falls back to previous message
3. Skips bot's own messages
4. Initializes conversation history
5. Supports file attachments in analyzed message

## Common Gotchas

### 1. Message Content Intent
**CRITICAL:** Bot requires `MessageContent` intent in Discord Developer Portal.
Without it, message.content will be empty.

### 2. Web Search Flag Management
- NOT cleared on regular conversation (sticky mode)
- Only cleared on file analysis
- Cleared on `.clear` command
- Allows natural follow-up flow

### 3. MIME Type Detection
Uses file extension, not Content-Type header.
Supports: images, documents, audio, video.

### 4. Gemini API Rate Limits
- Free tier: 15 requests/minute
- 1M tokens/day
- No retry logic implemented

### 5. Channel Name Matching
School channel detection is case-insensitive:
```javascript
ch.name.toLowerCase() === 'school'
```

## Development Workflow

### Running Locally
```bash
npm run dev          # Uses .env.dev
npm run prod         # Uses .env.prod
npm start            # Uses .env (default)
```

### Registering Commands
```bash
npm run register:dev   # Register to dev bot
npm run register:prod  # Register to prod bot
```

### Testing
- No automated tests currently
- Manual testing in Discord
- Dev/Prod bot separation recommended

## Deployment (Render)

### Auto-Deploy
- Pushes to `main` branch trigger deployment
- ~2-5 minute deployment time
- Health check: HTTP server on PORT (default 3000)

### Health Check
```javascript
http.createServer((req, res) => {
  res.end('SumoRobo Bot is running!');
}).listen(PORT);
```

### Environment Variables (Render)
Set in Render dashboard:
- `DISCORD_TOKEN`
- `GEMINI_API_KEY`
- `CLIENT_ID`

## Future Considerations

### Potential Improvements
1. **Database Integration** - Persistent conversation history
2. **User Preferences** - Per-user L2/L3 mappings
3. **Analytics** - Usage tracking, popular queries
4. **Rate Limiting** - Per-user command throttling
5. **Error Retry** - Exponential backoff for API failures
6. **Custom School Channels** - Multi-channel mapping
7. **Webhook Logging** - Centralized error reporting

### Known Limitations
1. Conversation history lost on restart
2. School channel must be named "school"
3. No database (all state in-memory)
4. Single L2/L3 mapping for all users
5. No message pagination for long responses
6. Web search flag never auto-clears on topic change

## Contributing Guidelines

### Code Style
- Use async/await (not promises)
- Add comments for complex logic
- Keep functions focused (single responsibility)
- Use descriptive variable names

### Adding Features
1. **Update index.js** with new functionality
2. **Update README.md** with usage examples
3. **Update this claude.md** with architecture notes
4. **Bump version** in package.json
5. **Test locally** with dev bot
6. **Commit with descriptive message**
7. **Push to trigger deployment**

### Git Commit Format
```
<action> <feature description>

- Detailed change 1
- Detailed change 2
- Technical notes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Important Files

### Do Not Commit
- `.env`, `.env.dev`, `.env.prod` - Contains secrets
- `node_modules/` - Dependencies

### Must Commit
- `index.js` - Main bot logic
- `register-commands.js` - Command registration
- `package.json` - Dependencies and version
- `README.md` - User documentation
- `claude.md` - This file (AI context)

## Quick Reference

### Version Information
- Displayed in `/ping` and `!ping` commands
- Sourced from `package.json`
- Update on major feature additions

### Color Codes
```javascript
0x5865F2  // Blue - Regular AI
0x00FF00  // Green - Web search / Status OK
0xFFA500  // Orange - School-related
```

### Character Limits
```javascript
3500  // Target response length
3900  // Hard truncation limit
20MB  // Max file size
```

### Command Prefixes
- `/` - Slash commands (Discord native)
- `.` - Text commands (bot-specific)
- `!` - Legacy commands (ping, hello)
- `?` - Auto-trigger (ends with question mark)

---

**Last Updated:** 2025-01-07
**Maintained By:** AI-assisted development (Claude)
**Primary Maintainer:** coolsumesh
