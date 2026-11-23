import { useEffect } from 'react';
import { Download, Monitor, Moon, Sun, Trash2, X } from 'lucide-react';
import type {
  ChatSettings,
  GeminiModelId,
  LanguagePreference,
  ResponseTone,
  ThemeMode,
} from '../types/chat';

interface SettingsModalProps {
  open: boolean;
  settings: ChatSettings;
  totalChats: number;
  onClose: () => void;
  onUpdateSettings: (partial: Partial<ChatSettings>) => void;
  onExportAll: () => void;
  onRequestClearAll: () => void;
}

export function SettingsModal({
  open,
  settings,
  totalChats,
  onClose,
  onUpdateSettings,
  onExportAll,
  onRequestClearAll,
}: SettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const themeOptions: Array<{
    value: ThemeMode;
    label: string;
    icon: typeof Sun;
  }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const languageOptions: Array<{
    value: LanguagePreference;
    label: string;
  }> = [
    { value: 'auto', label: 'Auto (EN / اردو)' },
    { value: 'en', label: 'English' },
    { value: 'ur', label: 'Urdu (اردو)' },
  ];

  const toneOptions: Array<{
    value: ResponseTone;
    label: string;
  }> = [
    { value: 'balanced', label: 'Balanced' },
    { value: 'concise', label: 'Concise' },
    { value: 'detailed', label: 'Detailed' },
  ];

  const modelOptions: Array<{
    value: GeminiModelId;
    label: string;
    detail: string;
  }> = [
    {
      value: 'gemini-4-hydrogen',
      label: 'Gemini 4 Hydrogen',
      detail: 'Recommended general reasoning & bilingual responses',
    },
    {
      value: 'gemini-3.1-flash-lite',
      label: 'Gemini 3.1 Flash Lite',
      detail: 'Lowest latency & higher free-tier throughput',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-[#0A0A0A]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div>
            <h2
              id="settings-modal-title"
              className="font-display text-lg font-semibold text-black dark:text-white"
            >
              Settings
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Customize appearance, language behavior, and local history
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-black dark:hover:bg-neutral-900 dark:hover:text-white dark:focus-visible:outline-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Theme */}
          <section>
            <label className="mb-2 block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Appearance
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-black">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = settings.theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateSettings({ theme: opt.value })}
                    className={`flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-black dark:focus-visible:outline-white ${
                      active
                        ? 'bg-white text-black shadow-xs dark:bg-neutral-800 dark:text-white'
                        : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Language */}
          <section>
            <label className="mb-2 block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Response Language
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-black">
              {languageOptions.map((opt) => {
                const active = settings.language === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateSettings({ language: opt.value })}
                    className={`flex h-9 items-center justify-center whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-black dark:focus-visible:outline-white ${
                      active
                        ? 'bg-white text-black shadow-xs dark:bg-neutral-800 dark:text-white'
                        : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Model */}
          <section>
            <label className="mb-2 block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Gemini Model
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {modelOptions.map((opt) => {
                const active = settings.model === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateSettings({ model: opt.value })}
                    className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-black dark:focus-visible:outline-white ${
                      active
                        ? 'border-black bg-neutral-100 dark:border-white dark:bg-neutral-900'
                        : 'border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-800 dark:bg-black dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-xs font-semibold text-black dark:text-white">
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
                      {opt.detail}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tone */}
          <section>
            <label className="mb-2 block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Response Style
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-black">
              {toneOptions.map((opt) => {
                const active = settings.tone === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateSettings({ tone: opt.value })}
                    className={`flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-black dark:focus-visible:outline-white ${
                      active
                        ? 'bg-white text-black shadow-xs dark:bg-neutral-800 dark:text-white'
                        : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Custom Instructions */}
          <section>
            <label
              htmlFor="custom-instructions-input"
              className="mb-1.5 block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
            >
              Custom Instructions
            </label>
            <textarea
              id="custom-instructions-input"
              rows={3}
              value={settings.systemPrompt}
              onChange={(e) =>
                onUpdateSettings({ systemPrompt: e.target.value })
              }
              placeholder="Optional instructions applied to every message (e.g., 'Always include TypeScript types' or 'Use formal Urdu')..."
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-black placeholder:text-neutral-400 focus:border-black focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
            />
          </section>

          {/* Auto-scroll */}
          <section className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-5 dark:border-neutral-800">
            <div>
              <div className="text-xs font-semibold text-black dark:text-white">
                Auto-scroll to latest message
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Automatically keep the viewport anchored during streaming
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoScroll}
              onClick={() =>
                onUpdateSettings({ autoScroll: !settings.autoScroll })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white ${
                settings.autoScroll
                  ? 'bg-black dark:bg-white'
                  : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                  settings.autoScroll
                    ? 'translate-x-6 bg-white dark:bg-black'
                    : 'translate-x-1 bg-white dark:bg-neutral-200'
                }`}
              />
            </button>
          </section>

          {/* Storage & Export */}
          <section className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-black dark:text-white">
                  Local Storage History
                </div>
                <div className="text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">
                  {totalChats}{' '}
                  {totalChats === 1 ? 'conversation' : 'conversations'} stored
                  in your browser
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onExportAll}
                disabled={totalChats === 0}
                className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:bg-neutral-900 dark:focus-visible:outline-white"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export All (JSON)</span>
              </button>

              <button
                type="button"
                onClick={onRequestClearAll}
                disabled={totalChats === 0}
                className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-3.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All History</span>
              </button>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-neutral-200 px-6 py-3.5 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap rounded-lg bg-black px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:focus-visible:outline-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
