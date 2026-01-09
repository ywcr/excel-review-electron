/**
 * 聊天消息气泡组件
 */
import { ChatMessage as ChatMessageType } from '../../../shared/ai-chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // 加载状态
  if (message.isLoading) {
    return (
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
    );
  }

  // 错误状态
  if (message.error) {
    return (
      <div className="ai-message ai-message-assistant">
        <div className="ai-message-avatar">🤖</div>
        <div className="ai-message-content error">
          <div className="ai-error-icon">⚠️</div>
          <span>{message.error}</span>
        </div>
      </div>
    );
  }

  // 简单的 Markdown 渲染（代码块和加粗）
  const renderContent = (content: string) => {
    // 处理代码块
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```(\w*)\n?/, '').replace(/```$/, '');
        return (
          <pre key={idx} className="ai-code-block">
            <code>{code}</code>
          </pre>
        );
      }
      
      // 处理行内代码和加粗
      const formatted = part
        .split(/(`[^`]+`)/g)
        .map((segment, i) => {
          if (segment.startsWith('`') && segment.endsWith('`')) {
            return <code key={i} className="ai-inline-code">{segment.slice(1, -1)}</code>;
          }
          // 处理加粗
          return segment.split(/(\*\*[^*]+\*\*)/g).map((s, j) => {
            if (s.startsWith('**') && s.endsWith('**')) {
              return <strong key={`${i}-${j}`}>{s.slice(2, -2)}</strong>;
            }
            return s;
          });
        });
      
      return <span key={idx}>{formatted}</span>;
    });
  };

  return (
    <div className={`ai-message ai-message-${isUser ? 'user' : 'assistant'}`}>
      <div className="ai-message-avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="ai-message-content">
        {renderContent(message.content)}
      </div>
    </div>
  );
}
