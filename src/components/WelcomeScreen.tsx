import { Code2, Globe, MessageSquareText, Sparkles } from 'lucide-react';

interface StarterPrompt {
  id: string;
  label: string;
  prompt: string;
  direction: 'ltr' | 'rtl';
  icon: typeof Code2;
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: 'en-code',
    label: 'TypeScript helper',
    prompt:
      'Write a clean TypeScript debounce hook for React with usage examples.',
    direction: 'ltr',
    icon: Code2,
  },
  {
    id: 'en-explain',
    label: 'Clear explanation',
    prompt:
      'Explain how REST APIs and GraphQL differ, and when to choose each.',
    direction: 'ltr',
    icon: MessageSquareText,
  },
  {
    id: 'ur-write',
    label: 'اردو میں مضمون',
    prompt:
      'مصنوعی ذہانت ہمارے روزمرہ کاموں کو کس طرح آسان بنا رہی ہے؟ آسان اردو میں مختصر مضمون لکھیں۔',
    direction: 'rtl',
    icon: Globe,
  },
  {
    id: 'ur-translate',
    label: 'ترجمہ اور خلاصہ',
    prompt:
      'ایک پیشہ ورانہ ای میل اردو میں لکھیں جس میں کلائنٹ کو پروجیکٹ کی پیش رفت سے آگاہ کیا جائے۔',
    direction: 'rtl',
    icon: Sparkles,
  },
];

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

export function WelcomeScreen({ onSelectPrompt }: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
      <div className="mb-8">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
          <Sparkles className="h-5 w-5" />
        </div>

        <h1 className="font-display text-2xl font-semibold tracking-tight text-black text-balance sm:text-3xl dark:text-white">
          Hi, I&apos;m Kai. How can I help you today?
        </h1>
        <p
          dir="rtl"
          className="font-urdu mt-1.5 text-base text-neutral-600 dark:text-neutral-400"
        >
          السلام علیکم، میں کائی ہوں۔ انگریزی یا اردو میں اپنا سوال پوچھیں۔
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span>English & Urdu auto-detection</span>
          <span aria-hidden="true">·</span>
          <span>Syntax-highlighted code</span>
          <span aria-hidden="true">·</span>
          <span>Saved locally in your browser</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STARTER_PROMPTS.map((item) => {
          const Icon = item.icon;
          const isRtl = item.direction === 'rtl';
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              dir={item.direction}
              className={`group flex flex-col justify-between gap-2.5 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-black hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-black dark:border-neutral-800 dark:bg-[#0A0A0A] dark:hover:border-white dark:hover:bg-neutral-900 dark:focus-visible:outline-white ${
                isRtl ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-black dark:text-white">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className={isRtl ? 'font-urdu' : ''}>{item.label}</span>
              </div>
              <p
                className={`text-sm leading-relaxed text-neutral-700 group-hover:text-black dark:text-neutral-300 dark:group-hover:text-white ${
                  isRtl ? 'font-urdu' : ''
                }`}
              >
                {item.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
