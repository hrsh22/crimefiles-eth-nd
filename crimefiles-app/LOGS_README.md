# 🔍 CrimeFiles Logging Guide

This guide explains how to understand the comprehensive logging system in your CrimeFiles application. With proper logging, you can trace the entire flow from user input to LLM response.

## 🚀 Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser** to the chat interface

3. **Watch the logs** in real-time using:
   ```bash
   npm run logs
   ```
   Or manually:
   ```bash
   tail -f ~/.npm/_logs/*.log
   ```

4. **Interact with suspects** and watch the detailed logs appear

## 📊 Log Structure

The logs are organized with emojis and structured information to make them easy to follow:

### 🎯 Log Categories

- **💬 Chat Messages** - User input and requests
- **🔍 Database Operations** - Thread and message storage
- **🤖 LLM Operations** - ASI:One API calls
- **📋 Context Building** - System prompts and message history
- **⚠️ Warnings** - Non-fatal issues
- **❌ Errors** - Problems that need attention

### ⏱️ Timing Information

All major operations include timing information:
- Request start times (ISO format)
- Operation durations in milliseconds
- Total request duration

## 🔄 Complete Flow (Step by Step)

Here's what happens when you send a message to a suspect:

### 1. User Input Received
```
💬 Chat Message Received:
  🕐 Started at: 2025-01-26T21:05:23.123Z
  👤 User Address: 0x1234...abcd
  📁 Case ID: DLI-MUR-2025-0923
  🕵️ Suspect ID: s1
  💬 User Message: "What do you know about the murder weapon?"
```

### 2. Thread Resolution
```
🔎 Processing chat request...
🔍 DB: Looking for existing thread...
  👤 User: 0x1234...abcd
  📁 Case: DLI-MUR-2025-0923
  🕵️ Suspect: s1
✅ DB: Found existing thread
  🆔 Thread ID: abc-123-def-456
  📊 Status: open
```

### 3. Message Storage
```
💾 DB: Inserting message...
  🆔 Message ID: msg-789-xyz
  🔗 Thread ID: abc-123-def-456
  👤 Role: user
  📝 Content Length: 45 characters
  ⏰ Created: 2025-01-26T21:05:23.456Z
✅ DB: Message inserted successfully
```

### 4. Context Building
```
🔧 Building LLM Context...
📋 Context Information:
  📚 Case File: Found
  🕵️ Suspect: Isha Kapoor
  📝 Previous Messages: 2
📜 System Prompt Generated:
  📏 Length: 1247 characters
  👀 Preview: You are Isha Kapoor, a 38-year-old Socialite involved in the case...
📚 Building Message History:
  ➕ USER: do you have any alibi (26/9/2025, 9:03:26 pm)
  ➕ ASSISTANT: (A measured, cool stare) Hello. I suppose you're h... (26/9/2025, 9:02:48 pm)
📊 Total Messages for LLM: 3
  🧠 System Messages: 1
  👤 User Messages: 2
  🤖 Assistant Messages: 1
```

### 5. LLM Request
```
🤖 LLM Request Details:
  📍 Endpoint: https://api.asi1.ai/v1/chat/completions
  🧠 Model: asi1-mini
  🌡️ Temperature: 0.6
  💬 Message Count: 3
    1. [SYSTEM  ] You are Isha Kapoor, a 38-year-old Socialite involved...
    2. [USER    ] do you have any alibi
    3. [ASSISTANT] (A measured, cool stare) Hello. I suppose you're h...
🚀 Sending request to ASI:One...
```

### 6. LLM Response
```
📡 Response received in 1250ms (Status: 200)
✅ LLM Response Details:
  📏 Response Length: 156 characters
  👀 Response Preview: My staff can confirm I was home all evening. Though I was...
📊 Token Usage: { prompt: 1456, completion: 78, total: 1534 }
```

### 7. Response Storage & Return
```
💾 DB: Inserting message...
  🆔 Message ID: msg-999-xyz
  🔗 Thread ID: abc-123-def-456
  👤 Role: assistant
  📝 Content Length: 156 characters
  ⏰ Created: 2025-01-26T21:05:24.789Z
✅ DB: Message inserted successfully
📤 Returning Response:
  🆔 Thread ID: abc-123-def-456
  📏 Response Length: 156
  ⏱️ Total Request Duration: 1350ms
```

## 🔍 Database Operations

### Thread Operations
- **getOrCreateOpenThread()** - Finds existing or creates new thread
- **getOpenThreadWithMessages()** - Retrieves thread with all messages
- **closeThread()** - Marks thread as closed

### Message Operations
- **insertMessage()** - Stores new messages
- **listMessages()** - Retrieves all messages for a thread

## ⚠️ Error Handling

If something goes wrong, you'll see detailed error logs:

```
💥 Chat Request Failed:
  ⏱️ Duration: 450ms
  Error: ASI:One API Error: Invalid API key
  🔍 Error Stack: Error: ASI:One API Error: Invalid API key
    at createAsiOneProvider (/path/to/provider.ts:78:15)
    at getLlmProvider (/path/to/llm.ts:15:20)
    ...
```

## 📈 Performance Monitoring

All operations include timing information:
- **Database operations** - Thread lookup, message insertion
- **LLM calls** - Request duration, token usage
- **Total request** - End-to-end duration

## 🔧 Configuration

### Environment Variables
Make sure these are set in your `.env.local`:
```bash
ASI_ONE_BASE_URL=https://api.asi1.ai
ASI_ONE_API_KEY=your_api_key_here
```

### Log Level
Currently using `console.log` for info and `console.error` for errors. You can adjust log levels by modifying the logging calls.

## 📱 Frontend Integration

The frontend also has some logging, but the main flow is visible in the server-side logs. You can see:
- When the frontend makes API calls
- What data is being sent
- How the UI updates based on responses

## 🛠️ Debugging Tips

1. **Empty Responses?** Check if the system prompt is being generated correctly
2. **Slow Responses?** Look at the timing information to identify bottlenecks
3. **API Errors?** Check your ASI:One credentials and network connectivity
4. **Database Issues?** Verify the SQLite file exists and is accessible

## 🎯 Key Metrics to Monitor

- **Response Time** - Should be under 3 seconds for good UX
- **Token Usage** - Track API costs
- **Error Rate** - Should be very low in production
- **Database Size** - Monitor growth over time

With this logging system, you can trace every step of the suspect interrogation process and quickly identify any issues or performance bottlenecks!
