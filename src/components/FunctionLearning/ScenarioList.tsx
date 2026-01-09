/**
 * 场景列表组件
 */
import { Scenario } from '../../../shared/function-library/scenarios';

interface ScenarioListProps {
  scenarios: Scenario[];
  onScenarioClick: (scenario: Scenario) => void;
  onBack: () => void;
  title?: string;
}

export function ScenarioList({ scenarios, onScenarioClick, onBack, title = '场景案例' }: ScenarioListProps) {
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
    <div className="fl-scenario-list-view">
      <button className="fl-back-btn" onClick={onBack}>
        ← 返回首页
      </button>

      <div className="fl-list-header">
        <h2>📚 {title}</h2>
        <p>共 {scenarios.length} 个实战案例</p>
      </div>

      <div className="fl-scenario-grid">
        {scenarios.map(scenario => (
          <div 
            key={scenario.id} 
            className="fl-scenario-card"
            onClick={() => onScenarioClick(scenario)}
          >
            <div className="fl-scenario-card-header">
              <h3>{scenario.title}</h3>
              <span 
                className="fl-difficulty-badge"
                style={{ backgroundColor: difficultyColor[scenario.difficulty] }}
              >
                {difficultyLabel[scenario.difficulty]}
              </span>
            </div>
            <p className="fl-scenario-card-desc">{scenario.description}</p>
            <div className="fl-scenario-card-meta">
              <div className="fl-scenario-functions">
                {scenario.functions.slice(0, 3).map(fn => (
                  <span key={fn} className="fl-mini-tag">{fn}</span>
                ))}
                {scenario.functions.length > 3 && (
                  <span className="fl-mini-tag more">+{scenario.functions.length - 3}</span>
                )}
              </div>
              <div className="fl-scenario-tags">
                {scenario.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="fl-tag-small">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {scenarios.length === 0 && (
        <div className="fl-empty-state">
          <p>暂无相关场景案例</p>
        </div>
      )}
    </div>
  );
}
