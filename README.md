# Unify 🛍️

**Unify** is a simple, smart inbox for thrift store and boutique owners. It collects incoming messages from social media (Instagram, Facebook Messenger, WhatsApp), sorts them using Google's **Gemma 4** AI, drafts warm retail replies, and helps you schedule when to send them.

---

## What It Does

1. **Collects Messages in One Place**: View inquiries from Instagram DMs, Facebook, and WhatsApp without switching between apps.
2. **Sorts Automatically**: Gemma 4 identifies what customers want (e.g., Hold Requests, Availability Checks, Sizing & Measurements, Consignment).
3. **Drafts Polite Store Replies**: Generates friendly boutique-style answers in seconds.
4. **Schedules Your Sends**: Send immediately or schedule for shop opening (e.g., 9:30 AM before doors open).
5. **Switchable AI Engine**:
   - **Cloud API**: Uses Google AI Studio Gemma 4 (`gemma-4-26b-a4b-it`).
   - **Local Fallback**: Uses local Ollama (`gemma4:e2b`) without any internet needed.

---

## Quick Setup

### 1. Copy Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` and configure your chosen provider.

---

## Option 1: Run with Google AI Studio (Cloud API)

1. Get your free API key from [Google AI Studio](https://aistudio.google.com/).
2. In `.env`:
   ```env
   PROVIDER=api
   GEMINI_API_KEY="your-actual-api-key-here"
   GEMMA_API_MODEL="gemma-4-26b-a4b-it"
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
4. Open your browser at: `http://localhost:3000`

---

## Option 2: Run with Ollama (Local & Free)

If you have [Ollama](https://ollama.com/) installed on your computer:

1. Download and start Gemma 4 locally:
   ```bash
   ollama run gemma4:e2b
   ```
2. In `.env`:
   ```env
   PROVIDER=local
   OLLAMA_ENDPOINT="http://localhost:11434"
   OLLAMA_MODEL="gemma4:e2b"
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
4. Open your browser at: `http://localhost:3000`

---

## Run the Smoke Test

To verify that your active provider (API or Ollama) is working properly, run:

```bash
npm run test:smoke
```

- If everything connects and responds properly, it prints **PASS**.
- If there is an issue (e.g., missing key or Ollama not running), it prints **FAIL** with an easy-to-read explanation.

You can also click the **"Smoke Test"** button directly inside the app's top bar!

---

## Project Structure

- `server/provider.ts` - Unified Gemma 4 engine (switches between Google API & Ollama).
- `server/api.ts` - Backend endpoints for triage and smoke tests.
- `src/App.tsx` - Clean, responsive single-page inbox and reply composer.
- `scripts/smoke-test.mjs` - Standalone smoke test script.
- `.env.example` - Template for your settings.
