#!/usr/bin/env node

/**
 * Unify Gemma 4 Smoke Test
 * Sends a realistic boutique sample inquiry through the active provider (API or Ollama)
 * and prints PASS or FAIL.
 */

import dotenv from 'dotenv';
dotenv.config();

const provider = (process.env.PROVIDER || 'api').toLowerCase();
const gemmaModel = process.env.GEMMA_API_MODEL || 'gemma-4-26b-a4b-it';
const ollamaEndpoint = (process.env.OLLAMA_ENDPOINT || 'http://localhost:11434').replace(/\/$/, '');
const ollamaModel = process.env.OLLAMA_MODEL || 'gemma4:e2b';

const realisticSampleInput = {
  customerName: "Sarah Jenkins",
  channel: "Instagram DM",
  storeName: "Velvet & Thread Vintage Boutique",
  message: "Hi! Is that vintage 90s oversized leather trench coat you posted on your Instagram story still available? Can you please hold it for me until tomorrow afternoon? I can swing by after work around 3pm to try it on!",
};

console.log("==================================================");
console.log(" UNIFY GEMMA 4 SMOKE TEST");
console.log("==================================================");
console.log(`Active Provider: ${provider.toUpperCase()}`);
console.log(`Model ID:        ${provider === 'local' ? ollamaModel : gemmaModel}`);
console.log(`Sample Input:    "${realisticSampleInput.message}"`);
console.log("--------------------------------------------------");

const SYSTEM_PROMPT = `You are Unify AI for boutique and thrift store owners.
Analyze this social media customer message and return JSON with:
category (Hold Request, Availability Check, Pricing, Condition, Consignment, General),
urgency (High, Medium, Low),
summary (1 sentence),
suggestedReply (warm retail store owner draft),
recommendedSchedule (recommended send time),
actionItem (staff task),
tags (array of strings).`;

async function runApiTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not set or using placeholder. Set GEMINI_API_KEY in your .env file or environment.');
  }

  // Dynamic import of @google/genai SDK
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `${SYSTEM_PROMPT}\n\nCustomer: ${realisticSampleInput.customerName}\nStore: ${realisticSampleInput.storeName}\nMessage:\n"""\n${realisticSampleInput.message}\n"""`;

  console.log(`Calling Google AI Studio with model '${gemmaModel}'...`);
  const response = await ai.models.generateContent({
    model: gemmaModel,
    contents: prompt,
  });

  const text = response.text || '';
  if (!text.trim()) {
    throw new Error('Received empty response from Gemma 4 API.');
  }
  return text;
}

async function runLocalOllamaTest() {
  console.log(`Connecting to Ollama endpoint at ${ollamaEndpoint}/api/generate with model '${ollamaModel}'...`);
  const prompt = `${SYSTEM_PROMPT}\n\nCustomer: ${realisticSampleInput.customerName}\nStore: ${realisticSampleInput.storeName}\nMessage:\n"""\n${realisticSampleInput.message}\n"""`;

  const res = await fetch(`${ollamaEndpoint}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      prompt,
      stream: false,
      format: 'json',
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ollama returned HTTP ${res.status}: ${errText || res.statusText}`);
  }

  const data = await res.json();
  const text = data.response || '';
  if (!text.trim()) {
    throw new Error('Received empty response from Ollama.');
  }
  return text;
}

async function main() {
  try {
    let resultText = '';
    if (provider === 'local') {
      resultText = await runLocalOllamaTest();
    } else {
      resultText = await runApiTest();
    }

    console.log("\n--- Provider Raw Output ---");
    console.log(resultText.slice(0, 300) + (resultText.length > 300 ? '...' : ''));
    console.log("---------------------------\n");

    console.log("PASS");
    process.exit(0);
  } catch (err) {
    console.error("\n[Error Details]:", err.message || err);
    console.log("\nFAIL");
    process.exit(1);
  }
}

main();
