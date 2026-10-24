import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export interface MessageTriageInput {
  message: string;
  customerName?: string;
  channel?: 'instagram' | 'facebook' | 'whatsapp' | 'tiktok' | 'other';
  storeName?: string;
  tone?: 'friendly' | 'quick' | 'formal';
  additionalNotes?: string;
}

export interface MessageTriageResult {
  category: 'Hold Request' | 'Availability Check' | 'Pricing & Discount' | 'Condition & Sizing' | 'Consignment & Sell' | 'Store Hours & Location' | 'General';
  urgency: 'High' | 'Medium' | 'Low';
  summary: string;
  suggestedReply: string;
  recommendedSchedule: string;
  actionItem: string;
  tags: string[];
  providerUsed: 'api' | 'local';
  modelUsed: string;
  timestamp: string;
}

export function getActiveProviderConfig() {
  const provider = (process.env.PROVIDER || 'api').toLowerCase() as 'api' | 'local';
  const apiKey = process.env.GEMINI_API_KEY || '';
  const apiModel = process.env.GEMMA_API_MODEL || 'gemma-4-26b-a4b-it';
  const ollamaEndpoint = (process.env.OLLAMA_ENDPOINT || 'http://localhost:11434').replace(/\/$/, '');
  const ollamaModel = process.env.OLLAMA_MODEL || 'gemma4:e2b';

  return {
    provider,
    apiKeyConfigured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
    apiModel,
    ollamaEndpoint,
    ollamaModel,
  };
}

const SYSTEM_PROMPT = `You are "Unify AI", a retail assistant powered by Gemma 4 for boutique and thrift store owners.
Your job is to analyze incoming social media customer messages (Instagram, Facebook, WhatsApp) and:
1. Categorize the inquiry (Hold Request, Availability Check, Pricing & Discount, Condition & Sizing, Consignment & Sell, Store Hours & Location, General).
2. Rate the urgency (High, Medium, Low). Hold requests and item inquiries are usually High or Medium.
3. Provide a 1-sentence customer summary.
4. Draft a warm, courteous, authentic store owner reply. Include appropriate boutique tone (e.g., mention holding policy if relevant, thanking them for loving the piece, offering pickup instructions).
5. Suggest the best time to send (e.g., "Send now", "Schedule for tomorrow 9:30 AM before doors open").
6. Give a 1-phrase action item for store staff (e.g., "Check backroom for size M", "Pull item to hold counter").
7. Provide 2-4 hashtag-style tags.

You MUST respond strictly with valid JSON conforming to this structure:
{
  "category": "Hold Request",
  "urgency": "High",
  "summary": "Customer asking to hold a vintage coat until tomorrow afternoon.",
  "suggestedReply": "Hi Sarah! Yes, that 90s leather trench coat is still available! We'd love to hold it for you until 3 PM tomorrow. Just ask for Phil at the front desk when you arrive!",
  "recommendedSchedule": "Send now (holds are time-sensitive)",
  "actionItem": "Move vintage leather trench to the 24-hr hold rack behind counter",
  "tags": ["#HoldRequest", "#InstagramDM", "#VintageCoat"]
}`;

function buildUserPrompt(input: MessageTriageInput): string {
  const store = input.storeName || 'Velvet & Thread Boutique';
  const channel = input.channel || 'instagram';
  const customer = input.customerName || 'Customer';
  const tone = input.tone || 'friendly';

  return `Store Name: ${store}
Channel: ${channel.toUpperCase()}
Customer Name: ${customer}
Desired Tone: ${tone}
${input.additionalNotes ? `Extra Store Context: ${input.additionalNotes}\n` : ''}
Customer Message:
"""
${input.message}
"""

Analyze this message and return the JSON response.`;
}

function cleanAndParseJson(rawText: string, fallbackInput: MessageTriageInput): Omit<MessageTriageResult, 'providerUsed' | 'modelUsed' | 'timestamp'> {
  try {
    let clean = rawText.trim();
    // Strip markdown code fences if present
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    // Try finding JSON object boundaries
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(clean);
    return {
      category: parsed.category || 'General',
      urgency: parsed.urgency || 'Medium',
      summary: parsed.summary || 'Customer inquiry received',
      suggestedReply: parsed.suggestedReply || 'Thank you for your message! How can we help you today?',
      recommendedSchedule: parsed.recommendedSchedule || 'Send now',
      actionItem: parsed.actionItem || 'Review message and respond',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['#Message', '#Boutique'],
    };
  } catch {
    // Graceful extraction fallback if model returned plain text
    return {
      category: 'General',
      urgency: 'Medium',
      summary: rawText.slice(0, 120) || 'Customer message received',
      suggestedReply: rawText || `Hi ${fallbackInput.customerName || 'there'}! Thank you for reaching out to us. We would love to assist you!`,
      recommendedSchedule: 'Send now',
      actionItem: 'Check customer request in store inventory',
      tags: ['#CustomerMessage', '#Boutique'],
    };
  }
}

/**
 * Execute triage via Google AI Studio Gemini API with Gemma 4
 */
async function callGoogleApi(input: MessageTriageInput): Promise<MessageTriageResult> {
  const config = getActiveProviderConfig();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Please set a valid key in your environment or Settings > Secrets.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(input)}`;

  const response = await ai.models.generateContent({
    model: config.apiModel,
    contents: prompt,
  });

  const rawText = response.text || '';
  const parsed = cleanAndParseJson(rawText, input);

  return {
    ...parsed,
    providerUsed: 'api',
    modelUsed: config.apiModel,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute triage via Local Ollama Gemma 4 fallback
 */
async function callOllama(input: MessageTriageInput): Promise<MessageTriageResult> {
  const config = getActiveProviderConfig();
  const prompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(input)}`;

  const endpoint = `${config.ollamaEndpoint}/api/generate`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.ollamaModel,
      prompt,
      stream: false,
      format: 'json',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Ollama request failed with status ${response.status}: ${errorText || response.statusText}. Is Ollama running on ${config.ollamaEndpoint}?`);
  }

  const data = (await response.json()) as { response?: string };
  const rawText = data.response || '';
  const parsed = cleanAndParseJson(rawText, input);

  return {
    ...parsed,
    providerUsed: 'local',
    modelUsed: config.ollamaModel,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Unified triage handler: switches based on PROVIDER env var
 */
export async function triageMessage(input: MessageTriageInput): Promise<MessageTriageResult> {
  const config = getActiveProviderConfig();

  if (config.provider === 'local') {
    return callOllama(input);
  } else {
    return callGoogleApi(input);
  }
}
