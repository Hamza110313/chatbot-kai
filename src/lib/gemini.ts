import { GoogleGenAI } from '@google/genai';
import type { Content } from '@google/genai';
import type {
  GeminiModelId,
  LanguagePreference,
  MessageRole,
  ResponseTone,
} from '../types/chat.ts';

const ALLOWED_MODELS: ReadonlySet<GeminiModelId> = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
]);

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;
let cachedVertexClient: GoogleGenAI | null = null;
let cachedVertexApiKey: string | null = null;

export function getSanitizedApiKey(): string {
  const raw = process.env.GEMINI_API_KEY ?? process.env.API_KEY ?? '';
  const cleaned = raw
    .trim()
    .replace(/^GEMINI_API_KEY\s*=\s*/i, '')
    .replace(/^Bearer\s+/i, '')
    .replace(/^["']+|["']+$/g, '')
    .trim();

  if (!cleaned || cleaned === 'MY_GEMINI_API_KEY') {
    throw new GeminiConfigError(
      'API_KEY_MISSING',
      'Gemini API key is not configured. Please add a valid GEMINI_API_KEY in the Settings > Secrets panel (or .env.local for local runs).'
    );
  }
  return cleaned;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = getSanitizedApiKey();
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = apiKey;
  }
  return cachedClient;
}

export function getVertexFallbackClient(): GoogleGenAI | null {
  const apiKey = getSanitizedApiKey();
  if (!apiKey.startsWith('AQ.')) {
    return null;
  }
  if (!cachedVertexClient || cachedVertexApiKey !== apiKey) {
    cachedVertexClient = new GoogleGenAI({
      apiKey,
      vertexai: true,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedVertexApiKey = apiKey;
  }
  return cachedVertexClient;
}

export class GeminiConfigError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GeminiConfigError';
    this.code = code;
  }
}

export function resolveModel(model?: string): GeminiModelId {
  if (model && ALLOWED_MODELS.has(model as GeminiModelId)) {
    return model as GeminiModelId;
  }
  return 'gemini-4-hydrogen';
}

export function buildSystemInstruction(
  language: LanguagePreference = 'auto',
  tone: ResponseTone = 'balanced',
  customSystemPrompt?: string
): string {
  const parts: string[] = [
    'You are Kai, an intelligent, helpful, and accurate AI assistant.',
    'Format responses cleanly using GitHub-Flavored Markdown. Always specify the programming language on fenced code blocks (e.g., ```typescript).',
  ];

  if (language === 'auto') {
    parts.push(
      'Language rule: Automatically detect the language of the user\'s latest message. If the user writes in Urdu (Nastaliq/Arabic script like اردو or Roman Urdu), respond naturally, politely, and fluently in that same style/script of Urdu. If the user writes in English, respond in clear English. Keep code snippets, technical identifiers, and terminal commands in standard LTR English.'
    );
  } else if (language === 'ur') {
    parts.push(
      'Language rule: Always respond in natural, clear, and respectful Urdu (اردو script), while keeping programming code, URLs, and technical identifiers in English.'
    );
  } else {
    parts.push('Language rule: Always respond in clear, natural English.');
  }

  if (tone === 'concise') {
    parts.push(
      'Style rule: Keep answers concise, direct, and scannable with minimal filler.'
    );
  } else if (tone === 'detailed') {
    parts.push(
      'Style rule: Provide thorough explanations, structured sections, and helpful examples where appropriate.'
    );
  } else {
    parts.push(
      'Style rule: Strike a balanced tone—clear, well-structured, and neither overly terse nor unnecessarily verbose.'
    );
  }

  const trimmedCustom = customSystemPrompt?.trim();
  if (trimmedCustom) {
    parts.push(`Additional user instructions:\n${trimmedCustom.slice(0, 1500)}`);
  }

  return parts.join('\n\n');
}

export function formatConversationHistory(
  messages: Array<{ role: MessageRole; content: string }>
): Content[] {
  const valid = messages.filter((m) => m.content && m.content.trim().length > 0);
  const merged: Content[] = [];

  for (const m of valid) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const last = merged[merged.length - 1];
    if (last && last.role === role) {
      last.parts = [...(last.parts ?? []), { text: m.content }];
    } else {
      merged.push({
        role,
        parts: [{ text: m.content }],
      });
    }
  }

  return merged;
}

