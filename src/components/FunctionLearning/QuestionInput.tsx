/**
 * 问题输入组件
 */

interface QuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function QuestionInput({ value, onChange, onSubmit }: QuestionInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit(value);
    }
  };

  return (
    <div className="fl-question-section">
      <h2>🔍 描述你想解决的问题</h2>
      <div className="fl-question-input-wrapper">
        <input
          type="text"
          className="fl-question-input"
          placeholder="例如：我想根据姓名查找对应的电话号码..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button 
          className="fl-question-btn"
          onClick={() => onSubmit(value)}
        >
          智能推荐
        </button>
      </div>
    </div>
  );
}
