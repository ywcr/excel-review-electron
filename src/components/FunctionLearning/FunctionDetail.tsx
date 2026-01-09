/**
 * 函数详情组件
 */
import { useState, useEffect } from 'react';
import { ExcelFunction, CATEGORIES, getFunctionByName } from '../../../shared/function-library';
import { 
  isFavorite, 
  addFavorite, 
  removeFavorite,
  recordFunctionView 
} from './learning-progress';

interface FunctionDetailProps {
  function: ExcelFunction;
  onBack: () => void;
  onOpenLab: () => void;
  onRelatedClick?: (name: string) => void;
}

const difficultyLabels = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export function FunctionDetail({ 
  function: fn, 
  onBack, 
  onOpenLab,
  onRelatedClick 
}: FunctionDetailProps) {
  const categoryInfo = CATEGORIES.find(c => c.id === fn.category);
  const [isFav, setIsFav] = useState(false);

  // 记录函数查看
  useEffect(() => {
    recordFunctionView(fn.name);
    setIsFav(isFavorite('function', fn.name));
  }, [fn.name]);

  const handleToggleFavorite = () => {
    if (isFav) {
      removeFavorite('function', fn.name);
    } else {
      addFavorite('function', fn.name);
    }
    setIsFav(!isFav);
  };

  const handleRelatedClick = (name: string) => {
    const relatedFn = getFunctionByName(name);
    if (relatedFn && onRelatedClick) {
      onRelatedClick(name);
    }
  };

  return (
    <div className="fl-detail-view">
      <div className="fl-detail-top-bar">
        <button className="fl-back-btn" onClick={onBack}>
          ← 返回
        </button>
        <button 
          className={`fl-favorite-btn ${isFav ? 'active' : ''}`}
          onClick={handleToggleFavorite}
        >
          <span className="icon">{isFav ? '★' : '☆'}</span>
          {isFav ? '已收藏' : '收藏'}
        </button>
      </div>

      {/* 头部信息 */}
      <div className="fl-detail-header">
        <div className="fl-detail-title">
          <h1 className="fl-detail-name">{fn.name}</h1>
          <span className="fl-detail-name-zh">{fn.nameZh}</span>
        </div>
        <div className="fl-detail-meta">
          <span 
            className="fl-detail-tag" 
            style={{ background: `${categoryInfo?.color}20`, color: categoryInfo?.color }}
          >
            {categoryInfo?.icon} {categoryInfo?.name}
          </span>
          <span className={`fl-detail-tag fl-function-difficulty ${fn.difficulty}`}>
            {difficultyLabels[fn.difficulty]}
          </span>
        </div>
        <p className="fl-detail-desc">{fn.description}</p>
      </div>

      {/* 语法格式 */}
      <div className="fl-detail-section">
        <h3 className="fl-detail-section-title">📝 语法格式</h3>
        <div className="fl-syntax-box">{fn.syntax}</div>
      </div>

      {/* 参数说明 */}
      <div className="fl-detail-section">
        <h3 className="fl-detail-section-title">📋 参数说明</h3>
        <table className="fl-params-table">
          <thead>
            <tr>
              <th>参数</th>
              <th>中文名</th>
              <th>必填</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {fn.parameters.map((param, idx) => (
              <tr key={idx}>
                <td className="fl-param-name">{param.name}</td>
                <td>{param.nameZh}</td>
                <td>
                  <span className={`fl-param-required ${param.required ? 'yes' : 'no'}`}>
                    {param.required ? '必填' : '可选'}
                  </span>
                </td>
                <td>
                  {param.description}
                  {param.defaultValue && (
                    <span style={{ color: '#71717a' }}> (默认: {param.defaultValue})</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 使用示例 */}
      <div className="fl-detail-section">
        <h3 className="fl-detail-section-title">💡 使用示例</h3>
        {fn.examples.map((example, idx) => (
          <div className="fl-example-card" key={idx}>
            <div className="fl-example-formula">{example.formula}</div>
            <div className="fl-example-desc">{example.description}</div>
            <div className="fl-example-result">
              结果: <strong>{example.expectedResult}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* 使用技巧 */}
      {fn.tips.length > 0 && (
        <div className="fl-detail-section">
          <h3 className="fl-detail-section-title">✨ 使用技巧</h3>
          <ul className="fl-tips-list">
            {fn.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 注意事项 */}
      {fn.warnings.length > 0 && (
        <div className="fl-detail-section">
          <h3 className="fl-detail-section-title">⚠️ 注意事项</h3>
          <ul className="fl-warnings-list">
            {fn.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 相关函数 */}
      {fn.relatedFunctions.length > 0 && (
        <div className="fl-detail-section">
          <h3 className="fl-detail-section-title">🔗 相关函数</h3>
          <div className="fl-related-list">
            {fn.relatedFunctions.map((name) => (
              <button
                key={name}
                className="fl-related-item"
                onClick={() => handleRelatedClick(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 底部操作 */}
      <div className="fl-detail-actions">
        <button className="fl-lab-btn" onClick={onOpenLab}>
          🧪 在实验室中尝试
        </button>
      </div>
    </div>
  );
}
