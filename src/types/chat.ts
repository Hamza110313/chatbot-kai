export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type LanguagePreference = 'auto' | 'en' | 'ur';

export type ResponseTone = 'balanced' | 'concise' | 'detailed';

export type GeminiModelId = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export interface ChatSettings {
  theme: ThemeMode;
  language: LanguagePreference;
  tone: ResponseTone;
  model: GeminiModelId;
  systemPrompt: string;
  autoScroll: boolean;
}

export interface ChatRequestPayload {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  model?: GeminiModelId;
  language?: LanguagePreference;
  tone?: ResponseTone;
  systemPrompt?: string;
}
