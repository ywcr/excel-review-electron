/**
 * Excel 数组/动态函数 (Excel 365+)
 */

import { ExcelFunction } from '../types';

export const ARRAY_FUNCTIONS: ExcelFunction[] = [
  {
    name: 'FILTER',
    nameZh: '筛选',
    category: 'lookup',
    difficulty: 'medium',
    popularity: 9,
    description: '根据条件筛选数组，返回符合条件的行或列',
    syntax: 'FILTER(array, include, [if_empty])',
    parameters: [
      { name: 'array', nameZh: '数组', required: true, type: 'range', description: '要筛选的数组或范围' },
      { name: 'include', nameZh: '条件', required: true, type: 'range', description: '布尔数组，TRUE 的行会被包含' },
      { name: 'if_empty', nameZh: '空值', required: false, type: 'value', description: '如果没有结果返回的值' }
    ],
    examples: [
      {
        formula: '=FILTER(A2:C10, C2:C10>1000)',
        description: '筛选销售额大于1000的记录',
        expectedResult: '返回销售额>1000的所有行'
      },
      {
        formula: '=FILTER(A2:D10, (B2:B10="销售")*(D2:D10>500), "无数据")',
        description: '多条件筛选：部门为销售且金额>500',
        expectedResult: '符合两个条件的行'
      }
    ],
    tips: ['多条件用 * 表示 AND，用 + 表示 OR', '第三个参数可避免 #CALC! 错误'],
    warnings: ['#CALC! 表示没有符合条件的数据', '#VALUE! 表示条件行数不匹配'],
    relatedFunctions: ['SORT', 'UNIQUE', 'XLOOKUP'],
    keywords: ['筛选', '过滤', 'filter', '条件', '动态数组']
  },
  {
    name: 'SORT',
    nameZh: '排序',
    category: 'lookup',
    difficulty: 'easy',
    popularity: 8,
    description: '对数组进行排序，返回排序后的数组',
    syntax: 'SORT(array, [sort_index], [sort_order], [by_col])',
    parameters: [
      { name: 'array', nameZh: '数组', required: true, type: 'range', description: '要排序的数组或范围' },
      { name: 'sort_index', nameZh: '排序列', required: false, type: 'number', description: '排序依据的列号（默认1）' },
      { name: 'sort_order', nameZh: '排序方向', required: false, type: 'number', description: '1=升序，-1=降序' },
      { name: 'by_col', nameZh: '按列', required: false, type: 'boolean', description: 'TRUE=按列排序' }
    ],
    examples: [
      { formula: '=SORT(A2:C10)', description: '按第一列升序排序', expectedResult: '按A列排序的数据' },
      { formula: '=SORT(A2:C10, 3, -1)', description: '按第3列降序排序', expectedResult: '按C列降序排列' }
    ],
    tips: ['可与 FILTER 嵌套实现筛选后排序', '默认升序，-1 表示降序'],
    warnings: [],
    relatedFunctions: ['SORTBY', 'FILTER', 'UNIQUE'],
    keywords: ['排序', 'sort', '升序', '降序', '排列']
  },
  {
    name: 'UNIQUE',
    nameZh: '唯一值',
    category: 'lookup',
    difficulty: 'easy',
    popularity: 8,
    description: '返回数组中的唯一值列表',
    syntax: 'UNIQUE(array, [by_col], [exactly_once])',
    parameters: [
      { name: 'array', nameZh: '数组', required: true, type: 'range', description: '要提取唯一值的数组' },
      { name: 'by_col', nameZh: '按列', required: false, type: 'boolean', description: 'TRUE=按列比较' },
      { name: 'exactly_once', nameZh: '唯一出现', required: false, type: 'boolean', description: 'TRUE=只返回出现一次的值' }
    ],
    examples: [
      { formula: '=UNIQUE(B2:B100)', description: '获取部门列表（去重）', expectedResult: '不重复的部门名称' },
      { formula: '=UNIQUE(A2:A100, FALSE, TRUE)', description: '找出只出现一次的值', expectedResult: '只出现一次的值' }
    ],
    tips: ['适合生成下拉列表选项', 'exactly_once=TRUE 可找出唯一记录'],
    warnings: [],
    relatedFunctions: ['FILTER', 'SORT', 'COUNTIF'],
    keywords: ['去重', '唯一', 'unique', '不重复', '去除重复']
  },
  {
    name: 'SEQUENCE',
    nameZh: '序列',
    category: 'math',
    difficulty: 'easy',
    popularity: 7,
    description: '生成数字序列数组',
    syntax: 'SEQUENCE(rows, [columns], [start], [step])',
    parameters: [
      { name: 'rows', nameZh: '行数', required: true, type: 'number', description: '行数' },
      { name: 'columns', nameZh: '列数', required: false, type: 'number', description: '列数（默认1）' },
      { name: 'start', nameZh: '起始', required: false, type: 'number', description: '起始值（默认1）' },
      { name: 'step', nameZh: '步长', required: false, type: 'number', description: '步长（默认1）' }
    ],
    examples: [
      { formula: '=SEQUENCE(10)', description: '生成1-10序号', expectedResult: '1,2,3...10' },
      { formula: '=SEQUENCE(3, 4, 0, 5)', description: '生成3x4矩阵，起始0，步长5', expectedResult: '0,5,10,15...' }
    ],
    tips: ['适合生成辅助序号列', '可用于创建日期序列'],
    warnings: [],
    relatedFunctions: ['ROW', 'COLUMN'],
    keywords: ['序列', 'sequence', '序号', '生成', '数列']
  },
  {
    name: 'XLOOKUP',
    nameZh: '增强查找',
    category: 'lookup',
    difficulty: 'medium',
    popularity: 9,
    description: 'VLOOKUP 的增强版，支持左向查找、默认值和多列返回',
    syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])',
    parameters: [
      { name: 'lookup_value', nameZh: '查找值', required: true, type: 'value', description: '要查找的值' },
      { name: 'lookup_array', nameZh: '查找范围', required: true, type: 'range', description: '查找范围' },
      { name: 'return_array', nameZh: '返回范围', required: true, type: 'range', description: '返回值范围' },
      { name: 'if_not_found', nameZh: '未找到', required: false, type: 'value', description: '未找到时返回的值' },
      { name: 'match_mode', nameZh: '匹配模式', required: false, type: 'number', description: '0=精确，-1=小于，1=大于' },
      { name: 'search_mode', nameZh: '搜索方向', required: false, type: 'number', description: '1=从头，-1=从尾' }
    ],
    examples: [
      { formula: '=XLOOKUP(A1, 员工表!A:A, 员工表!B:B, "未知")', description: '根据工号查姓名', expectedResult: '员工姓名或"未知"' },
      { formula: '=XLOOKUP(A1, B:B, C:E)', description: '返回多列结果', expectedResult: '一次返回3列数据' }
    ],
    tips: ['比 VLOOKUP 更灵活，支持左向查找', '可返回多列结果', '默认精确匹配'],
    warnings: ['#N/A 表示未找到且未设置 if_not_found'],
    relatedFunctions: ['VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH'],
    keywords: ['查找', 'xlookup', '搜索', '匹配', '多列']
  },
  {
    name: 'XMATCH',
    nameZh: '增强匹配',
    category: 'lookup',
    difficulty: 'medium',
    popularity: 7,
    description: 'MATCH 的增强版，返回匹配项的位置',
    syntax: 'XMATCH(lookup_value, lookup_array, [match_mode], [search_mode])',
    parameters: [
      { name: 'lookup_value', nameZh: '查找值', required: true, type: 'value', description: '要查找的值' },
      { name: 'lookup_array', nameZh: '查找范围', required: true, type: 'range', description: '查找范围' },
      { name: 'match_mode', nameZh: '匹配模式', required: false, type: 'number', description: '0=精确，2=通配符' },
      { name: 'search_mode', nameZh: '搜索方向', required: false, type: 'number', description: '1=从头，-1=从尾' }
    ],
    examples: [
      { formula: '=XMATCH("销售部", A:A)', description: '查找位置', expectedResult: '销售部所在的行号' },
      { formula: '=XMATCH("完成", B:B, 0, -1)', description: '从尾部查找', expectedResult: '最后一个"完成"的位置' }
    ],
    tips: ['默认精确匹配', 'search_mode=-1 可从尾部搜索'],
    warnings: [],
    relatedFunctions: ['MATCH', 'XLOOKUP', 'INDEX'],
    keywords: ['匹配', 'xmatch', '位置', '查找', '行号']
  },
  {
    name: 'SORTBY',
    nameZh: '按条件排序',
    category: 'lookup',
    difficulty: 'medium',
    popularity: 7,
    description: '根据另一个数组的值对数组进行排序',
    syntax: 'SORTBY(array, by_array1, [sort_order1], ...)',
    parameters: [
      { name: 'array', nameZh: '数组', required: true, type: 'range', description: '要排序的数组' },
      { name: 'by_array1', nameZh: '依据1', required: true, type: 'range', description: '排序依据' },
      { name: 'sort_order1', nameZh: '方向1', required: false, type: 'number', description: '1=升序，-1=降序' }
    ],
    examples: [
      { formula: '=SORTBY(A2:A10, C2:C10, -1)', description: '按销售额排序', expectedResult: '按销售额降序的列表' },
      { formula: '=SORTBY(A2:D10, B2:B10, 1, D2:D10, -1)', description: '多级排序', expectedResult: '先按部门，再按工资排序' }
    ],
    tips: ['支持多级排序', 'by_array 可以不在 array 范围内'],
    warnings: [],
    relatedFunctions: ['SORT', 'FILTER'],
    keywords: ['排序', 'sortby', '多级', '条件排序', '按列排序']
  }
];
