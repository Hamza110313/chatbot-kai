import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  Check,
  Download,
  FileJson,
  FileText,
  Menu,
  PanelLeftOpen,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatSession } from '../types/chat';
import {
  exportChatAsJson,
  exportChatAsTxt,
  formatChatDate,
  getTextDirection,
} from '../lib/storage';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';

interface ChatAreaProps {
  chat: ChatSession;
  inputValue: string;
  isGenerating: boolean;
  streamingMessageId: string | null;
  autoScroll: boolean;
  isDesktopSidebarOpen: boolean;
  onOpenMobileSidebar: () => void;
  onOpenDesktopSidebar: () => void;
  onInputChange: (val: string) => void;
  onSendMessage: (overrideText?: string) => void;
  onStopGenerating: () => void;
  onRegenerate: (assistantMessageId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onRequestDeleteChat: (chat: ChatSession) => void;
}

export function ChatArea({
  chat,
  inputValue,
  isGenerating,
  streamingMessageId,
  autoScroll,
  isDesktopSidebarOpen,
  onOpenMobileSidebar,
  onOpenDesktopSidebar,
  onInputChange,
  onSendMessage,
  onStopGenerating,
  onRegenerate,
  onRenameChat,
  onRequestDeleteChat,
}: ChatAreaProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chat.title);

  useEffect(() => {
    setEditingTitle(false);
    setTitleDraft(chat.title);
  }, [chat.id, chat.title]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (!exportOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setExportOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [exportOpen]);

  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 180 || isGenerating) {
      bottomAnchorRef.current?.scrollIntoView({
        behavior: isGenerating ? 'auto' : 'smooth',
      });
    }
  }, [chat.messages, isGenerating, autoScroll]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 240);
  };

  const scrollToBottom = () => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const commitTitleEdit = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== chat.title) {
      onRenameChat(chat.id, trimmed);
    } else {
      setTitleDraft(chat.title);
    }
    setEditingTitle(false);
  };

  const titleDir = getTextDirection(chat.title);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-black">
      {/* Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-4 sm:px-6 dark:border-neutral-800">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open conversation sidebar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-black lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white dark:focus-visible:outline-white"
          >
            <Menu className="h-4 w-4" />
          </button>

          {!isDesktopSidebarOpen && (
            <button
              type="button"
              onClick={onOpenDesktopSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-black lg:flex dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white dark:focus-visible:outline-white"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          {editingTitle ? (
            <div className="flex max-w-md flex-1 items-center gap-1 rounded-lg border border-black bg-white px-2.5 py-1 dark:border-white dark:bg-black">
              <input
                ref={titleInputRef}
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitleEdit();
                  if (e.key === 'Escape') {
                    setTitleDraft(chat.title);
                    setEditingTitle(false);
                  }
                }}
                dir={titleDir}
                aria-label="Edit conversation title"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-black focus:outline-none dark:text-white"
              />
              <button
                type="button"
                onClick={commitTitleEdit}
                aria-label="Save title"
                className="flex h-6 w-6 items-center justify-center rounded text-black hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(chat.title);
                  setEditingTitle(false);
                }}
                aria-label="Cancel editing title"
                className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                dir={titleDir}
                title="Click to rename conversation"
                className="group inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-black dark:hover:bg-neutral-900 dark:focus-visible:outline-white"
              >
                <span className="truncate font-display text-sm font-semibold text-black dark:text-white">
                  {chat.title}
                </span>
                <Pencil className="h-3 w-3 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>

              <span className="hidden whitespace-nowrap text-xs text-neutral-500 tabular-nums md:inline dark:text-neutral-400">
                · Created {formatChatDate(chat.createdAt)}
              </span>
            </div>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportOpen((prev) => !prev)}
              disabled={chat.messages.length === 0}
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-800 dark:bg-[#0A0A0A] dark:text-neutral-200 dark:hover:bg-neutral-900 dark:focus-visible:outline-white"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {exportOpen && (
              <div className="absolute right-0 z-30 mt-1.5 w-44 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-[#0A0A0A]">
                <button
                  type="button"
                  onClick={() => {
                    exportChatAsTxt(chat);
                    setExportOpen(false);
                  }}
                  className="flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  <FileText className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Export as TXT</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportChatAsJson(chat);
                    setExportOpen(false);
                  }}
                  className="flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  <FileJson className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Export as JSON</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onRequestDeleteChat(chat)}
            aria-label="Delete conversation"
            title="Delete conversation"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-600 dark:border-neutral-800 dark:bg-[#0A0A0A] dark:text-neutral-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main Message Viewport */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          {chat.messages.length === 0 ? (
            <WelcomeScreen
              onSelectPrompt={(prompt) => {
                onSendMessage(prompt);
              }}
            />
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
              {chat.messages.map((message, idx) => {
                const isThisStreaming =
                  isGenerating && message.id === streamingMessageId;
                const isLastAssistant =
                  message.role === 'assistant' &&
                  idx === chat.messages.length - 1;
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isStreaming={isThisStreaming}
                    canRegenerate={!isGenerating && isLastAssistant}
                    onRegenerate={onRegenerate}
                  />
                );
              })}
              <div ref={bottomAnchorRef} className="h-1" />
            </div>
          )}
        </div>

        {showScrollButton && chat.messages.length > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Scroll to latest message"
            className="absolute bottom-4 left-1/2 flex h-9 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-800 shadow-md transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span>Jump to latest</span>
          </button>
        )}
      </div>

      {/* Composer */}
      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSend={() => onSendMessage()}
        onStop={onStopGenerating}
        isGenerating={isGenerating}
      />
    </div>
  );
}
