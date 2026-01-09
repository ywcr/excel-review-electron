/**
 * 聊天输入框组件
 */
import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ChatInput({ onSend, disabled, isLoading }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
      // 重置高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 自动调整高度
  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="ai-chat-input-container">
      <div className="ai-chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="ai-chat-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={disabled ? '请先配置 API Key' : '输入问题，按 Enter 发送...'}
          disabled={disabled}
          rows={1}
        />
        <button 
          className="ai-send-btn" 
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
        >
          {isLoading ? (
            <span className="ai-send-loading">⏳</span>
          ) : (
            <span>➤</span>
          )}
        </button>
      </div>
      <div className="ai-input-hint">
        按 Enter 发送，Shift + Enter 换行
      </div>
    </div>
  );
}
