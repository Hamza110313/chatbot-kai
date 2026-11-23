import type { ChatRequestPayload } from '../types/chat';

export interface StreamHandlers {
  onChunk: (chunkText: string) => void;
  onComplete: () => void;
  onError: (message: string, code?: string) => void;
}

export async function streamChatCompletion(
  payload: ChatRequestPayload,
  signal: AbortSignal,
  handlers: StreamHandlers
): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      handlers.onComplete();
      return;
    }
    handlers.onError(
      'Unable to connect to the server. Please check your internet connection and try again.',
      'NETWORK_ERROR'
    );
    return;
  }

  if (!response.ok) {
    try {
      const errJson = (await response.json()) as { error?: string; code?: string };
      handlers.onError(
        errJson.error ?? `Request failed (${response.status}).`,
        errJson.code
      );
    } catch {
      handlers.onError(`Request failed (${response.status}).`);
    }
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    handlers.onError('Streaming is not supported in this browser response.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const dataStr = line.slice(5).trim();
        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr) as {
            text?: string;
            done?: boolean;
            error?: string;
            code?: string;
          };

          if (parsed.error) {
            handlers.onError(parsed.error, parsed.code);
            return;
          }
          if (parsed.text) {
            handlers.onChunk(parsed.text);
          }
          if (parsed.done) {
            handlers.onComplete();
            return;
          }
        } catch {
          // Ignore malformed partial SSE line
        }
      }
    }

    handlers.onComplete();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      handlers.onComplete();
      return;
    }
    handlers.onError(
      'The response stream was interrupted. Please try again.',
      'STREAM_INTERRUPTED'
    );
  } finally {
    reader.releaseLock();
  }
}

export async function requestSmartTitle(message: string): Promise<string | null> {
  try {
    const res = await fetch('/api/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title?.trim() || null;
  } catch {
    return null;
  }
}
