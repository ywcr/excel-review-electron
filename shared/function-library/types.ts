/**
 * Excel 函数库类型定义
 * 用于函数学习模块的数据结构
 */

/** 函数分类 */
export type FunctionCategory =
  | 'lookup'      // 查找匹配
  | 'statistics'  // 统计汇总
  | 'text'        // 文本处理
  | 'date'        // 日期时间
  | 'math'        // 数学运算
  | 'logic';      // 逻辑判断

/** 函数难度 */
export type FunctionDifficulty = 'easy' | 'medium' | 'hard';

/** 参数类型 */
export type ParameterType = 'value' | 'range' | 'number' | 'text' | 'boolean' | 'any';

/** 函数参数定义 */
export interface FunctionParameter {
  name: string;           // 英文参数名
  nameZh: string;         // 中文参数名
  required: boolean;      // 是否必填
  description: string;    // 参数说明
  type: ParameterType;    // 参数类型
  defaultValue?: string;  // 默认值
}

/** 函数使用示例 */
export interface FunctionExample {
  formula: string;        // 公式
  description: string;    // 说明
  sampleData?: any[][];   // 示例数据（二维数组）
  expectedResult: string; // 预期结果
}

/** Excel 函数定义 */
export interface ExcelFunction {
  name: string;                     // 函数名（英文，大写）
  nameZh: string;                   // 中文名称
  category: FunctionCategory;       // 分类
  difficulty: FunctionDifficulty;   // 难度
  popularity: number;               // 热度 1-10
  description: string;              // 功能说明
  syntax: string;                   // 语法格式
  parameters: FunctionParameter[];  // 参数列表
  examples: FunctionExample[];      // 使用示例
  tips: string[];                   // 使用技巧
  warnings: string[];               // 注意事项
  relatedFunctions: string[];       // 相关函数
  keywords: string[];               // 搜索关键词（中英文）
  wpsOnly?: boolean;                // 是否 WPS 特有
}

/** 场景案例 */
export interface Scenario {
  id: string;                       // 唯一标识
  title: string;                    // 场景标题
  description: string;              // 问题描述
  category: FunctionCategory;       // 所属分类
  functions: string[];              // 涉及的函数名
  template: {
    formula: string;                // 公式模板
    explanation: string;            // 解释说明
    sampleData: any[][];            // 示例数据
    expectedResult: string;         // 预期结果
  };
  keywords: string[];               // 搜索关键词
}

/** 分类信息 */
export interface CategoryInfo {
  id: FunctionCategory;
  name: string;                     // 中文名称
  icon: string;                     // 图标（emoji）
  description: string;              // 描述
  color: string;                    // 主题色
}

/** 函数推荐结果 */
export interface FunctionRecommendation {
  function: ExcelFunction;
  score: number;                    // 匹配分数 0-100
  reason: string;                   // 推荐理由
}

/** 公式执行结果 */
export interface FormulaExecutionResult {
  success: boolean;
  result?: string | number;
  error?: string;
  steps?: ExecutionStep[];          // 执行步骤解释
}

/** 执行步骤 */
export interface ExecutionStep {
  step: number;
  description: string;
  intermediateResult?: string;
}

/** 分类定义 */
export const CATEGORIES: CategoryInfo[] = [
  { id: 'lookup', name: '查找匹配', icon: '🔎', description: '在数据中查找和匹配值', color: '#3b82f6' },
  { id: 'statistics', name: '统计汇总', icon: '📊', description: '统计、求和、计数等', color: '#10b981' },
  { id: 'text', name: '文本处理', icon: '📝', description: '文本提取、合并、转换', color: '#f59e0b' },
  { id: 'date', name: '日期计算', icon: '📅', description: '日期和时间的计算', color: '#8b5cf6' },
  { id: 'math', name: '数学运算', icon: '🔢', description: '数学计算和取整', color: '#ef4444' },
  { id: 'logic', name: '条件判断', icon: '⚡', description: '条件判断和逻辑运算', color: '#06b6d4' },
];
