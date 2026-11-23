# Kai — Bilingual AI Chat Workspace

Kai is a responsive, full-stack AI chatbot powered by the official `@google/genai` SDK. It supports automatic English and Urdu (اردو) language detection with RTL/LTR rendering, Markdown and syntax-highlighted code blocks, persistent browser `localStorage` chat history with full CRUD management, light/dark themes, and conversation export.

## Features

- **Server-Side Gemini API Integration**: Streams responses via Server-Sent Events (`/api/chat`) using `@google/genai` (`gemini-4-hydrogen` and `gemini-3.1-flash-lite`) with graceful handling for rate limits, invalid keys, and stream cancellation (Stop Generating).
- **Bilingual English & Urdu Support**: Automatically detects English or Urdu input and responds in the same language, with automatic RTL/LTR layout switching and Urdu typography (`Noto Sans Arabic`).
- **Complete Chat CRUD in LocalStorage**: Create, read, search, inline-rename, delete individual chats, and clear all history with confirmation dialogs.
- **Markdown & Code Formatting**: GitHub-Flavored Markdown (`react-markdown` + `remark-gfm`), syntax highlighting (`highlight.js`), per-block copy buttons, copy message, and regenerate response.
- **Export & Customization**: Export any chat as `.txt` or `.json`, export all chats as `.json`, and customize theme (Light / Dark / System), model, response tone, and custom instructions in Settings.

## Installation & Local Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create a `.env.local` file for local development (ignored by Git) or set `GEMINI_API_KEY` in the **Settings > Secrets** panel in AI Studio:

   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000` in your browser.

4. **Build and run in production**

   ```bash
   npm run build
   npm start
   ```

## Project Structure

- `server.ts` — Express server with `/api/chat` (SSE streaming) and `/api/title` routes plus Vite middleware in development
- `src/lib/gemini.ts` — Server-side `@google/genai` client, bilingual system instructions, and API error mapping
- `src/lib/storage.ts` — Browser `localStorage` CRUD utilities, date grouping, RTL/LTR detection, and TXT/JSON export
- `src/lib/chatClient.ts` — Client-side SSE stream consumer with `AbortController` support
- `src/components/` — Modular React components (`Sidebar`, `ChatArea`, `MessageBubble`, `MarkdownRenderer`, `ChatInput`, `WelcomeScreen`, `SettingsModal`, `ConfirmDialog`)
- `src/types/chat.ts` — Shared TypeScript interfaces
