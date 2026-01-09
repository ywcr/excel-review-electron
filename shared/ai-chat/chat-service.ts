/**
 * AI 对话服务
 * 支持 OpenAI 兼容协议和 Gemini 原生协议
 */

import { getLLMConfig, isLLMConfigured } from '../function-library/ai/llm-service';
import { ChatMessage, ChatContext, ChatAPIResponse, ChatSession } from './types';
import { buildSystemPrompt } from './prompts';

// 存储 key
const CHAT_HISTORY_KEY = 'excel-ai-chat-sessions';
const MAX_SESSIONS = 10;
const MAX_MESSAGES_PER_SESSION = 100;

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 判断是否使用 Gemini 原生协议
 */
function isGeminiNativeProtocol(baseUrl: string, model: string): boolean {
  // 如果模型名以 gemini 开头，且 baseUrl 不包含 openai 或 compatible，则使用原生协议
  const lowerModel = model.toLowerCase();
  const lowerUrl = baseUrl.toLowerCase();
  
  if (lowerModel.startsWith('gemini')) {
    // 如果 URL 包含 openai 或 compatible-mode，则使用 OpenAI 协议
    if (lowerUrl.includes('openai') || lowerUrl.includes('compatible')) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * 转换消息格式为 Gemini 格式
 */
function convertToGeminiFormat(messages: { role: string; content: string }[]) {
  const contents: { role: string; parts: { text: string }[] }[] = [];
  
  for (const msg of messages) {
    // Gemini 不支持 system role，需要转换为 user
    const role = msg.role === 'system' || msg.role === 'user' ? 'user' : 'model';
    
    // 如果上一条消息是相同角色，合并内容
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts.push({ text: msg.content });
    } else {
      contents.push({
        role,
        parts: [{ text: msg.content }]
      });
    }
  }
  
  return contents;
}

/**
 * 发送聊天消息 - Gemini 原生协议
 */
async function sendGeminiMessage(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<ChatAPIResponse> {
  // Gemini API 端点格式: {baseUrl}/v1beta/models/{model}:generateContent
  const url = `${baseUrl.replace(/\/+$/, '')}/v1beta/models/${model}:generateContent`;
  
  const contents = convertToGeminiFormat(messages);
  
  console.log('[AI Chat Gemini] Request config:', { url, model, contentsCount: contents.length });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API 请求失败 (${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch { /* ignore */ }
    return { success: false, error: errorMessage };
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    return { success: false, error: '未收到有效回复' };
  }

  return { success: true, content };
}

/**
 * 流式发送 Gemini 消息
 */
async function* streamGeminiMessage(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<string, void, unknown> {
  // Gemini 流式端点
  const url = `${baseUrl.replace(/\/+$/, '')}/v1beta/models/${model}:streamGenerateContent?alt=sse`;
  
  const contents = convertToGeminiFormat(messages);
  
  console.log('[AI Chat Gemini Stream] Request config:', { url, model });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法获取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield text;
          }
        } catch { /* ignore parse errors */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 发送聊天消息 - OpenAI 兼容协议
 */
async function sendOpenAIMessage(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<ChatAPIResponse> {
  const url = `${baseUrl}/chat/completions`;
  
  console.log('[AI Chat OpenAI] Request config:', { url, model, messagesCount: messages.length });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API 请求失败 (${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch { /* ignore */ }
    return { success: false, error: errorMessage };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return { success: false, error: '未收到有效回复' };
  }

  return { success: true, content };
}

/**
 * 流式发送 OpenAI 消息
 */
async function* streamOpenAIMessage(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<string, void, unknown> {
  const url = `${baseUrl}/chat/completions`;
  
  console.log('[AI Chat OpenAI Stream] Request config:', { url, model });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法获取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch { /* ignore */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 发送聊天消息 (自动选择协议)
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  context: ChatContext
): Promise<ChatAPIResponse> {
  const config = getLLMConfig();
  
  if (!config || !config.apiKey) {
    return { success: false, error: '未配置 API Key，请先在设置中配置' };
  }

  const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = config.model || 'qwen-plus';

  try {
    const systemPrompt = buildSystemPrompt(context);
    const recentMessages = messages.slice(-20);
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map(m => ({ role: m.role as string, content: m.content }))
    ];

    if (isGeminiNativeProtocol(baseUrl, model)) {
      return await sendGeminiMessage(baseUrl, config.apiKey, model, apiMessages);
    } else {
      return await sendOpenAIMessage(baseUrl, config.apiKey, model, apiMessages);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return { success: false, error: error instanceof Error ? error.message : '网络请求失败' };
  }
}

/**
 * 流式发送聊天消息 (自动选择协议)
 */
export async function* streamChatMessage(
  messages: ChatMessage[],
  context: ChatContext
): AsyncGenerator<string, void, unknown> {
  const config = getLLMConfig();
  
  if (!config || !config.apiKey) {
    throw new Error('未配置 API Key');
  }

  const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = config.model || 'qwen-plus';

  const systemPrompt = buildSystemPrompt(context);
  const recentMessages = messages.slice(-20);
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.map(m => ({ role: m.role as string, content: m.content }))
  ];

  if (isGeminiNativeProtocol(baseUrl, model)) {
    yield* streamGeminiMessage(baseUrl, config.apiKey, model, apiMessages);
  } else {
    yield* streamOpenAIMessage(baseUrl, config.apiKey, model, apiMessages);
  }
}

/**
 * 创建新会话
 */
export function createSession(context: ChatContext): ChatSession {
  return {
    id: generateId(),
    title: getSessionTitle(context),
    messages: [],
    context,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * 获取会话标题
 */
function getSessionTitle(context: ChatContext): string {
  const date = new Date().toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  if (context.taskName) {
    return `${context.taskName} - ${date}`;
  }
  
  const pageNames: Record<string, string> = {
    validation: '验证',
    batch: '批量验证',
    history: '历史',
    functions: '函数学习',
    compare: '对比',
    home: '首页'
  };
  
  return `${pageNames[context.currentPage] || '对话'} - ${date}`;
}

/**
 * 创建用户消息
 */
export function createUserMessage(content: string): ChatMessage {
  return { id: generateId(), role: 'user', content, timestamp: Date.now() };
}

/**
 * 创建助手消息
 */
export function createAssistantMessage(content: string): ChatMessage {
  return { id: generateId(), role: 'assistant', content, timestamp: Date.now() };
}

/**
 * 创建加载中消息
 */
export function createLoadingMessage(): ChatMessage {
  return { id: generateId(), role: 'assistant', content: '', timestamp: Date.now(), isLoading: true };
}

/**
 * 保存会话列表
 */
export function saveSessions(sessions: ChatSession[]): void {
  try {
    const trimmed = sessions.slice(0, MAX_SESSIONS).map(s => ({
      ...s,
      messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION)
    }));
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save chat sessions:', error);
  }
}

/**
 * 加载会话列表
 */
export function loadSessions(): ChatSession[] {
  try {
    const data = localStorage.getItem(CHAT_HISTORY_KEY);
    if (data) return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load chat sessions:', error);
  }
  return [];
}

/**
 * 清除所有会话
 */
export function clearSessions(): void {
  localStorage.removeItem(CHAT_HISTORY_KEY);
}

/**
 * 检查 LLM 是否已配置
 */
export { isLLMConfigured };
