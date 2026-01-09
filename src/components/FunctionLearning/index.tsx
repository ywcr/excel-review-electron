/**
 * 函数学习模块 - 主入口组件
 */
import { useState, useMemo, useCallback } from 'react';
import { QuestionInput } from './QuestionInput';
import { ScenarioGrid } from './ScenarioGrid';
import { FunctionCard } from './FunctionCard';
import { FunctionDetail } from './FunctionDetail';
import { FormulaLab } from './FormulaLab';
import { ScenarioList } from './ScenarioList';
import { ScenarioDetail } from './ScenarioDetail';
import { RecommendationResults } from './RecommendationResults';
import { LearningDashboard } from './LearningDashboard';
import { LLMSettings } from './LLMSettings';
import { FavoritesPage } from './FavoritesPage';
import { 
  ExcelFunction, 
  FunctionCategory,
  getPopularFunctions,
  getFunctionByName,
  CATEGORIES,
  getFunctionsByCategory
} from '../../../shared/function-library';
import { 
  Scenario,
  ALL_SCENARIOS,
  getPopularScenarios,
  getScenarioById
} from '../../../shared/function-library/scenarios';
import { 
  recommendFunctions, 
  RecommendationResult,
  getExampleQueries,
  isLLMConfigured,
  getLLMRecommendations,
  convertLLMToRecommendation
} from '../../../shared/function-library/ai';
import { getLearningStats } from './learning-progress';
import './FunctionLearning.css';

type ViewMode = 'home' | 'category' | 'detail' | 'lab' | 'scenarios' | 'scenario-detail' | 'recommend' | 'favorites';

