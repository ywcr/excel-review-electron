/**
 * 收藏夹页面组件
 */
import { useState, useMemo } from 'react';
import { 
  getFavorites, 
  removeFavorite, 
  FavoriteItem 
} from './learning-progress';
import { getFunctionByName } from '../../../shared/function-library';
import { getScenarioById } from '../../../shared/function-library/scenarios';

interface FavoritesPageProps {
  onFunctionClick: (name: string) => void;
  onScenarioClick: (id: string) => void;
  onBack: () => void;
}

export function FavoritesPage({ 
  onFunctionClick, 
  onScenarioClick, 
  onBack 
}: FavoritesPageProps) {
  const [filter, setFilter] = useState<'all' | 'function' | 'scenario'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const favorites = useMemo(() => {
    const allFavorites = getFavorites();
    if (filter === 'all') return allFavorites;
    return allFavorites.filter(f => f.type === filter);
  }, [filter, refreshKey]);

  const handleRemove = (fav: FavoriteItem) => {
    removeFavorite(fav.type, fav.id);
    setRefreshKey(k => k + 1);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fl-favorites-page">
      <button className="fl-back-btn" onClick={onBack}>
        ← 返回首页
      </button>

      <div className="fl-favorites-header">
        <h2>⭐ 我的收藏</h2>
        <p>共 {favorites.length} 项收藏</p>
      </div>

      {/* 筛选 */}
      <div className="fl-favorites-filter">
        <button 
          className={`fl-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
        <button 
          className={`fl-filter-btn ${filter === 'function' ? 'active' : ''}`}
          onClick={() => setFilter('function')}
        >
          📘 函数
        </button>
        <button 
          className={`fl-filter-btn ${filter === 'scenario' ? 'active' : ''}`}
          onClick={() => setFilter('scenario')}
        >
          📚 场景
        </button>
      </div>

      {/* 收藏列表 */}
      {favorites.length > 0 ? (
        <div className="fl-favorites-list">
          {favorites.map(fav => {
            if (fav.type === 'function') {
              const fn = getFunctionByName(fav.id);
              return (
                <div key={`fn-${fav.id}`} className="fl-favorite-card">
                  <div 
                    className="fl-favorite-content"
                    onClick={() => onFunctionClick(fav.id)}
                  >
                    <div className="fl-favorite-type">📘 函数</div>
                    <h4>{fav.id}</h4>
                    <p>{fn?.nameZh || fn?.description || ''}</p>
                    <span className="fl-favorite-date">
                      收藏于 {formatDate(fav.addedAt)}
                    </span>
                  </div>
                  <button 
                    className="fl-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(fav);
                    }}
                    title="取消收藏"
                  >
                    ✕
                  </button>
                </div>
              );
            } else {
              const scenario = getScenarioById(fav.id);
              return (
                <div key={`sc-${fav.id}`} className="fl-favorite-card">
                  <div 
                    className="fl-favorite-content"
                    onClick={() => onScenarioClick(fav.id)}
                  >
                    <div className="fl-favorite-type">📚 场景</div>
                    <h4>{scenario?.title || fav.id}</h4>
                    <p>{scenario?.description || ''}</p>
                    <span className="fl-favorite-date">
                      收藏于 {formatDate(fav.addedAt)}
                    </span>
                  </div>
                  <button 
                    className="fl-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(fav);
                    }}
                    title="取消收藏"
                  >
                    ✕
                  </button>
                </div>
              );
            }
          })}
        </div>
      ) : (
        <div className="fl-favorites-empty">
          <div className="fl-empty-icon">⭐</div>
          <h4>暂无收藏</h4>
          <p>在函数详情或场景页面点击"收藏"按钮添加</p>
        </div>
      )}
    </div>
  );
}
