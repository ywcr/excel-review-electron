/**
 * 函数库入口文件
 * 导出所有函数和类型定义
 */

// 类型导出
export * from './types';

// 函数导出
export { LOOKUP_FUNCTIONS } from './functions/lookup';
export { STATISTICS_FUNCTIONS } from './functions/statistics';
export { TEXT_FUNCTIONS } from './functions/text';
export { DATE_FUNCTIONS } from './functions/date';
export { LOGIC_FUNCTIONS } from './functions/logic';
export { MATH_FUNCTIONS } from './functions/math';
export { ARRAY_FUNCTIONS } from './functions/array';
export { INFO_FUNCTIONS } from './functions/info';
export { FINANCIAL_FUNCTIONS } from './functions/financial';

// 导入用于聚合
import { LOOKUP_FUNCTIONS } from './functions/lookup';
import { STATISTICS_FUNCTIONS } from './functions/statistics';
import { TEXT_FUNCTIONS } from './functions/text';
import { DATE_FUNCTIONS } from './functions/date';
import { LOGIC_FUNCTIONS } from './functions/logic';
import { MATH_FUNCTIONS } from './functions/math';
import { ARRAY_FUNCTIONS } from './functions/array';
import { INFO_FUNCTIONS } from './functions/info';
import { FINANCIAL_FUNCTIONS } from './functions/financial';
import { ExcelFunction, FunctionCategory, CATEGORIES } from './types';

/** 所有函数的聚合数组 */
export const ALL_FUNCTIONS: ExcelFunction[] = [
  ...LOOKUP_FUNCTIONS,
  ...STATISTICS_FUNCTIONS,
  ...TEXT_FUNCTIONS,
  ...DATE_FUNCTIONS,
  ...LOGIC_FUNCTIONS,
  ...MATH_FUNCTIONS,
  ...ARRAY_FUNCTIONS,
  ...INFO_FUNCTIONS,
  ...FINANCIAL_FUNCTIONS,
];

/** 按分类获取函数 */
export function getFunctionsByCategory(category: FunctionCategory): ExcelFunction[] {
  return ALL_FUNCTIONS.filter(fn => fn.category === category);
}

/** 根据函数名获取函数（不区分大小写） */
export function getFunctionByName(name: string): ExcelFunction | undefined {
  return ALL_FUNCTIONS.find(fn => fn.name.toUpperCase() === name.toUpperCase());
}

/** 搜索函数（按名称和关键词） */
export function searchFunctions(query: string): ExcelFunction[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];
  
  return ALL_FUNCTIONS.filter(fn => {
    // 匹配函数名
    if (fn.name.toLowerCase().includes(lowerQuery)) return true;
    if (fn.nameZh.includes(lowerQuery)) return true;
    
    // 匹配关键词
    if (fn.keywords?.some(kw => kw.toLowerCase().includes(lowerQuery))) return true;
    
    // 匹配描述
    if (fn.description.toLowerCase().includes(lowerQuery)) return true;
    
    return false;
  }).sort((a, b) => {
    // 精确匹配函数名优先
    const aExact = a.name.toLowerCase() === lowerQuery || a.nameZh === lowerQuery;
    const bExact = b.name.toLowerCase() === lowerQuery || b.nameZh === lowerQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // 按热度排序
    return (b.popularity || 5) - (a.popularity || 5);
  });
}

/** 获取热门函数 */
export function getPopularFunctions(limit: number = 10): ExcelFunction[] {
  return [...ALL_FUNCTIONS]
    .sort((a, b) => (b.popularity || 5) - (a.popularity || 5))
    .slice(0, limit);
}

/** 获取分类信息 */
export { CATEGORIES } from './types';
