/**
 * AI 对话上下文 Provider
 * 用于在应用中共享和更新对话上下文
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ChatContext, ContextPage, ValidationErrorContext } from '../../shared/ai-chat';

interface AIChatContextValue {
  context: ChatContext;
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  updatePage: (page: ContextPage) => void;
  updateTask: (taskName: string, fileName?: string) => void;
  setSelectedError: (error: ValidationErrorContext | undefined) => void;
  setSelectedFunction: (functionName: string | undefined) => void;
}

const AIChatContext = createContext<AIChatContextValue | null>(null);

interface AIChatProviderProps {
  children: ReactNode;
}

export function AIChatProvider({ children }: AIChatProviderProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [context, setContext] = useState<ChatContext>({
    currentPage: 'home'
  });

  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);
  const toggleChat = useCallback(() => setIsChatOpen(prev => !prev), []);

  const updatePage = useCallback((page: ContextPage) => {
    setContext(prev => ({ ...prev, currentPage: page }));
  }, []);

  const updateTask = useCallback((taskName: string, fileName?: string) => {
    setContext(prev => ({ ...prev, taskName, fileName }));
  }, []);

  const setSelectedError = useCallback((error: ValidationErrorContext | undefined) => {
    setContext(prev => ({ ...prev, selectedError: error }));
    // 选中错误时自动打开对话
    if (error) {
      setIsChatOpen(true);
    }
  }, []);

  const setSelectedFunction = useCallback((functionName: string | undefined) => {
    setContext(prev => ({ ...prev, selectedFunction: functionName }));
  }, []);

  return (
    <AIChatContext.Provider value={{
      context,
      isChatOpen,
      openChat,
      closeChat,
      toggleChat,
      updatePage,
      updateTask,
      setSelectedError,
      setSelectedFunction
    }}>
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIChat() {
  const ctx = useContext(AIChatContext);
  if (!ctx) {
    throw new Error('useAIChat must be used within AIChatProvider');
  }
  return ctx;
}
