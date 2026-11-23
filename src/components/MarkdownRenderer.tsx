import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import { Check, Copy } from 'lucide-react';
import { containsUrduScript } from '../lib/storage';

interface CodeBlockProps {
  language?: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const highlightedHtml = useMemo(() => {
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return null;
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div
      dir="ltr"
      className="my-3 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-left dark:border-neutral-800 dark:bg-[#0A0A0A]"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-3.5 py-2 dark:border-neutral-800 dark:bg-neutral-900">
        <span className="font-mono text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-black focus-visible:outline-2 focus-visible:outline-black dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:outline-white"
          aria-label="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-black dark:text-white" />
              <span className="text-black dark:text-white">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed">
        {highlightedHtml ? (
          <code
            className="hljs font-mono"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code className="font-mono text-neutral-900 dark:text-neutral-100">
            {code}
          </code>
        )}
      </pre>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const isUrdu = containsUrduScript(content);

  return (
    <div
      dir="auto"
      className={`markdown-body text-[15px] leading-relaxed text-neutral-900 dark:text-neutral-100 ${
        isUrdu ? 'font-urdu' : ''
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children }) {
            return (
              <p dir="auto" className="mb-3 last:mb-0">
                {children}
              </p>
            );
          },
          h1({ children }) {
            return (
              <h1
                dir="auto"
                className="mb-3 mt-5 font-display text-xl font-semibold text-black first:mt-0 dark:text-white"
              >
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2
                dir="auto"
                className="mb-2.5 mt-4 font-display text-lg font-semibold text-black first:mt-0 dark:text-white"
              >
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3
                dir="auto"
                className="mb-2 mt-3.5 font-display text-base font-semibold text-black first:mt-0 dark:text-white"
              >
                {children}
              </h3>
            );
          },
          ul({ children }) {
            return (
              <ul
                dir="auto"
                className="mb-3 list-disc space-y-1.5 ps-5 last:mb-0"
              >
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol
                dir="auto"
                className="mb-3 list-decimal space-y-1.5 ps-5 last:mb-0"
              >
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote
                dir="auto"
                className="my-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              >
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-black underline decoration-black/40 underline-offset-2 transition-colors hover:text-neutral-700 dark:text-white dark:decoration-white/40 dark:hover:text-neutral-300"
              >
                {children}
              </a>
            );
          },
          hr() {
            return (
              <hr className="my-4 border-neutral-200 dark:border-neutral-800" />
            );
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                <table className="w-full border-collapse text-left text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                {children}
              </thead>
            );
          },
          th({ children }) {
            return <th className="px-3.5 py-2.5">{children}</th>;
          },
          td({ children }) {
            return (
              <td className="border-t border-neutral-200 px-3.5 py-2 dark:border-neutral-800">
                {children}
              </td>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-([\w-]+)/.exec(className || '');
            const text = String(children).replace(/\n$/, '');
            const isBlock = Boolean(match) || text.includes('\n');
            if (isBlock) {
              return <CodeBlock language={match?.[1]} code={text} />;
            }
            return (
              <code
                dir="ltr"
                className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px] text-black dark:bg-neutral-900 dark:text-white"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
