import { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { ChatMessage } from '../types/chat';
import {
  containsUrduScript,
  formatMessageTimestamp,
  getTextDirection,
} from '../lib/storage';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming: boolean;
  canRegenerate: boolean;
  onRegenerate: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isStreaming,
  canRegenerate,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const dir = getTextDirection(message.content);
  const isUrdu = containsUrduScript(message.content);
  const formattedTime = formatMessageTimestamp(message.timestamp);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  if (isUser) {
    return (
      <div className="group flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1.5 sm:max-w-[75%]">
          <div
            dir={dir}
            className={`whitespace-pre-wrap break-words rounded-2xl border border-black bg-black px-4 py-3 text-[15px] leading-relaxed text-white dark:border-neutral-800 dark:bg-white dark:text-black ${
              isUrdu ? 'font-urdu text-right' : 'text-left'
            }`}
          >
            {message.content}
          </div>
          <div className="flex items-center gap-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-neutral-600 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-black focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-black group-hover:opacity-100 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white dark:focus-visible:outline-white"
              aria-label="Copy message"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-black dark:text-white" />
                  <span className="text-black dark:text-white">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            {formattedTime && (
              <span className="tabular-nums">{formattedTime}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3.5">
      <div
        aria-hidden="true"
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          message.isError
            ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400'
            : 'border-neutral-200 bg-neutral-100 text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-white'
        }`}
      >
        {message.isError ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-display font-semibold text-black dark:text-white">
            Kai
          </span>
          {formattedTime && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formattedTime}</span>
            </>
          )}
        </div>

        {message.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm leading-relaxed text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <p>{message.content}</p>
          </div>
        ) : isStreaming && !message.content ? (
          <div
            className="inline-flex items-center gap-1.5 py-2"
            aria-label="Generating response"
          >
            <span className="typing-dot h-2 w-2 rounded-full bg-black dark:bg-white" />
            <span className="typing-dot h-2 w-2 rounded-full bg-black dark:bg-white" />
            <span className="typing-dot h-2 w-2 rounded-full bg-black dark:bg-white" />
          </div>
        ) : (
          <div className="min-w-0">
            <MarkdownRenderer content={message.content} />
            {isStreaming && (
              <span
                aria-hidden="true"
                className="ms-1 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-xs bg-black dark:bg-white"
              />
            )}
          </div>
        )}

        {(!isStreaming || message.isError) && message.content && (
          <div className="mt-2 flex items-center gap-1.5">
            {!message.isError && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-black dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white dark:focus-visible:outline-white"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-black dark:text-white" />
                    <span className="text-black dark:text-white">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            {canRegenerate && (
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-black dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white dark:focus-visible:outline-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{message.isError ? 'Retry' : 'Regenerate'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
