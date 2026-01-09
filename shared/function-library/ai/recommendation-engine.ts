/**
 * 智能推荐引擎 - 本地规则版本
 * 基于关键词和问题模式匹配，推荐合适的 Excel 函数
 */

import { ExcelFunction, FunctionCategory, ALL_FUNCTIONS } from '../index';

// 推荐结果
export interface RecommendationResult {
  function: ExcelFunction;
  score: number;           // 匹配分数 (0-100)
  reason: string;          // 推荐理由
  matchedKeywords: string[]; // 匹配到的关键词
}

// 问题意图类型
type IntentType = 
  | 'lookup'      // 查找数据
  | 'aggregate'   // 汇总统计
  | 'condition'   // 条件判断
  | 'text'        // 文本处理
  | 'date'        // 日期处理
  | 'math'        // 数学计算
  | 'error'       // 错误处理
  | 'unknown';

// 意图识别规则
interface IntentRule {
  intent: IntentType;
  keywords: string[];
  weight: number;
}

// 函数推荐规则
interface FunctionRule {
  functionName: string;
  triggers: string[];      // 触发词
  scenarios: string[];     // 适用场景描述
  priority: number;        // 优先级 (高分优先)
}

// 意图识别规则库
const INTENT_RULES: IntentRule[] = [
  {
    intent: 'lookup',
    keywords: ['查找', '查询', '搜索', '找', '匹配', '对应', '根据', '检索', '获取', '提取', '引用', '关联'],
    weight: 10
  },
  {
    intent: 'aggregate',
    keywords: ['求和', '总计', '合计', '统计', '计数', '平均', '最大', '最小', '汇总', '累加', '总和', '多少个', '几个', '数量'],
    weight: 10
  },
  {
    intent: 'condition',
    keywords: ['如果', '判断', '条件', '是否', '当', '否则', '分支', '情况', '满足', '符合', '大于', '小于', '等于', '比较'],
    weight: 10
  },
  {
    intent: 'text',
    keywords: ['文本', '字符', '截取', '拆分', '合并', '连接', '替换', '去除', '空格', '提取', '左边', '右边', '中间', '长度', '大小写'],
    weight: 10
  },
  {
    intent: 'date',
    keywords: ['日期', '时间', '年', '月', '日', '天数', '工作日', '周', '月末', '年龄', '工龄', '间隔', '今天', '现在'],
    weight: 10
  },
  {
    intent: 'math',
    keywords: ['四舍五入', '取整', '绝对值', '余数', '幂', '开方', '随机', '向上取整', '向下取整'],
    weight: 10
  },
  {
    intent: 'error',
    keywords: ['错误', '报错', '#N/A', '#VALUE', '#REF', '异常', '处理错误', '容错'],
    weight: 8
  }
];

