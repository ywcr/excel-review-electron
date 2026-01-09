/**
 * 场景详情页组件
 */
import { useState } from 'react';
import { Scenario } from '../../../shared/function-library/scenarios';

interface ScenarioDetailProps {
  scenario: Scenario;
  onBack: () => void;
  onOpenLab: (formula: string) => void;
}

export function ScenarioDetail({ scenario, onBack, onOpenLab }: ScenarioDetailProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const difficultyLabel = {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级'
  };

  const difficultyColor = {
    beginner: '#22c55e',
    intermediate: '#f59e0b',
    advanced: '#ef4444'
  };

  return (
    <div className="fl-scenario-detail">
      <button className="fl-back-btn" onClick={onBack}>
        ← 返回场景列表
      </button>

      {/* 标题区 */}
      <div className="fl-scenario-header">
        <h2>{scenario.title}</h2>
        <div className="fl-scenario-meta">
          <span 
            className="fl-difficulty-tag"
            style={{ backgroundColor: difficultyColor[scenario.difficulty] }}
          >
            {difficultyLabel[scenario.difficulty]}
          </span>
          {scenario.tags.map(tag => (
            <span key={tag} className="fl-tag">{tag}</span>
          ))}
        </div>
        <p className="fl-scenario-desc">{scenario.description}</p>
      </div>

      {/* 业务背景 */}
      <div className="fl-section">
        <h3>📋 业务背景</h3>
        <div className="fl-context-box">
          {scenario.businessContext.trim()}
        </div>
      </div>

      {/* 学习目标 */}
      <div className="fl-section">
        <h3>🎯 学习目标</h3>
        <ul className="fl-goal-list">
          {scenario.learningGoals.map((goal, idx) => (
            <li key={idx}>{goal}</li>
          ))}
        </ul>
      </div>

      {/* 涉及函数 */}
      <div className="fl-section">
        <h3>📦 涉及函数</h3>
        <div className="fl-function-tags">
          {scenario.functions.map(fn => (
            <span key={fn} className="fl-function-tag">{fn}</span>
          ))}
        </div>
      </div>

      {/* 示例数据 */}
      <div className="fl-section">
        <h3>📊 示例数据</h3>
        <div className="fl-data-table-wrapper">
          <table className="fl-data-table">
            <thead>
              <tr>
                <th></th>
                {scenario.sampleData.headers.map((h, idx) => (
                  <th key={idx}>{String.fromCharCode(65 + idx)}</th>
                ))}
              </tr>
              <tr>
                <th>1</th>
                {scenario.sampleData.headers.map((h, idx) => (
                  <td key={idx} className="header-cell">{h}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenario.sampleData.rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <th>{rowIdx + 2}</th>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 解决步骤 */}
      <div className="fl-section">
        <h3>🚀 解决步骤</h3>
        <div className="fl-steps">
          {scenario.steps.map((step, idx) => (
            <div 
              key={idx} 
              className={`fl-step ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(idx)}
            >
              <div className="fl-step-number">{idx + 1}</div>
              <div className="fl-step-content">
                <h4>{step.title}</h4>
                <p>{step.description}</p>
                {step.formula && (
                  <div className="fl-step-formula">
                    <code>{step.formula}</code>
                    <button 
                      className="fl-try-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLab(step.formula!);
                      }}
                    >
                      在实验室尝试 →
                    </button>
                  </div>
                )}
                {step.expectedResult && (
                  <div className="fl-expected">
                    预期结果：<strong>{step.expectedResult}</strong>
                  </div>
                )}
                {step.hint && (
                  <div className="fl-hint">💡 {step.hint}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="fl-step-nav">
          <button 
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(s => s - 1)}
          >
            ← 上一步
          </button>
          <span>步骤 {currentStep + 1} / {scenario.steps.length}</span>
          <button 
            disabled={currentStep === scenario.steps.length - 1}
            onClick={() => setCurrentStep(s => s + 1)}
          >
            下一步 →
          </button>
        </div>
      </div>

      {/* 完整解决方案 */}
      <div className="fl-section">
        <h3>✅ 完整解决方案</h3>
        <button 
          className="fl-reveal-btn"
          onClick={() => setShowSolution(!showSolution)}
        >
          {showSolution ? '隐藏答案' : '显示答案'}
        </button>
        {showSolution && (
          <div className="fl-solution">
            <div className="fl-solution-formula">
              <code>{scenario.solution.formula}</code>
              <button 
                className="fl-try-btn"
                onClick={() => onOpenLab(scenario.solution.formula)}
              >
                在实验室尝试 →
              </button>
            </div>
            <div className="fl-solution-explanation">
              <h4>解析：</h4>
              <pre>{scenario.solution.explanation.trim()}</pre>
            </div>
          </div>
        )}
      </div>

      {/* 扩展练习 */}
      {scenario.exercises && scenario.exercises.length > 0 && (
        <div className="fl-section">
          <h3>📝 扩展练习</h3>
          <div className="fl-exercises">
            {scenario.exercises.map((ex, idx) => (
              <details key={idx} className="fl-exercise">
                <summary>练习 {idx + 1}：{ex.question}</summary>
                <div className="fl-answer">
                  <code>{ex.answer}</code>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
