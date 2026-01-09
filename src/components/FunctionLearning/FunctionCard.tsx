/**
 * 函数卡片组件
 */
import { ExcelFunction } from '../../../shared/function-library';

interface FunctionCardProps {
  function: ExcelFunction;
  onClick: () => void;
}

const difficultyLabels = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export function FunctionCard({ function: fn, onClick }: FunctionCardProps) {
  return (
    <div className="fl-function-card" onClick={onClick}>
      <span className="fl-function-name">{fn.name}</span>
      <div className="fl-function-info">
        <div className="fl-function-name-zh">{fn.nameZh}</div>
        <p className="fl-function-desc">{fn.description}</p>
      </div>
      <div className="fl-function-meta">
        <span className={`fl-function-difficulty ${fn.difficulty}`}>
          {difficultyLabels[fn.difficulty]}
        </span>
      </div>
    </div>
  );
}
