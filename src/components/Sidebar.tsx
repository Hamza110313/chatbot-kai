import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  MessageSquare,
  Moon,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatSession, ThemeMode } from '../types/chat';
import {
  formatChatDate,
  getTextDirection,
  groupChatsByDate,
} from '../lib/storage';

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  isDesktopOpen: boolean;
  isMobileOpen: boolean;
  theme: ThemeMode;
  onCloseMobile: () => void;
  onToggleDesktop: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onRequestDeleteChat: (chat: ChatSession) => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  chats,
  activeChatId,
  isDesktopOpen,
  isMobileOpen,
  theme,
  onCloseMobile,
  onToggleDesktop,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onRequestDeleteChat,
  onOpenSettings,
  onToggleTheme,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter((chat) => {
      if (chat.title.toLowerCase().includes(query)) return true;
      return chat.messages.some((m) =>
        m.content.toLowerCase().includes(query)
      );
    });
  }, [chats, searchQuery]);

  const groupedChats = useMemo(
    () => groupChatsByDate(filteredChats),
    [filteredChats]
  );

  const startEditing = (chat: ChatSession) => {
    setEditingId(chat.id);
    setDraftTitle(chat.title);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const trimmed = draftTitle.trim();
    if (trimmed) {
      onRenameChat(editingId, trimmed);
    }
    setEditingId(null);
    setDraftTitle('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTitle('');
  };

  const isDarkActive =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  const sidebarContent = (
    <div className="flex h-full w-[272px] flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-[#0A0A0A]">
      {/* Brand + Collapse */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <span className="font-display text-base font-semibold tracking-tight text-black whitespace-nowrap dark:text-white">
          Kai
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleDesktop}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-black focus-visible:outline-2 focus-visible:outline-black lg:flex dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:outline-white"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-black focus-visible:outline-2 focus-visible:outline-black lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:outline-white"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* New Chat + Search */}
      <div className="space-y-2.5 p-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-black px-3.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:focus-visible:outline-white"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>New Chat</span>
        </button>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-8.5 pr-8 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-neutral-400 hover:text-black dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {groupedChats.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="mx-auto mb-2 h-5 w-5 text-neutral-400 dark:text-neutral-600" />
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {searchQuery
                ? 'No matching conversations'
                : 'No saved conversations yet'}
            </p>
            {!searchQuery && (
              <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                Start a new chat to begin.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedChats.map(({ group, items }) => (
              <div key={group}>
                <div className="mb-1 px-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {group}
                </div>
                <ul className="space-y-0.5">
                  {items.map((chat) => {
                    const isActive = chat.id === activeChatId;
                    const isEditing = editingId === chat.id;
                    const titleDir = getTextDirection(chat.title);

                    return (
                      <li key={chat.id} className="group relative">
                        {isEditing ? (
                          <div className="flex items-center gap-1 rounded-lg border border-black bg-white px-2 py-1.5 dark:border-white dark:bg-black">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              dir={titleDir}
                              aria-label="Rename conversation"
                              className="min-w-0 flex-1 bg-transparent text-xs font-medium text-black focus:outline-none dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={commitEdit}
                              aria-label="Save title"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-black hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              aria-label="Cancel rename"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-800 dark:hover:text-white"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors ${
                              isActive
                                ? 'bg-white text-black ring-1 ring-neutral-300 dark:bg-neutral-900 dark:text-white dark:ring-neutral-700'
                                : 'text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-900/70'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onSelectChat(chat.id);
                                onCloseMobile();
                              }}
                              className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-black dark:focus-visible:outline-white"
                            >
                              <div
                                dir={titleDir}
                                className="truncate text-[13px] font-medium"
                              >
                                {chat.title}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">
                                <span>{formatChatDate(chat.createdAt)}</span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {chat.messages.length}{' '}
                                  {chat.messages.length === 1 ? 'msg' : 'msgs'}
                                </span>
                              </div>
                            </button>

                            <div
                              className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
                                isActive
                                  ? 'opacity-100'
                                  : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(chat);
                                }}
                                aria-label={`Rename ${chat.title}`}
                                title="Rename"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-black dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:outline-white"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestDeleteChat(chat);
                                }}
                                aria-label={`Delete ${chat.title}`}
                                title="Delete"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onCloseMobile();
          }}
          className="flex h-9 flex-1 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-200/70 hover:text-black focus-visible:outline-2 focus-visible:outline-black dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:outline-white"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDarkActive ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkActive ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-black dark:border-neutral-800 dark:bg-black dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white dark:focus-visible:outline-white"
        >
          {isDarkActive ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 transition-[width] duration-200 lg:block ${
          isDesktopOpen ? 'w-[272px]' : 'w-0 overflow-hidden'
        }`}
        aria-label="Conversation history"
      >
        {isDesktopOpen && sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            className="relative z-10 h-full"
            aria-label="Conversation history"
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