// 函数触发规则库
const FUNCTION_RULES: FunctionRule[] = [
  // 查找类
  {
    functionName: 'VLOOKUP',
    triggers: ['根据...查找', '按...找', '查表', '表格查询', '纵向查找', '垂直查找', '根据名字找', '根据编号找', '根据ID找'],
    scenarios: ['根据员工工号查找姓名', '根据产品编码查找价格', '根据客户名查找电话'],
    priority: 95
  },
  {
    functionName: 'HLOOKUP',
    triggers: ['横向查找', '水平查找', '按行查找'],
    scenarios: ['在表头中查找对应列的数据'],
    priority: 70
  },
  {
    functionName: 'INDEX',
    triggers: ['返回指定位置', '按位置取值', '索引取值'],
    scenarios: ['返回第N行第M列的值'],
    priority: 80
  },
  {
    functionName: 'MATCH',
    triggers: ['查找位置', '返回序号', '第几个', '排名'],
    scenarios: ['找出某个值在列表中的位置'],
    priority: 75
  },
  {
    functionName: 'XLOOKUP',
    triggers: ['高级查找', '双向查找', '精确查找'],
    scenarios: ['更灵活的查找，支持从右向左'],
    priority: 90
  },
  
  // 统计类
  {
    functionName: 'SUM',
    triggers: ['求和', '加总', '合计', '累加', '总数', '总计'],
    scenarios: ['计算销售总额', '汇总各项费用'],
    priority: 95
  },
  {
    functionName: 'SUMIF',
    triggers: ['条件求和', '满足条件的和', '按条件加总', '符合条件求和'],
    scenarios: ['计算某个部门的销售总额', '汇总某类产品的金额'],
    priority: 90
  },
  {
    functionName: 'SUMIFS',
    triggers: ['多条件求和', '多个条件的和', '复合条件求和'],
    scenarios: ['计算某部门某月的销售额'],
    priority: 88
  },
  {
    functionName: 'AVERAGE',
    triggers: ['平均', '平均值', '均值', '平均数'],
    scenarios: ['计算平均分', '平均销售额'],
    priority: 90
  },
  {
    functionName: 'COUNT',
    triggers: ['计数', '数量', '有多少个', '个数', '统计数字'],
    scenarios: ['统计有数据的单元格数量'],
    priority: 85
  },
  {
    functionName: 'COUNTIF',
    triggers: ['条件计数', '满足条件的数量', '按条件统计', '统计符合条件'],
    scenarios: ['统计某类产品的数量', '计算及格人数'],
    priority: 88
  },
  {
    functionName: 'COUNTIFS',
    triggers: ['多条件计数', '多个条件统计'],
    scenarios: ['统计某部门某职级的人数'],
    priority: 85
  },
  {
    functionName: 'COUNTA',
    triggers: ['非空计数', '有内容的数量', '统计非空'],
    scenarios: ['统计已填写的单元格数量'],
    priority: 75
  },
  {
    functionName: 'MAX',
    triggers: ['最大', '最高', '最多', '峰值', '上限'],
    scenarios: ['找出最高分', '最大销售额'],
    priority: 85
  },
  {
    functionName: 'MIN',
    triggers: ['最小', '最低', '最少', '下限'],
    scenarios: ['找出最低分', '最小库存'],
    priority: 85
  },
  
  // 逻辑类
  {
    functionName: 'IF',
    triggers: ['如果', '判断', '条件', '是否', '当...时', '否则'],
    scenarios: ['判断成绩是否及格', '根据销售额判断等级'],
    priority: 95
  },
  {
    functionName: 'IFS',
    triggers: ['多条件判断', '多个如果', '多分支', '多种情况'],
    scenarios: ['根据分数划分ABCD等级', '多档提成计算'],
    priority: 88
  },
  {
    functionName: 'AND',
    triggers: ['并且', '同时满足', '而且', '都'],
    scenarios: ['判断多个条件是否同时成立'],
    priority: 75
  },
  {
    functionName: 'OR',
    triggers: ['或者', '任一满足', '或', '其中一个'],
    scenarios: ['判断多个条件是否有一个成立'],
    priority: 75
  },
  {
    functionName: 'IFERROR',
    triggers: ['错误处理', '报错时', '出错时', '容错', '避免#N/A'],
    scenarios: ['VLOOKUP找不到时显示默认值'],
    priority: 85
  },
  {
    functionName: 'IFNA',
    triggers: ['#N/A处理', 'NA错误', '找不到时'],
    scenarios: ['专门处理#N/A错误'],
    priority: 70
  },
  
  // 文本类
  {
    functionName: 'LEFT',
    triggers: ['左边', '前几个字符', '开头', '取左'],
    scenarios: ['提取手机号前3位', '提取编码前缀'],
    priority: 85
  },
  {
    functionName: 'RIGHT',
    triggers: ['右边', '后几个字符', '末尾', '取右'],
    scenarios: ['提取手机号后4位', '提取文件扩展名'],
    priority: 85
  },
  {
    functionName: 'MID',
    triggers: ['中间', '指定位置', '截取', '取中间'],
    scenarios: ['从身份证号提取出生日期', '提取订单号中的日期部分'],
    priority: 85
  },
  {
    functionName: 'LEN',
    triggers: ['长度', '字符数', '多少个字'],
    scenarios: ['检查手机号是否为11位', '统计文本长度'],
    priority: 80
  },
  {
    functionName: 'TRIM',
    triggers: ['去空格', '去除空格', '清除空格', '消除空格'],
    scenarios: ['清理数据中的多余空格'],
    priority: 85
  },
  {
    functionName: 'CONCATENATE',
    triggers: ['合并', '连接', '拼接', '组合'],
    scenarios: ['将姓和名合并', '拼接地址'],
    priority: 85
  },
  {
    functionName: 'TEXT',
    triggers: ['格式化', '转文本', '日期格式', '数字格式'],
    scenarios: ['将日期转为"2024年1月"格式', '数字保留两位小数'],
    priority: 80
  },
  {
    functionName: 'SUBSTITUTE',
    triggers: ['替换', '替换文本', '换成', '改为'],
    scenarios: ['将"-"替换为"/"', '批量替换文字'],
    priority: 85
  },
  {
    functionName: 'FIND',
    triggers: ['查找位置', '在哪', '第几个字符', '出现位置'],
    scenarios: ['找出@在邮箱中的位置'],
    priority: 75
  },
  
  // 日期类
  {
    functionName: 'TODAY',
    triggers: ['今天', '当前日期', '本日'],
    scenarios: ['获取今天的日期'],
    priority: 90
  },
  {
    functionName: 'NOW',
    triggers: ['现在', '当前时间', '此刻'],
    scenarios: ['获取当前的日期和时间'],
    priority: 85
  },
  {
    functionName: 'DATE',
    triggers: ['构造日期', '组合日期', '生成日期'],
    scenarios: ['用年月日构造日期'],
    priority: 80
  },
  {
    functionName: 'YEAR',
    triggers: ['年份', '提取年', '哪一年'],
    scenarios: ['从日期中提取年份'],
    priority: 85
  },
  {
    functionName: 'MONTH',
    triggers: ['月份', '提取月', '几月'],
    scenarios: ['从日期中提取月份'],
    priority: 85
  },
  {
    functionName: 'DAY',
    triggers: ['日', '提取日', '几号'],
    scenarios: ['从日期中提取日'],
    priority: 85
  },
  {
    functionName: 'DATEDIF',
    triggers: ['日期差', '间隔', '相差', '工龄', '年龄', '天数差'],
    scenarios: ['计算工龄', '计算年龄', '两个日期相差多少天'],
    priority: 90
  },
  {
    functionName: 'WEEKDAY',
    triggers: ['星期几', '周几', '工作日'],
    scenarios: ['判断日期是星期几'],
    priority: 75
  },
  {
    functionName: 'EOMONTH',
    triggers: ['月末', '月底', '月份最后一天'],
    scenarios: ['获取月底日期'],
    priority: 75
  },
  
  // 数学类
  {
    functionName: 'ROUND',
    triggers: ['四舍五入', '保留小数', '取整'],
    scenarios: ['保留两位小数', '四舍五入到整数'],
    priority: 90
  },
  {
    functionName: 'ROUNDUP',
    triggers: ['向上取整', '进一', '上取整'],
    scenarios: ['向上取整到整数'],
    priority: 75
  },
  {
    functionName: 'ROUNDDOWN',
    triggers: ['向下取整', '舍去', '下取整'],
    scenarios: ['向下取整到整数'],
    priority: 75
  },
  {
    functionName: 'INT',
    triggers: ['取整数', '整数部分'],
    scenarios: ['取数字的整数部分'],
    priority: 70
  },
  {
    functionName: 'ABS',
    triggers: ['绝对值', '正数'],
    scenarios: ['取绝对值'],
    priority: 80
  },
  {
    functionName: 'MOD',
    triggers: ['余数', '取模', '整除余数'],
    scenarios: ['判断是否能整除'],
    priority: 70
  },
  {
    functionName: 'RAND',
    triggers: ['随机', '随机数'],
    scenarios: ['生成0-1之间的随机数'],
    priority: 65
  },
  {
    functionName: 'RANDBETWEEN',
    triggers: ['随机整数', '指定范围随机'],
    scenarios: ['生成1-100之间的随机整数'],
    priority: 70
  }
];

