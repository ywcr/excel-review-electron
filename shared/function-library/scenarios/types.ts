/**
 * 场景化案例库 - 类型定义
 */
import { FunctionCategory } from '../types';

// 场景难度
export type ScenarioDifficulty = 'beginner' | 'intermediate' | 'advanced';

// 场景标签
export type ScenarioTag = 
  | 'hr' | 'finance' | 'sales' | 'inventory' 
  | 'reporting' | 'data-cleaning' | 'analysis';

// 数据表格定义
export interface DataTable {
  headers: string[];
  rows: (string | number)[][];
}

// 场景步骤
export interface ScenarioStep {
  title: string;
  description: string;
  formula?: string;
  expectedResult?: string;
  hint?: string;
}

// 完整场景定义
export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: FunctionCategory;
  difficulty: ScenarioDifficulty;
  tags: ScenarioTag[];
  
  // 业务背景
  businessContext: string;
  
  // 学习目标
  learningGoals: string[];
  
  // 涉及的函数
  functions: string[];
  
  // 示例数据
  sampleData: DataTable;
  
  // 解决步骤
  steps: ScenarioStep[];
  
  // 完整解决方案
  solution: {
    formula: string;
    explanation: string;
  };
  
  // 扩展练习
  exercises?: {
    question: string;
    answer: string;
  }[];
}
