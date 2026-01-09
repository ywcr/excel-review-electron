/**
 * 学习进度统计面板组件
 */
import { useMemo } from 'react';
import { 
  getLearningStats, 
  getRecentFunctions, 
  getInProgressScenarios,
  getFavorites,
  FavoriteItem 
} from './learning-progress';
import { getScenarioById } from '../../../shared/function-library/scenarios';

interface LearningDashboardProps {
  onFunctionClick: (name: string) => void;
  onScenarioClick: (id: string) => void;
  onViewFavorites: () => void;
}

export function LearningDashboard({ 
  onFunctionClick, 
  onScenarioClick,
  onViewFavorites 
}: LearningDashboardProps) {
  const stats = useMemo(() => getLearningStats(), []);
  const recentFunctions = useMemo(() => getRecentFunctions(5), []);
  const inProgressScenarios = useMemo(() => getInProgressScenarios(), []);
  const favorites = useMemo(() => getFavorites(), []);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  };

  return (
    <div className="fl-dashboard">
      {/* 学习统计 */}
      <div className="fl-dashboard-stats">
        <h3>📊 学习统计</h3>
        <div className="fl-stats-grid">
          <div className="fl-stat-card">
            <span className="fl-stat-value">{stats.totalFunctionsViewed}</span>
            <span className="fl-stat-label">已学函数</span>
          </div>
          <div className="fl-stat-card">
            <span className="fl-stat-value">{stats.totalFunctionsPracticed}</span>
            <span className="fl-stat-label">已练习</span>
          </div>
          <div className="fl-stat-card">
            <span className="fl-stat-value">{stats.totalScenariosStarted}</span>
            <span className="fl-stat-label">开始场景</span>
          </div>
          <div className="fl-stat-card completed">
            <span className="fl-stat-value">{stats.totalScenariosCompleted}</span>
            <span className="fl-stat-label">完成场景</span>
          </div>
        </div>
      </div>

      {/* 继续学习 */}
      {inProgressScenarios.length > 0 && (
        <div className="fl-dashboard-section">
          <h3>📚 继续学习</h3>
          <div className="fl-continue-list">
            {inProgressScenarios.slice(0, 3).map(progress => {
              const scenario = getScenarioById(progress.id);
              if (!scenario) return null;
              
              const progressPercent = Math.round((progress.currentStep / progress.totalSteps) * 100);
              
              return (
                <div 
                  key={progress.id}
                  className="fl-continue-item"
                  onClick={() => onScenarioClick(progress.id)}
                >
                  <div className="fl-continue-info">
                    <span className="fl-continue-title">{scenario.title}</span>
                    <span className="fl-continue-progress">
                      步骤 {progress.currentStep + 1}/{progress.totalSteps}
                    </span>
                  </div>
                  <div className="fl-progress-bar">
                    <div 
                      className="fl-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 最近学习 */}
      {recentFunctions.length > 0 && (
        <div className="fl-dashboard-section">
          <h3>🕐 最近学习</h3>
          <div className="fl-recent-list">
            {recentFunctions.map(fn => (
              <div 
                key={fn.name}
                className="fl-recent-item"
                onClick={() => onFunctionClick(fn.name)}
              >
                <span className="fl-recent-name">{fn.name}</span>
                <span className="fl-recent-meta">
                  {fn.practiced && <span className="fl-practiced-badge">已练习</span>}
                  <span className="fl-recent-time">
                    {fn.viewedAt && formatTime(fn.viewedAt)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 我的收藏 */}
      {favorites.length > 0 && (
        <div className="fl-dashboard-section">
          <div className="fl-section-header">
            <h3>⭐ 我的收藏</h3>
            <button className="fl-view-all-btn" onClick={onViewFavorites}>
              查看全部 ({favorites.length})
            </button>
          </div>
          <div className="fl-favorites-preview">
            {favorites.slice(0, 5).map((fav: FavoriteItem) => (
              <span 
                key={`${fav.type}-${fav.id}`}
                className={`fl-fav-tag ${fav.type}`}
                onClick={() => fav.type === 'function' 
                  ? onFunctionClick(fav.id) 
                  : onScenarioClick(fav.id)
                }
              >
                {fav.type === 'function' ? '📘' : '📚'} {fav.id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {stats.totalFunctionsViewed === 0 && (
        <div className="fl-dashboard-empty">
          <div className="fl-empty-icon">🎯</div>
          <h4>开始你的学习之旅</h4>
          <p>浏览函数库或尝试实战场景，你的学习进度会在这里显示</p>
        </div>
      )}
    </div>
  );
}
