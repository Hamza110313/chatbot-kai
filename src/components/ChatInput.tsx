import { useEffect, useRef } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { containsUrduScript, getTextDirection } from '../lib/storage';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dir = getTextDirection(value);
  const isUrdu = containsUrduScript(value);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 192;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating) return;
      if (value.trim().length > 0 && !disabled) {
        onSend();
      }
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !isGenerating;

  return (
    <div className="border-t border-neutral-200 bg-white/95 px-4 pb-4 pt-3 backdrop-blur-sm sm:px-6 dark:border-neutral-800 dark:bg-black/95">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-2 transition-colors focus-within:border-black focus-within:bg-white dark:border-neutral-800 dark:bg-[#0A0A0A] dark:focus-within:border-white dark:focus-within:bg-[#0A0A0A]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            dir={dir}
            placeholder="Message Kai in English or اردو..."
            aria-label="Message input"
            disabled={disabled}
            className={`max-h-48 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] leading-relaxed text-black placeholder:text-neutral-400 focus:outline-none disabled:opacity-60 dark:text-white dark:placeholder:text-neutral-500 ${
              isUrdu ? 'font-urdu' : ''
            }`}
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop generating"
              className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-black px-3.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:focus-visible:outline-white"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              aria-label="Send message"
              title="Send message (Enter)"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:focus-visible:outline-white dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span>Enter to send · Shift+Enter for new line</span>
          <span className="hidden sm:inline">
            Responses may contain errors; verify important facts
          </span>
        </div>
      </div>
    </div>
  );
}
