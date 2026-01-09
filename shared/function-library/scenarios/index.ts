/**
 * 场景化案例库 - 入口文件
 */
export * from './types';
export { HR_SCENARIOS } from './hr-scenarios';
export { SALES_FINANCE_SCENARIOS } from './sales-finance-scenarios';
export { DATA_PROCESSING_SCENARIOS } from './data-processing-scenarios';
export { VALIDATION_SCENARIOS } from './validation-scenarios';

import { Scenario } from './types';
import { HR_SCENARIOS } from './hr-scenarios';
import { SALES_FINANCE_SCENARIOS } from './sales-finance-scenarios';
import { DATA_PROCESSING_SCENARIOS } from './data-processing-scenarios';
import { VALIDATION_SCENARIOS } from './validation-scenarios';

// 所有场景
export const ALL_SCENARIOS: Scenario[] = [
  ...HR_SCENARIOS,
  ...SALES_FINANCE_SCENARIOS,
  ...DATA_PROCESSING_SCENARIOS,
  ...VALIDATION_SCENARIOS,
];

// 按分类获取场景
export function getScenariosByCategory(category: string): Scenario[] {
  return ALL_SCENARIOS.filter(s => s.category === category);
}

// 按标签获取场景
export function getScenariosByTag(tag: string): Scenario[] {
  return ALL_SCENARIOS.filter(s => s.tags.includes(tag as any));
}

// 按难度获取场景
export function getScenariosByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): Scenario[] {
  return ALL_SCENARIOS.filter(s => s.difficulty === difficulty);
}

// 搜索场景
export function searchScenarios(query: string): Scenario[] {
  const lowerQuery = query.toLowerCase();
  return ALL_SCENARIOS.filter(s =>
    s.title.toLowerCase().includes(lowerQuery) ||
    s.description.toLowerCase().includes(lowerQuery) ||
    s.functions.some(f => f.toLowerCase().includes(lowerQuery)) ||
    s.tags.some(t => t.includes(lowerQuery))
  );
}

// 获取场景详情
export function getScenarioById(id: string): Scenario | undefined {
  return ALL_SCENARIOS.find(s => s.id === id);
}

// 获取热门场景（按难度排序，初学者优先）
export function getPopularScenarios(count: number = 5): Scenario[] {
  const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
  return [...ALL_SCENARIOS]
    .sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty])
    .slice(0, count);
}
