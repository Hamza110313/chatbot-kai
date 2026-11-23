import type { ChatMessage, ChatSession, ChatSettings } from '../types/chat';

export const CHATS_STORAGE_KEY = 'kai_ai_chats_v1';
export const ACTIVE_CHAT_STORAGE_KEY = 'kai_ai_active_chat_v1';
export const SETTINGS_STORAGE_KEY = 'kai_ai_settings_v1';

export const DEFAULT_SETTINGS: ChatSettings = {
  theme: 'system',
  language: 'auto',
  tone: 'balanced',
  model: 'gemini-4-hydrogen',
  systemPrompt: '',
  autoScroll: true,
};

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createNewChatSession(title = 'New Chat'): ChatSession {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function loadChatsFromStorage(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is ChatSession =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          Array.isArray(item.messages) &&
          typeof item.createdAt === 'string' &&
          typeof item.updatedAt === 'string'
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  } catch {
    return [];
  }
}

export function saveChatsToStorage(chats: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function loadActiveChatId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveChatId(chatId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (chatId) {
      localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, chatId);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadSettingsFromStorage(): ChatSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ChatSettings>;
    return {
      theme:
        parsed.theme === 'light' ||
        parsed.theme === 'dark' ||
        parsed.theme === 'system'
          ? parsed.theme
          : DEFAULT_SETTINGS.theme,
      language:
        parsed.language === 'auto' ||
        parsed.language === 'en' ||
        parsed.language === 'ur'
          ? parsed.language
          : DEFAULT_SETTINGS.language,
      tone:
        parsed.tone === 'balanced' ||
        parsed.tone === 'concise' ||
        parsed.tone === 'detailed'
          ? parsed.tone
          : DEFAULT_SETTINGS.tone,
      model:
        parsed.model === 'gemini-4-hydrogen' ||
        parsed.model === 'gemini-3.1-flash-lite'
          ? parsed.model
          : DEFAULT_SETTINGS.model,
      systemPrompt:
        typeof parsed.systemPrompt === 'string'
          ? parsed.systemPrompt
          : DEFAULT_SETTINGS.systemPrompt,
      autoScroll:
        typeof parsed.autoScroll === 'boolean'
          ? parsed.autoScroll
          : DEFAULT_SETTINGS.autoScroll,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsToStorage(settings: ChatSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function applyThemeToDocument(theme: ChatSettings['theme']): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
}

export function containsUrduScript(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

export function getTextDirection(text: string): 'rtl' | 'ltr' {
  const sample = text.trim();
  if (!sample) return 'ltr';
  const rtlMatches = sample.match(
    /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g
  );
  const latinMatches = sample.match(/[A-Za-z]/g);
  const rtlCount = rtlMatches?.length ?? 0;
  const latinCount = latinMatches?.length ?? 0;
  if (rtlCount === 0) return 'ltr';
  return rtlCount >= latinCount * 0.35 ? 'rtl' : 'ltr';
}

export function formatChatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatMessageTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export type ChatDateGroup = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';

export function groupChatsByDate(
  chats: ChatSession[]
): Array<{ group: ChatDateGroup; items: ChatSession[] }> {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfLast7Days = startOfToday - 7 * 86_400_000;

  const buckets: Record<ChatDateGroup, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  for (const chat of chats) {
    const t = new Date(chat.updatedAt).getTime();
    if (t >= startOfToday) {
      buckets.Today.push(chat);
    } else if (t >= startOfYesterday) {
      buckets.Yesterday.push(chat);
    } else if (t >= startOfLast7Days) {
      buckets['Previous 7 Days'].push(chat);
    } else {
      buckets.Older.push(chat);
    }
  }

  const order: ChatDateGroup[] = [
    'Today',
    'Yesterday',
    'Previous 7 Days',
    'Older',
  ];
  return order
    .filter((group) => buckets[group].length > 0)
    .map((group) => ({ group, items: buckets[group] }));
}

function triggerFileDownload(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function slugifyFilename(title: string): string {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return safe || 'conversation';
}

export function exportChatAsTxt(chat: ChatSession): void {
  const header = [
    `Title: ${chat.title}`,
    `Created: ${new Date(chat.createdAt).toLocaleString()}`,
    `Last Updated: ${new Date(chat.updatedAt).toLocaleString()}`,
    `Messages: ${chat.messages.length}`,
    '='.repeat(48),
    '',
  ].join('\n');

  const body = chat.messages
    .map((msg: ChatMessage) => {
      const speaker = msg.role === 'user' ? 'You' : 'Kai';
      const time = new Date(msg.timestamp).toLocaleString();
      return `[${speaker} · ${time}]\n${msg.content}\n`;
    })
    .join('\n');

  triggerFileDownload(
    `${slugifyFilename(chat.title)}.txt`,
    `${header}${body}`,
    'text/plain;charset=utf-8'
  );
}

export function exportChatAsJson(chat: ChatSession): void {
  triggerFileDownload(
    `${slugifyFilename(chat.title)}.json`,
    JSON.stringify(chat, null, 2),
    'application/json;charset=utf-8'
  );
}

export function exportAllChatsAsJson(chats: ChatSession[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    totalConversations: chats.length,
    conversations: chats,
  };
  triggerFileDownload(
    `kai-conversations-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8'
  );
}
