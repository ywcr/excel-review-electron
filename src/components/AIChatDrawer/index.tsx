/**
 * AI 对话抽屉 - 主组件
 * 支持流式输出和上下文感知
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { ChatInput } from './ChatInput';
import {
  ChatMessage,
  ChatContext,
  ChatSession,
  streamChatMessage,
  sendChatMessage,
  createSession,
  createUserMessage,
  createAssistantMessage,
  saveSessions,
  loadSessions,
  isLLMConfigured
} from '../../../shared/ai-chat';
import { getQuickQuestions } from '../../../shared/ai-chat/prompts';
import './AIChatDrawer.css';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context: ChatContext;
  onOpenSettings: () => void;
}

export function AIChatDrawer({ 
  isOpen, 
  onClose, 
  context,
  onOpenSettings 
}: AIChatDrawerProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化或加载会话
  useEffect(() => {
    if (isOpen && !session) {
      const sessions = loadSessions();
      const recent = sessions.find(s => 
        Date.now() - s.updatedAt < 10 * 60 * 1000
      );
      if (recent) {
        setSession(recent);
      } else {
        setSession(createSession(context));
      }
    }
  }, [isOpen, session, context]);

  // 更新上下文
  useEffect(() => {
    if (session) {
      setSession(prev => prev ? { ...prev, context } : null);
    }
  }, [context]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, streamingContent]);

  // 保存会话
  useEffect(() => {
    if (session && session.messages.length > 0 && !isLoading) {
      const sessions = loadSessions();
      const existingIdx = sessions.findIndex(s => s.id === session.id);
      if (existingIdx >= 0) {
        sessions[existingIdx] = session;
      } else {
        sessions.unshift(session);
      }
      saveSessions(sessions);
    }
  }, [session, isLoading]);

  // 发送消息 (流式)
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !session) return;

    const userMessage = createUserMessage(content);

    // 添加用户消息
    setSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
      updatedAt: Date.now()
    } : null);

    setIsLoading(true);
    setStreamingContent('');

    try {
      // 尝试流式输出
      let fullContent = '';
      const stream = streamChatMessage([...session.messages, userMessage], context);
      
      for await (const chunk of stream) {
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      // 流完成，添加完整消息
      if (fullContent) {
        setSession(prev => prev ? {
          ...prev,
          messages: [...prev.messages, createAssistantMessage(fullContent)],
          updatedAt: Date.now()
        } : null);
      }
    } catch (error) {
      // 流式失败，回退到普通请求
      console.warn('Streaming failed, falling back to normal request:', error);
      
      const response = await sendChatMessage([...session.messages, userMessage], context);
      
      if (response.success && response.content) {
        setSession(prev => prev ? {
          ...prev,
          messages: [...prev.messages, createAssistantMessage(response.content!)],
          updatedAt: Date.now()
        } : null);
      } else {
        setSession(prev => prev ? {
          ...prev,
          messages: [...prev.messages, {
            id: `err-${Date.now()}`,
            role: 'assistant' as const,
            content: '',
            timestamp: Date.now(),
            error: response.error || '请求失败'
          }],
          updatedAt: Date.now()
        } : null);
      }
    }

    setStreamingContent('');
    setIsLoading(false);
  }, [session, context, isLoading]);

  // 快捷问题
  const quickQuestions = getQuickQuestions(context);

  // 新对话
  const handleNewChat = () => {
    setSession(createSession(context));
    setStreamingContent('');
  };

  if (!isOpen) return null;

  const configured = isLLMConfigured();

  // 显示上下文提示
  const contextHint = context.selectedError 
    ? `📍 已选中：行${context.selectedError.row} ${context.selectedError.field}字段的错误`
    : context.taskName
    ? `📋 ${context.taskName}`
    : null;

  return (
    <>
      {/* 背景遮罩 */}
      <div className="ai-chat-overlay" onClick={onClose} />
      
      {/* 抽屉 */}
      <div className="ai-chat-drawer">
        {/* 头部 */}
        <div className="ai-chat-header">
          <div className="ai-chat-title">
            <span className="ai-chat-icon">🤖</span>
            <span>AI 助手</span>
            {configured && <span className="ai-badge">AI</span>}
          </div>
          <div className="ai-chat-actions">
            <button 
              className="ai-action-btn" 
              onClick={handleNewChat}
              title="新对话"
            >
              ✨
            </button>
            <button 
              className="ai-action-btn" 
              onClick={onOpenSettings}
              title="设置"
            >
              ⚙️
            </button>
            <button 
              className="ai-action-btn close" 
              onClick={onClose}
              title="关闭"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 上下文提示 */}
        {contextHint && (
          <div className="ai-context-hint">
            {contextHint}
          </div>
        )}

        {/* 消息区域 */}
        <div className="ai-chat-messages">
          {!configured && (
            <div className="ai-chat-notice">
              <div className="ai-notice-icon">⚠️</div>
              <div className="ai-notice-text">
                <p>尚未配置 API Key</p>
                <button onClick={onOpenSettings}>前往设置</button>
              </div>
            </div>
          )}

          {session?.messages.length === 0 && configured && !streamingContent && (
            <div className="ai-chat-welcome">
              <div className="ai-welcome-icon">👋</div>
              <h3>你好！我是小审</h3>
              <p>有什么可以帮助你的？</p>
              
              <div className="ai-quick-questions">
                {quickQuestions.slice(0, 4).map(q => (
                  <button 
                    key={q.id} 
                    className="ai-quick-btn"
                    onClick={() => handleSend(q.text)}
                  >
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {session?.messages.map(msg => (
            <ChatMessageComponent 
              key={msg.id} 
              message={msg} 
            />
          ))}

          {/* 流式输出中的消息 */}
          {streamingContent && (
            <ChatMessageComponent 
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingContent,
                timestamp: Date.now()
              }} 
            />
          )}

          {/* 加载中但还没有内容 */}
          {isLoading && !streamingContent && (
            <div className="ai-message ai-message-assistant">
              <div className="ai-message-avatar">🤖</div>
              <div className="ai-message-content loading">
                <div className="ai-loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <ChatInput 
          onSend={handleSend} 
          disabled={!configured || isLoading}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}
