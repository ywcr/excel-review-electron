/**
 * AI 对话功能 - 类型定义
 */

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 对话消息
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isLoading?: boolean;  // 用于显示加载状态
  error?: string;       // 如果发生错误
}

// 上下文类型
export type ContextPage = 'validation' | 'batch' | 'history' | 'functions' | 'compare' | 'home';

// 验证错误上下文
export interface ValidationErrorContext {
  row: number;
  field: string;
  errorType: string;
  value: string;
  expected?: string;
}

// 对话上下文
export interface ChatContext {
  currentPage: ContextPage;
  taskName?: string;
  fileName?: string;
  selectedError?: ValidationErrorContext;
  selectedFunction?: string;
}

// 对话会话
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  context: ChatContext;
  createdAt: number;
  updatedAt: number;
}

// API 响应
export interface ChatAPIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

// 快捷问题
export interface QuickQuestion {
  id: string;
  text: string;
  category: 'validation' | 'function' | 'general';
}