export function FunctionLearning() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [selectedFunction, setSelectedFunction] = useState<ExcelFunction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FunctionCategory | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendResults, setRecommendResults] = useState<RecommendationResult[]>([]);
  const [labFormula, setLabFormula] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [usedLLM, setUsedLLM] = useState(false);

  // 热门函数列表
  const popularFunctions = useMemo(() => getPopularFunctions(5), []);
  
  // 热门场景列表
  const popularScenarios = useMemo(() => getPopularScenarios(3), []);
  
  // 示例问题
  const exampleQueries = useMemo(() => getExampleQueries().slice(0, 5), []);

  // 学习统计
  const stats = useMemo(() => getLearningStats(), [refreshKey]);
  const hasLearningProgress = stats.totalFunctionsViewed > 0 || stats.totalScenariosStarted > 0;

  // 处理智能推荐 (混合模式：本地规则 + LLM)
  const handleSmartSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setRecommendResults([]);
      setViewMode('home');
      return;
    }

    setIsSearching(true);
    setViewMode('recommend');
    setUsedLLM(false);

    // 先用本地规则快速返回
    const localResults = recommendFunctions(query, 8);
    setRecommendResults(localResults);

    // 如果配置了 LLM，尝试获取更智能的推荐
    if (isLLMConfigured()) {
      try {
        const llmResponse = await getLLMRecommendations(query);
        if (llmResponse.success && llmResponse.recommendations.length > 0) {
          const llmResults = llmResponse.recommendations
            .map(rec => convertLLMToRecommendation(rec))
            .filter((r): r is RecommendationResult => r !== null);
          
          if (llmResults.length > 0) {
            // 合并 LLM 结果和本地结果，去重
            const merged = [...llmResults];
            const llmFunctionNames = new Set(llmResults.map(r => r.function.name));
            
            for (const local of localResults) {
              if (!llmFunctionNames.has(local.function.name)) {
                merged.push(local);
              }
            }
            
            setRecommendResults(merged.slice(0, 8));
            setUsedLLM(true);
          }
        }
      } catch (error) {
        console.error('LLM recommendation failed, using local results:', error);
      }
    }

    setIsSearching(false);
  };

  // 处理分类点击
  const handleCategoryClick = (category: FunctionCategory) => {
    setSelectedCategory(category);
    setViewMode('category');
  };

  // 处理函数点击 (支持通过名称)
  const handleFunctionClick = useCallback((fnOrName: ExcelFunction | string) => {
    const fn = typeof fnOrName === 'string' ? getFunctionByName(fnOrName) : fnOrName;
    if (fn) {
      setSelectedFunction(fn);
      setViewMode('detail');
    }
  }, []);

  // 处理场景点击 (支持通过ID)
  const handleScenarioClick = useCallback((scenarioOrId: Scenario | string) => {
    const scenario = typeof scenarioOrId === 'string' 
      ? getScenarioById(scenarioOrId) 
      : scenarioOrId;
    if (scenario) {
      setSelectedScenario(scenario);
      setViewMode('scenario-detail');
    }
  }, []);

  // 处理返回
  const handleBack = () => {
    if (viewMode === 'detail') {
      if (selectedCategory) {
        setViewMode('category');
      } else if (searchQuery && recommendResults.length > 0) {
        setViewMode('recommend');
      } else {
        setViewMode('home');
      }
      setSelectedFunction(null);
    } else if (viewMode === 'scenario-detail') {
      setViewMode('scenarios');
      setSelectedScenario(null);
    } else if (viewMode === 'category' || viewMode === 'recommend' || viewMode === 'lab' || viewMode === 'scenarios' || viewMode === 'favorites') {
      setSelectedCategory(null);
      setSearchQuery('');
      setRecommendResults([]);
      setRefreshKey(k => k + 1); // 刷新学习进度
      setViewMode('home');
    }
  };

  // 打开公式实验室
  const handleOpenLab = (fnOrFormula?: ExcelFunction | string) => {
    if (typeof fnOrFormula === 'string') {
      setLabFormula(fnOrFormula);
      setSelectedFunction(null);
    } else if (fnOrFormula) {
      setSelectedFunction(fnOrFormula);
      setLabFormula('');
    } else {
      setLabFormula('');
    }
    setViewMode('lab');
  };

  // 获取当前分类的函数列表
  const categoryFunctions = useMemo(() => {
    if (!selectedCategory) return [];
    return getFunctionsByCategory(selectedCategory);
  }, [selectedCategory]);

  // 获取当前分类信息
  const currentCategoryInfo = useMemo(() => {
    if (!selectedCategory) return null;
    return CATEGORIES.find(c => c.id === selectedCategory);
  }, [selectedCategory]);

  const renderContent = () => {
    switch (viewMode) {
      case 'detail':
        return selectedFunction ? (
          <FunctionDetail 
            function={selectedFunction} 
            onBack={handleBack}
            onOpenLab={() => handleOpenLab(selectedFunction)}
            onRelatedClick={(name) => handleFunctionClick(name)}
          />
        ) : null;

      case 'lab':
        return (
          <FormulaLab 
            initialFunction={selectedFunction}
            initialFormula={labFormula}
            onBack={handleBack}
          />
        );

      case 'scenarios':
        return (
          <ScenarioList
            scenarios={ALL_SCENARIOS}
            onScenarioClick={handleScenarioClick}
            onBack={handleBack}
            title="实战场景案例"
          />
        );

      case 'scenario-detail':
        return selectedScenario ? (
          <ScenarioDetail
            scenario={selectedScenario}
            onBack={handleBack}
            onOpenLab={(formula) => handleOpenLab(formula)}
          />
        ) : null;

      case 'recommend':
        return (
          <RecommendationResults
            results={recommendResults}
            query={searchQuery}
            onFunctionClick={handleFunctionClick}
            onBack={handleBack}
          />
        );

      case 'favorites':
        return (
          <FavoritesPage
            onFunctionClick={(name) => handleFunctionClick(name)}
            onScenarioClick={(id) => handleScenarioClick(id)}
            onBack={handleBack}
          />
        );

      case 'category':
        return (
          <div className="fl-category-view">
            <button className="fl-back-btn" onClick={handleBack}>
              ← 返回
            </button>
            <div className="fl-category-header">
              <span className="fl-category-icon">{currentCategoryInfo?.icon}</span>
              <h2>{currentCategoryInfo?.name}</h2>
              <p className="fl-category-desc">{currentCategoryInfo?.description}</p>
            </div>
            <div className="fl-function-list">
              {categoryFunctions.map(fn => (
                <FunctionCard 
                  key={fn.name} 
                  function={fn} 
                  onClick={() => handleFunctionClick(fn)}
                />
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="fl-home">
            {/* 学习仪表板 - 有学习记录时显示 */}
            {hasLearningProgress && (
              <LearningDashboard
                onFunctionClick={(name) => handleFunctionClick(name)}
                onScenarioClick={(id) => handleScenarioClick(id)}
                onViewFavorites={() => setViewMode('favorites')}
              />
            )}

            {/* 问题输入 */}
            <QuestionInput 
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSmartSearch}
            />

            {/* 示例问题 */}
            <div className="fl-examples-section">
              <span className="fl-examples-label">试试问：</span>
              <div className="fl-examples-list">
                {exampleQueries.map((q, idx) => (
                  <button 
                    key={idx}
                    className="fl-example-btn"
                    onClick={() => handleSmartSearch(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* 快速入口 - 分类网格 */}
            <ScenarioGrid 
              categories={CATEGORIES}
              onCategoryClick={handleCategoryClick}
              onLabClick={() => handleOpenLab()}
            />

            {/* 实战场景入口 */}
            <div className="fl-scenarios-section">
              <div className="fl-section-header">
                <h3 className="fl-section-title">📚 实战场景</h3>
                <button 
                  className="fl-view-all-btn"
                  onClick={() => setViewMode('scenarios')}
                >
                  查看全部 →
                </button>
              </div>
              <div className="fl-scenario-preview-list">
                {popularScenarios.map(scenario => (
                  <div 
                    key={scenario.id}
                    className="fl-scenario-preview-card"
                    onClick={() => handleScenarioClick(scenario)}
                  >
                    <h4>{scenario.title}</h4>
                    <p>{scenario.description}</p>
                    <div className="fl-scenario-preview-meta">
                      <span className={`fl-diff-${scenario.difficulty}`}>
                        {scenario.difficulty === 'beginner' ? '初级' : 
                         scenario.difficulty === 'intermediate' ? '中级' : '高级'}
                      </span>
                      <span className="fl-func-count">
                        {scenario.functions.length} 个函数
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 热门函数 */}
            <div className="fl-popular-section">
              <div className="fl-section-header">
                <h3 className="fl-section-title">🔥 热门函数</h3>
                <button 
                  className="fl-view-all-btn"
                  onClick={() => setViewMode('favorites')}
                >
                  ⭐ 我的收藏
                </button>
              </div>
              <div className="fl-popular-list">
                {popularFunctions.map(fn => (
                  <button
                    key={fn.name}
                    className="fl-popular-item"
                    onClick={() => handleFunctionClick(fn)}
                  >
                    <span className="fl-popular-name">{fn.name}</span>
                    <span className="fl-popular-desc">{fn.nameZh}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fl-container">
      {/* 设置入口 */}
      <div className="fl-toolbar">
        <button 
          className="fl-settings-btn"
          onClick={() => setShowSettings(true)}
        >
          ⚙️ AI 设置
          {isLLMConfigured() && <span className="fl-ai-badge">AI</span>}
        </button>
      </div>

      {renderContent()}

      {/* LLM 设置模态框 */}
      {showSettings && (
        <>
          <div 
            className="fl-settings-overlay" 
            onClick={() => setShowSettings(false)} 
          />
          <LLMSettings onClose={() => setShowSettings(false)} />
        </>
      )}
    </div>
  );
}