/**
 * 分析问题意图
 */
function analyzeIntent(query: string): Map<IntentType, number> {
  const intentScores = new Map<IntentType, number>();
  const lowerQuery = query.toLowerCase();
  
  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (lowerQuery.includes(keyword) || query.includes(keyword)) {
        score += rule.weight;
      }
    }
    if (score > 0) {
      intentScores.set(rule.intent, score);
    }
  }
  
  return intentScores;
}

/**
 * 计算函数匹配分数
 */
function calculateFunctionScore(
  func: ExcelFunction, 
  query: string, 
  intentScores: Map<IntentType, number>
): { score: number; matchedKeywords: string[]; reason: string } {
  let score = 0;
  const matchedKeywords: string[] = [];
  const reasons: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  // 1. 查找对应的规则
  const rule = FUNCTION_RULES.find(r => r.functionName === func.name);
  
  if (rule) {
    // 触发词匹配
    for (const trigger of rule.triggers) {
      const triggerLower = trigger.toLowerCase();
      // 处理模板格式 "根据...查找"
      const triggerPattern = triggerLower.replace(/\.\.\./g, '.*');
      const regex = new RegExp(triggerPattern);
      
      if (regex.test(lowerQuery) || lowerQuery.includes(triggerLower.replace('...', ''))) {
        score += 30;
        matchedKeywords.push(trigger);
        reasons.push(`匹配触发词"${trigger}"`);
      }
    }
    
    // 场景匹配
    for (const scenario of rule.scenarios) {
      if (lowerQuery.includes(scenario) || scenario.includes(query)) {
        score += 20;
        reasons.push(`适用于"${scenario}"场景`);
      }
    }
    
    // 优先级加成
    score += rule.priority / 5;
  }
  
  // 2. 函数自身关键词匹配
  for (const keyword of func.keywords) {
    if (lowerQuery.includes(keyword) || query.includes(keyword)) {
      score += 15;
      matchedKeywords.push(keyword);
    }
  }
  
  // 3. 函数名匹配
  if (lowerQuery.includes(func.name.toLowerCase())) {
    score += 50;
    matchedKeywords.push(func.name);
    reasons.push(`直接匹配函数名`);
  }
  
  // 4. 中文名匹配
  if (query.includes(func.nameZh)) {
    score += 40;
    matchedKeywords.push(func.nameZh);
  }
  
  // 5. 意图匹配加成
  const categoryToIntent: Record<FunctionCategory, IntentType> = {
    'lookup': 'lookup',
    'statistics': 'aggregate',
    'logic': 'condition',
    'text': 'text',
    'date': 'date',
    'math': 'math'
  };
  
  const funcIntent = categoryToIntent[func.category];
  if (funcIntent && intentScores.has(funcIntent)) {
    score += intentScores.get(funcIntent)! * 2;
    reasons.push(`符合${func.category}类意图`);
  }
  
  // 生成推荐理由
  let reason = func.description;
  if (reasons.length > 0) {
    reason = reasons.slice(0, 2).join('；');
  }
  
  return { score, matchedKeywords, reason };
}

/**
 * 智能推荐函数
 */
export function recommendFunctions(query: string, limit: number = 5): RecommendationResult[] {
  if (!query.trim()) {
    return [];
  }
  
  // 分析意图
  const intentScores = analyzeIntent(query);
  
  // 计算所有函数的匹配分数
  const results: RecommendationResult[] = [];
  
  for (const func of ALL_FUNCTIONS) {
    const { score, matchedKeywords, reason } = calculateFunctionScore(func, query, intentScores);
    
    if (score > 0) {
      results.push({
        function: func,
        score: Math.min(100, score),
        reason,
        matchedKeywords
      });
    }
  }
  
  // 按分数排序，取前N个
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, limit);
}

/**
 * 获取常见问题示例
 */
export function getExampleQueries(): string[] {
  return [
    '根据员工工号查找姓名',
    '计算销售部的总销售额',
    '判断成绩是否及格',
    '去除文本中的空格',
    '计算两个日期相差多少天',
    '保留两位小数',
    '统计符合条件的数量',
    '将多个单元格的内容合并',
    '提取手机号后4位',
    '求平均分'
  ];
}
