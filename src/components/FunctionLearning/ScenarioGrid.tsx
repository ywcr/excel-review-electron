/**
 * 分类网格组件
 */
import { CategoryInfo, FunctionCategory } from '../../../shared/function-library';

interface ScenarioGridProps {
  categories: CategoryInfo[];
  onCategoryClick: (category: FunctionCategory) => void;
  onLabClick: () => void;
}

export function ScenarioGrid({ categories, onCategoryClick, onLabClick }: ScenarioGridProps) {
  return (
    <div className="fl-scenario-section">
      <h3 className="fl-section-title">快速入口</h3>
      <div className="fl-scenario-grid">
        {categories.map(category => (
          <button
            key={category.id}
            className="fl-scenario-card"
            onClick={() => onCategoryClick(category.id)}
          >
            <span className="fl-scenario-icon">{category.icon}</span>
            <span className="fl-scenario-name">{category.name}</span>
          </button>
        ))}
        
        {/* 公式实验室入口 */}
        <button
          className="fl-scenario-card lab"
          onClick={onLabClick}
        >
          <span className="fl-scenario-icon">🧪</span>
          <span className="fl-scenario-name">公式实验室</span>
        </button>
      </div>
    </div>
  );
}
