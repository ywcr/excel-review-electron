/**
 * 学习进度管理
 * 使用 localStorage 存储用户的学习进度
 */

// 函数学习进度
export interface FunctionProgress {
  name: string;           // 函数名
  viewedAt?: number;      // 最后查看时间
  viewCount: number;      // 查看次数
  practiced: boolean;     // 是否在实验室练习过
  practicedAt?: number;   // 最后练习时间
}

// 场景学习进度
export interface ScenarioProgress {
  id: string;             // 场景 ID
  startedAt?: number;     // 开始学习时间
  completedAt?: number;   // 完成时间
  currentStep: number;    // 当前步骤
  totalSteps: number;     // 总步骤数
  completed: boolean;     // 是否完成
}

// 收藏项
export interface FavoriteItem {
  type: 'function' | 'scenario';
  id: string;             // 函数名或场景 ID
  addedAt: number;        // 添加时间
  note?: string;          // 用户备注
}

// 学习数据
export interface LearningData {
  functionProgress: Record<string, FunctionProgress>;
  scenarioProgress: Record<string, ScenarioProgress>;
  favorites: FavoriteItem[];
  stats: {
    totalFunctionsViewed: number;
    totalFunctionsPracticed: number;
    totalScenariosStarted: number;
    totalScenariosCompleted: number;
    lastActiveAt: number;
  };
}

const STORAGE_KEY = 'excel-function-learning-progress';

/**
 * 获取学习数据
 */
export function getLearningData(): LearningData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load learning data:', error);
  }
  
  return getDefaultLearningData();
}

/**
 * 保存学习数据
 */
export function saveLearningData(data: LearningData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save learning data:', error);
  }
}

/**
 * 获取默认学习数据
 */
function getDefaultLearningData(): LearningData {
  return {
    functionProgress: {},
    scenarioProgress: {},
    favorites: [],
    stats: {
      totalFunctionsViewed: 0,
      totalFunctionsPracticed: 0,
      totalScenariosStarted: 0,
      totalScenariosCompleted: 0,
      lastActiveAt: Date.now(),
    },
  };
}

/**
 * 记录函数查看
 */
export function recordFunctionView(functionName: string): void {
  const data = getLearningData();
  
  if (!data.functionProgress[functionName]) {
    data.functionProgress[functionName] = {
      name: functionName,
      viewCount: 0,
      practiced: false,
    };
    data.stats.totalFunctionsViewed++;
  }
  
  data.functionProgress[functionName].viewCount++;
  data.functionProgress[functionName].viewedAt = Date.now();
  data.stats.lastActiveAt = Date.now();
  
  saveLearningData(data);
}

/**
 * 记录函数练习
 */
export function recordFunctionPractice(functionName: string): void {
  const data = getLearningData();
  
  if (!data.functionProgress[functionName]) {
    data.functionProgress[functionName] = {
      name: functionName,
      viewCount: 0,
      practiced: false,
    };
  }
  
  if (!data.functionProgress[functionName].practiced) {
    data.stats.totalFunctionsPracticed++;
  }
  
  data.functionProgress[functionName].practiced = true;
  data.functionProgress[functionName].practicedAt = Date.now();
  data.stats.lastActiveAt = Date.now();
  
  saveLearningData(data);
}

/**
 * 记录场景开始
 */
export function recordScenarioStart(scenarioId: string, totalSteps: number): void {
  const data = getLearningData();
  
  if (!data.scenarioProgress[scenarioId]) {
    data.scenarioProgress[scenarioId] = {
      id: scenarioId,
      startedAt: Date.now(),
      currentStep: 0,
      totalSteps,
      completed: false,
    };
    data.stats.totalScenariosStarted++;
  }
  
  data.stats.lastActiveAt = Date.now();
  saveLearningData(data);
}

/**
 * 更新场景进度
 */
export function updateScenarioProgress(scenarioId: string, currentStep: number): void {
  const data = getLearningData();
  
  if (data.scenarioProgress[scenarioId]) {
    data.scenarioProgress[scenarioId].currentStep = currentStep;
    data.stats.lastActiveAt = Date.now();
    saveLearningData(data);
  }
}

/**
 * 记录场景完成
 */
export function recordScenarioComplete(scenarioId: string): void {
  const data = getLearningData();
  
  if (data.scenarioProgress[scenarioId]) {
    if (!data.scenarioProgress[scenarioId].completed) {
      data.stats.totalScenariosCompleted++;
    }
    data.scenarioProgress[scenarioId].completed = true;
    data.scenarioProgress[scenarioId].completedAt = Date.now();
    data.stats.lastActiveAt = Date.now();
    saveLearningData(data);
  }
}

/**
 * 添加收藏
 */
export function addFavorite(type: 'function' | 'scenario', id: string, note?: string): void {
  const data = getLearningData();
  
  // 检查是否已收藏
  const existing = data.favorites.find(f => f.type === type && f.id === id);
  if (existing) {
    if (note !== undefined) {
      existing.note = note;
    }
  } else {
    data.favorites.push({
      type,
      id,
      addedAt: Date.now(),
      note,
    });
  }
  
  data.stats.lastActiveAt = Date.now();
  saveLearningData(data);
}

/**
 * 移除收藏
 */
export function removeFavorite(type: 'function' | 'scenario', id: string): void {
  const data = getLearningData();
  data.favorites = data.favorites.filter(f => !(f.type === type && f.id === id));
  saveLearningData(data);
}

/**
 * 检查是否已收藏
 */
export function isFavorite(type: 'function' | 'scenario', id: string): boolean {
  const data = getLearningData();
  return data.favorites.some(f => f.type === type && f.id === id);
}

/**
 * 获取收藏列表
 */
export function getFavorites(): FavoriteItem[] {
  return getLearningData().favorites;
}

/**
 * 获取学习统计
 */
export function getLearningStats() {
  return getLearningData().stats;
}

/**
 * 获取最近学习的函数
 */
export function getRecentFunctions(limit: number = 5): FunctionProgress[] {
  const data = getLearningData();
  return Object.values(data.functionProgress)
    .filter(f => f.viewedAt)
    .sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0))
    .slice(0, limit);
}

/**
 * 获取进行中的场景
 */
export function getInProgressScenarios(): ScenarioProgress[] {
  const data = getLearningData();
  return Object.values(data.scenarioProgress)
    .filter(s => s.startedAt && !s.completed)
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

/**
 * 清除所有学习数据
 */
export function clearLearningData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
