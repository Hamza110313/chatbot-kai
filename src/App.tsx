import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatArea } from './components/ChatArea';
import { ConfirmDialog } from './components/ConfirmDialog';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { requestSmartTitle, streamChatCompletion } from './lib/chatClient';
import {
  applyThemeToDocument,
  createId,
  createNewChatSession,
  exportAllChatsAsJson,
  loadActiveChatId,
  loadChatsFromStorage,
  loadSettingsFromStorage,
  saveActiveChatId,
  saveChatsToStorage,
  saveSettingsToStorage,
} from './lib/storage';
import type { ChatMessage, ChatSession, ChatSettings } from './types/chat';

type ConfirmActionState =
  | { type: 'delete-chat'; chat: ChatSession }
  | { type: 'clear-all' }
  | null;

export default function App() {
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const stored = loadChatsFromStorage();
    return stored.length > 0 ? stored : [createNewChatSession('New Chat')];
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const storedChats = loadChatsFromStorage();
    const savedActive = loadActiveChatId();
    if (savedActive && storedChats.some((c) => c.id === savedActive)) {
      return savedActive;
    }
    return storedChats[0]?.id ?? '';
  });

  const [settings, setSettings] = useState<ChatSettings>(() =>
    loadSettingsFromStorage()
  );

  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmActionState>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const userAbortedRef = useRef(false);

  // Ensure activeChatId always points to an existing chat
  const activeChat = useMemo(() => {
    const found = chats.find((c) => c.id === activeChatId);
    return found ?? chats[0];
  }, [chats, activeChatId]);

  useEffect(() => {
    if (activeChat && activeChat.id !== activeChatId) {
      setActiveChatId(activeChat.id);
    }
  }, [activeChat, activeChatId]);

  // Persist chats & active selection
  useEffect(() => {
    saveChatsToStorage(chats);
  }, [chats]);

  useEffect(() => {
    if (activeChat?.id) {
      saveActiveChatId(activeChat.id);
    }
  }, [activeChat?.id]);

  // Persist & apply theme/settings
  useEffect(() => {
    saveSettingsToStorage(settings);
    applyThemeToDocument(settings.theme);

    if (settings.theme !== 'system') return;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const listener = () => applyThemeToDocument('system');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [settings]);

  // Cleanup active request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleUpdateSettings = useCallback(
    (partial: Partial<ChatSettings>) => {
      setSettings((prev) => ({ ...prev, ...partial }));
    },
    []
  );

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      const currentlyDark =
        prev.theme === 'dark' || (prev.theme === 'system' && prefersDark);
      return {
        ...prev,
        theme: currentlyDark ? 'light' : 'dark',
      };
    });
  }, []);

  const handleStopGenerating = useCallback(() => {
    userAbortedRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
    setStreamingMessageId(null);
  }, []);

  const handleNewChat = useCallback(() => {
    if (isGenerating) {
      handleStopGenerating();
    }
    const existingEmpty = chats.find((c) => c.messages.length === 0);
    if (existingEmpty) {
      setActiveChatId(existingEmpty.id);
      setInputValue('');
      return;
    }
    const fresh = createNewChatSession('New Chat');
    setChats((prev) => [fresh, ...prev]);
    setActiveChatId(fresh.id);
    setInputValue('');
  }, [chats, isGenerating, handleStopGenerating]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (chatId === activeChat?.id) return;
      if (isGenerating) {
        handleStopGenerating();
      }
      setActiveChatId(chatId);
    },
    [activeChat?.id, isGenerating, handleStopGenerating]
  );

  const handleRenameChat = useCallback((chatId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, title: trimmed, updatedAt: now } : c
      )
    );
  }, []);

  const runAssistantStream = useCallback(
    async (
      targetChatId: string,
      historyForApi: Array<{ role: 'user' | 'assistant'; content: string }>,
      assistantMsgId: string
    ) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      userAbortedRef.current = false;
      let receivedAnyChunk = false;

      setIsGenerating(true);
      setStreamingMessageId(assistantMsgId);

      await streamChatCompletion(
        {
          messages: historyForApi,
          model: settings.model,
          language: settings.language,
          tone: settings.tone,
          systemPrompt: settings.systemPrompt,
        },
        controller.signal,
        {
          onChunk: (chunkText) => {
            receivedAnyChunk = true;
            const now = new Date().toISOString();
            setChats((prev) =>
              prev.map((chat) => {
                if (chat.id !== targetChatId) return chat;
                return {
                  ...chat,
                  updatedAt: now,
                  messages: chat.messages.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: msg.content + chunkText }
                      : msg
                  ),
                };
              })
            );
          },
          onComplete: () => {
            if (abortControllerRef.current === controller) {
              abortControllerRef.current = null;
            }
            setIsGenerating(false);
            setStreamingMessageId(null);

            if (!receivedAnyChunk && !userAbortedRef.current) {
              setChats((prev) =>
                prev.map((chat) => {
                  if (chat.id !== targetChatId) return chat;
                  return {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === assistantMsgId && msg.content.trim() === ''
                        ? {
                            ...msg,
                            content:
                              'No response was received from Kai. Please try again.',
                            isError: true,
                          }
                        : msg
                    ),
                  };
                })
              );
              return;
            }

            // Clean up empty assistant message only if user stopped before first token
            setChats((prev) =>
              prev.map((chat) => {
                if (chat.id !== targetChatId) return chat;
                const filtered = chat.messages.filter(
                  (m) =>
                    !(
                      m.id === assistantMsgId &&
                      m.content.trim() === '' &&
                      !m.isError
                    )
                );
                return filtered.length === chat.messages.length
                  ? chat
                  : { ...chat, messages: filtered };
              })
            );
          },
          onError: (errorMessage) => {
            if (abortControllerRef.current === controller) {
              abortControllerRef.current = null;
            }
            setIsGenerating(false);
            setStreamingMessageId(null);
            const now = new Date().toISOString();

            setChats((prev) =>
              prev.map((chat) => {
                if (chat.id !== targetChatId) return chat;
                return {
                  ...chat,
                  updatedAt: now,
                  messages: chat.messages.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          content: msg.content
                            ? `${msg.content}\n\n---\n${errorMessage}`
                            : errorMessage,
                          isError: !msg.content,
                        }
                      : msg
                  ),
                };
              })
            );
          },
        }
      );
    },
    [settings.language, settings.model, settings.systemPrompt, settings.tone]
  );

  const handleSendMessage = useCallback(
    async (overrideText?: string) => {
      if (isGenerating || !activeChat) return;
      const text = (overrideText ?? inputValue).trim();
      if (!text) return;

      if (!overrideText) {
        setInputValue('');
      }

      const targetChatId = activeChat.id;
      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: createId(),
        role: 'user',
        content: text,
        timestamp: now,
      };
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: '',
        timestamp: now,
      };

      const isFirstMessage = activeChat.messages.length === 0;
      const fallbackTitle =
        text.length > 42 ? `${text.slice(0, 42).trimEnd()}...` : text;
      const nextTitle =
        isFirstMessage && activeChat.title === 'New Chat'
          ? fallbackTitle
          : activeChat.title;

      const priorValidMessages = activeChat.messages
        .filter((m) => !m.isError && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const historyForApi = [
        ...priorValidMessages,
        { role: 'user' as const, content: text },
      ];

      setChats((prev) => {
        const updated = prev.map((chat) =>
          chat.id === targetChatId
            ? {
                ...chat,
                title: nextTitle,
                updatedAt: now,
                messages: [...chat.messages, userMessage, assistantMessage],
              }
            : chat
        );
        return updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });

      if (isFirstMessage && activeChat.title === 'New Chat') {
        void requestSmartTitle(text).then((smartTitle) => {
          if (!smartTitle) return;
          setChats((prev) =>
            prev.map((c) =>
              c.id === targetChatId && c.title === fallbackTitle
                ? { ...c, title: smartTitle }
                : c
            )
          );
        });
      }

      await runAssistantStream(targetChatId, historyForApi, assistantMessage.id);
    },
    [activeChat, inputValue, isGenerating, runAssistantStream]
  );

  const handleRegenerate = useCallback(
    async (assistantMessageId: string) => {
      if (isGenerating || !activeChat) return;
      const targetIndex = activeChat.messages.findIndex(
        (m) => m.id === assistantMessageId
      );
      if (targetIndex === -1) return;

      const truncatedMessages = activeChat.messages.slice(0, targetIndex);
      const historyForApi = truncatedMessages
        .filter((m) => !m.isError && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      if (historyForApi.length === 0) return;

      const now = new Date().toISOString();
      const freshAssistant: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: '',
        timestamp: now,
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChat.id
            ? {
                ...chat,
                updatedAt: now,
                messages: [...truncatedMessages, freshAssistant],
              }
            : chat
        )
      );

      await runAssistantStream(activeChat.id, historyForApi, freshAssistant.id);
    },
    [activeChat, isGenerating, runAssistantStream]
  );

  const handleConfirmAction = useCallback(() => {
    if (!confirmState) return;

    if (confirmState.type === 'delete-chat') {
      const targetId = confirmState.chat.id;
      if (isGenerating && activeChat?.id === targetId) {
        handleStopGenerating();
      }
      setChats((prev) => {
        const remaining = prev.filter((c) => c.id !== targetId);
        if (remaining.length === 0) {
          const fresh = createNewChatSession('New Chat');
          setActiveChatId(fresh.id);
          return [fresh];
        }
        if (activeChat?.id === targetId) {
          setActiveChatId(remaining[0].id);
        }
        return remaining;
      });
    } else if (confirmState.type === 'clear-all') {
      if (isGenerating) {
        handleStopGenerating();
      }
      const fresh = createNewChatSession('New Chat');
      setChats([fresh]);
      setActiveChatId(fresh.id);
      setIsSettingsOpen(false);
    }

    setConfirmState(null);
  }, [activeChat?.id, confirmState, handleStopGenerating, isGenerating]);

  if (!activeChat) return null;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white text-black dark:bg-black dark:text-white">
      <Sidebar
        chats={chats}
        activeChatId={activeChat.id}
        isDesktopOpen={isDesktopSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
        theme={settings.theme}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onToggleDesktop={() => setIsDesktopSidebarOpen((prev) => !prev)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onRenameChat={handleRenameChat}
        onRequestDeleteChat={(chat) =>
          setConfirmState({ type: 'delete-chat', chat })
        }
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatArea
          chat={activeChat}
          inputValue={inputValue}
          isGenerating={isGenerating}
          streamingMessageId={streamingMessageId}
          autoScroll={settings.autoScroll}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenDesktopSidebar={() => setIsDesktopSidebarOpen(true)}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onStopGenerating={handleStopGenerating}
          onRegenerate={handleRegenerate}
          onRenameChat={handleRenameChat}
          onRequestDeleteChat={(chat) =>
            setConfirmState({ type: 'delete-chat', chat })
          }
        />
      </main>

      <SettingsModal
        open={isSettingsOpen}
        settings={settings}
        totalChats={chats.length}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onExportAll={() => exportAllChatsAsJson(chats)}
        onRequestClearAll={() => setConfirmState({ type: 'clear-all' })}
      />

      <ConfirmDialog
        open={confirmState !== null}
        title={
          confirmState?.type === 'clear-all'
            ? 'Clear all conversations?'
            : 'Delete conversation?'
        }
        description={
          confirmState?.type === 'clear-all'
            ? 'This will permanently remove every saved conversation from your browser storage. This action cannot be undone.'
            : `Are you sure you want to delete "${confirmState?.chat.title ?? ''}"? This cannot be undone.`
        }
        confirmLabel={
          confirmState?.type === 'clear-all' ? 'Clear All' : 'Delete'
        }
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