export interface ParsedGeminiError {
  status: number;
  code: string;
  userMessage: string;
  detail: string;
}

export function parseGeminiError(error: unknown): ParsedGeminiError {
  if (error instanceof GeminiConfigError) {
    return {
      status: 500,
      code: error.code,
      userMessage: error.message,
      detail: error.message,
    };
  }

  const rawStatus =
    typeof (error as { status?: unknown })?.status === 'number'
      ? (error as { status: number }).status
      : undefined;
  const rawMessage =
    error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const lower = rawMessage.toLowerCase();
  const safeDetail = rawMessage.slice(0, 240);

  // 429: Rate limit or quota exceeded
  if (
    rawStatus === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      status: 429,
      code: 'RATE_LIMIT',
      userMessage:
        'Gemini API rate limit or quota exceeded (429). Please wait a moment before trying again, or switch to Gemini 3.1 Flash Lite in Settings.',
      detail: safeDetail,
    };
  }

  // 401: Authentication failed
  if (
    rawStatus === 401 ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid authentication credentials')
  ) {
    return {
      status: 401,
      code: 'AUTHENTICATION_FAILED',
      userMessage:
        'Gemini API authentication failed (401). Please generate a valid Gemini API key in Google AI Studio and set GEMINI_API_KEY in Settings > Secrets.',
      detail: safeDetail,
    };
  }

  // 403: API key permissions or authorization issue
  if (
    rawStatus === 403 ||
    lower.includes('permission_denied') ||
    lower.includes('forbidden')
  ) {
    return {
      status: 403,
      code: 'PERMISSION_DENIED',
      userMessage:
        'Gemini API permission denied (403). Verify your GEMINI_API_KEY in Settings > Secrets and confirm the Generative Language API is enabled for its project.',
      detail: safeDetail,
    };
  }

  // 400: Invalid API key or invalid request / configuration
  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('api key expired')
  ) {
    return {
      status: 400,
      code: 'INVALID_API_KEY',
      userMessage:
        'The configured Gemini API key is invalid or expired (400). Please generate a valid key in Google AI Studio and update GEMINI_API_KEY in Settings > Secrets.',
      detail: safeDetail,
    };
  }

  if (rawStatus === 400 || lower.includes('invalid_argument')) {
    return {
      status: 400,
      code: 'BAD_REQUEST',
      userMessage:
        'Invalid request or API configuration (400). Please check your model settings or message content and try again.',
      detail: safeDetail,
    };
  }

  // 404: Model or endpoint not found
  if (rawStatus === 404 || lower.includes('not_found')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      userMessage:
        'The requested Gemini model or endpoint was not found (404). Try switching models in Settings.',
      detail: safeDetail,
    };
  }

  // Network errors
  if (
    lower.includes('fetch failed') ||
    lower.includes('econnreset') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('network')
  ) {
    return {
      status: 503,
      code: 'NETWORK_ERROR',
      userMessage:
        'Unable to connect to the Gemini API due to a network error. Please check your connection and try again.',
      detail: safeDetail,
    };
  }

  // 500: Internal server error
  return {
    status: rawStatus && rawStatus >= 500 ? rawStatus : 500,
    code: 'INTERNAL_ERROR',
    userMessage:
      'Internal server error while communicating with Gemini (500). Please try again shortly.',
    detail: safeDetail,
  };
}

export async function generateSmartTitle(
  firstUserMessage: string
): Promise<string> {
  const fallback = buildFallbackTitle(firstUserMessage);
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Create a short 3 to 6 word chat title summarizing this prompt. Match the prompt's language (English or Urdu). Return ONLY the plain title without quotes, markdown, or trailing punctuation.\n\nPrompt: ${firstUserMessage.slice(0, 400)}`,
    });
    const title = response.text?.trim().replace(/^["'«»]+|["'«»]+$/g, '');
    if (title && title.length > 0 && title.length <= 64) {
      return title;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function buildFallbackTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New Chat';
  return cleaned.length > 42 ? `${cleaned.slice(0, 42).trimEnd()}...` : cleaned;
}
