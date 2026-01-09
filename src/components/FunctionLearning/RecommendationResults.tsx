/**
 * 智能推荐结果组件
 */
import { RecommendationResult } from '../../../shared/function-library/ai';
import { ExcelFunction } from '../../../shared/function-library';

interface RecommendationResultsProps {
  results: RecommendationResult[];
  query: string;
  onFunctionClick: (fn: ExcelFunction) => void;
  onBack: () => void;
}

export function RecommendationResults({ 
  results, 
  query, 
  onFunctionClick, 
  onBack 
}: RecommendationResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#059669';
    if (score >= 50) return '#d97706';
    return '#6b7280';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '高度匹配';
    if (score >= 50) return '较为相关';
    return '可能相关';
  };

  return (
    <div className="fl-recommend-view">
      <button className="fl-back-btn" onClick={onBack}>
        ← 返回首页
      </button>

      <div className="fl-recommend-header">
        <h2>🤖 智能推荐结果</h2>
        <p className="fl-recommend-query">
          你的问题：<strong>"{query}"</strong>
        </p>
        <p className="fl-recommend-count">
          为你找到 {results.length} 个推荐函数
        </p>
      </div>

      {results.length > 0 ? (
        <div className="fl-recommend-list">
          {results.map((result, index) => (
            <div 
              key={result.function.name}
              className="fl-recommend-card"
              onClick={() => onFunctionClick(result.function)}
            >
              <div className="fl-recommend-card-rank">
                #{index + 1}
              </div>
              
              <div className="fl-recommend-card-main">
                <div className="fl-recommend-card-header">
                  <span className="fl-recommend-func-name">
                    {result.function.name}
                  </span>
                  <span className="fl-recommend-func-name-zh">
                    {result.function.nameZh}
                  </span>
                  <span 
                    className="fl-recommend-score"
                    style={{ color: getScoreColor(result.score) }}
                  >
                    {getScoreLabel(result.score)} ({Math.round(result.score)}%)
                  </span>
                </div>
                
                <p className="fl-recommend-reason">{result.reason}</p>
                
                {result.matchedKeywords.length > 0 && (
                  <div className="fl-recommend-keywords">
                    <span className="fl-recommend-keywords-label">匹配关键词：</span>
                    {result.matchedKeywords.slice(0, 4).map((kw, idx) => (
                      <span key={idx} className="fl-recommend-keyword">{kw}</span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="fl-recommend-card-arrow">
                →
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fl-recommend-empty">
          <div className="fl-recommend-empty-icon">🔍</div>
          <h3>未找到匹配的函数</h3>
          <p>试试用其他方式描述你的问题，例如：</p>
          <ul>
            <li>"根据员工工号查找姓名"</li>
            <li>"计算销售部的总销售额"</li>
            <li>"判断成绩是否及格"</li>
          </ul>
        </div>
      )}

      {results.length > 0 && (
        <div className="fl-recommend-tips">
          <h4>💡 使用提示</h4>
          <p>点击函数卡片查看详细用法，或在"公式实验室"中直接尝试</p>
        </div>
      )}
    </div>
  );
}
