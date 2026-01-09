/**
 * 统计汇总类函数
 * SUM, SUMIF, SUMIFS, AVERAGE, COUNT, COUNTIF 等
 */
import { ExcelFunction } from './types';

export const STATISTICS_FUNCTIONS: ExcelFunction[] = [
  {
    name: 'SUM',
    nameZh: '求和',
    category: 'statistics',
    difficulty: 'easy',
    popularity: 10,
    description: '计算一组数值的总和。这是最基础也是最常用的统计函数。',
    syntax: 'SUM(数值1, [数值2], ...)',
    parameters: [
      { name: 'number1', nameZh: '数值1', required: true, type: 'any', description: '第一个要相加的数值或区域' },
      { name: 'number2', nameZh: '数值2', required: false, type: 'any', description: '其他要相加的数值或区域' },
    ],
    examples: [
      {
        formula: '=SUM(A1:A10)',
        description: '计算 A1 到 A10 单元格的总和',
        sampleData: [[10], [20], [30], [40]],
        expectedResult: '100',
      },
      {
        formula: '=SUM(A1:A10, C1:C10)',
        description: '同时计算两个区域的总和',
        expectedResult: '（两个区域的合计）',
      },
    ],
    tips: [
      '可以一次选择多个不连续的区域',
      '文本和空单元格会被自动忽略',
    ],
    warnings: [
      '如果区域中包含错误值（如 #VALUE!），结果也会是错误',
    ],
    relatedFunctions: ['SUMIF', 'SUMIFS', 'AVERAGE', 'COUNT'],
    keywords: ['求和', '加总', '合计', 'sum', '加起来', '总计'],
  },
  {
    name: 'SUMIF',
    nameZh: '条件求和',
    category: 'statistics',
    difficulty: 'medium',
    popularity: 9,
    description: '根据指定条件对区域中的值进行求和。只计算满足条件的单元格。',
    syntax: 'SUMIF(条件区域, 条件, [求和区域])',
    parameters: [
      { name: 'range', nameZh: '条件区域', required: true, type: 'range', description: '用于判断条件的区域' },
      { name: 'criteria', nameZh: '条件', required: true, type: 'value', description: '筛选条件，如 ">100"、"苹果" 等' },
      { name: 'sum_range', nameZh: '求和区域', required: false, type: 'range', description: '实际求和的区域（省略则对条件区域求和）' },
    ],
    examples: [
      {
        formula: '=SUMIF(A:A, "苹果", B:B)',
        description: '统计 A 列为"苹果"时，B 列对应金额的总和',
        sampleData: [
          ['产品', '金额'],
          ['苹果', 100],
          ['香蕉', 80],
          ['苹果', 150],
        ],
        expectedResult: '250',
      },
      {
        formula: '=SUMIF(B:B, ">100", B:B)',
        description: '统计 B 列中大于100的数值的总和',
        expectedResult: '（大于100的数值合计）',
      },
    ],
    tips: [
      '条件可以使用通配符：* 表示任意字符，? 表示单个字符',
      '条件使用比较运算符时需要用引号包围，如 ">100"',
      '如果需要多个条件，使用 SUMIFS',
    ],
    warnings: [
      '条件区域和求和区域的大小必须相同',
    ],
    relatedFunctions: ['SUMIFS', 'COUNTIF', 'AVERAGEIF'],
    keywords: ['条件求和', '按条件', 'sumif', '满足条件', '筛选求和'],
  },
  {
    name: 'SUMIFS',
    nameZh: '多条件求和',
    category: 'statistics',
    difficulty: 'medium',
    popularity: 8,
    description: '根据多个条件对区域中的值进行求和。比 SUMIF 更强大，支持多个筛选条件。',
    syntax: 'SUMIFS(求和区域, 条件区域1, 条件1, [条件区域2, 条件2], ...)',
    parameters: [
      { name: 'sum_range', nameZh: '求和区域', required: true, type: 'range', description: '实际求和的区域' },
      { name: 'criteria_range1', nameZh: '条件区域1', required: true, type: 'range', description: '第一个条件区域' },
      { name: 'criteria1', nameZh: '条件1', required: true, type: 'value', description: '第一个条件' },
      { name: 'criteria_range2', nameZh: '条件区域2', required: false, type: 'range', description: '第二个条件区域' },
      { name: 'criteria2', nameZh: '条件2', required: false, type: 'value', description: '第二个条件' },
    ],
    examples: [
      {
        formula: '=SUMIFS(C:C, A:A, "苹果", B:B, "北京")',
        description: '统计 A 列为"苹果"且 B 列为"北京"时，C 列的总和',
        sampleData: [
          ['产品', '城市', '金额'],
          ['苹果', '北京', 100],
          ['苹果', '上海', 80],
          ['香蕉', '北京', 60],
        ],
        expectedResult: '100',
      },
    ],
    tips: [
      '注意参数顺序：求和区域在第一个，与 SUMIF 不同',
      '可以添加任意多个条件对',
    ],
    warnings: [
      '所有区域的大小必须相同',
    ],
    relatedFunctions: ['SUMIF', 'COUNTIFS', 'AVERAGEIFS'],
    keywords: ['多条件求和', '多条件', 'sumifs', '同时满足'],
  },
  {
    name: 'AVERAGE',
    nameZh: '平均值',
    category: 'statistics',
    difficulty: 'easy',
    popularity: 9,
    description: '计算一组数值的算术平均值。',
    syntax: 'AVERAGE(数值1, [数值2], ...)',
    parameters: [
      { name: 'number1', nameZh: '数值1', required: true, type: 'any', description: '第一个数值或区域' },
      { name: 'number2', nameZh: '数值2', required: false, type: 'any', description: '其他数值或区域' },
    ],
    examples: [
      {
        formula: '=AVERAGE(A1:A10)',
        description: '计算 A1 到 A10 的平均值',
        sampleData: [[80], [90], [70], [85]],
        expectedResult: '81.25',
      },
    ],
    tips: [
      '空单元格不会计入平均值的计算',
      '如果需要按条件求平均，使用 AVERAGEIF',
    ],
    warnings: [
      '包含 0 的单元格会被计入，但空单元格不会',
    ],
    relatedFunctions: ['AVERAGEIF', 'AVERAGEIFS', 'SUM', 'COUNT'],
    keywords: ['平均', '均值', 'average', '平均分', '平均数'],
  },
  {
    name: 'COUNT',
    nameZh: '计数',
    category: 'statistics',
    difficulty: 'easy',
    popularity: 8,
    description: '计算包含数字的单元格个数。只统计数值，不统计文本。',
    syntax: 'COUNT(值1, [值2], ...)',
    parameters: [
      { name: 'value1', nameZh: '值1', required: true, type: 'any', description: '第一个值或区域' },
      { name: 'value2', nameZh: '值2', required: false, type: 'any', description: '其他值或区域' },
    ],
    examples: [
      {
        formula: '=COUNT(A1:A10)',
        description: '统计 A1 到 A10 中有多少个数字',
        expectedResult: '（数字单元格个数）',
      },
    ],
    tips: [
      '如果要统计非空单元格（包括文本），使用 COUNTA',
      '如果要按条件统计，使用 COUNTIF',
    ],
    warnings: [
      'COUNT 只统计数字，文本和空单元格会被忽略',
    ],
    relatedFunctions: ['COUNTA', 'COUNTIF', 'COUNTIFS', 'COUNTBLANK'],
    keywords: ['计数', '个数', 'count', '有几个', '多少个'],
  },
  {
    name: 'COUNTIF',
    nameZh: '条件计数',
    category: 'statistics',
    difficulty: 'easy',
    popularity: 9,
    description: '统计满足指定条件的单元格个数。',
    syntax: 'COUNTIF(区域, 条件)',
    parameters: [
      { name: 'range', nameZh: '区域', required: true, type: 'range', description: '要统计的区域' },
      { name: 'criteria', nameZh: '条件', required: true, type: 'value', description: '筛选条件' },
    ],
    examples: [
      {
        formula: '=COUNTIF(A:A, "苹果")',
        description: '统计 A 列中"苹果"出现的次数',
        sampleData: [['苹果'], ['香蕉'], ['苹果'], ['橙子']],
        expectedResult: '2',
      },
      {
        formula: '=COUNTIF(B:B, ">60")',
        description: '统计 B 列中大于60的数值个数',
        expectedResult: '（符合条件的个数）',
      },
    ],
    tips: [
      '可以使用通配符：* 匹配任意字符，? 匹配单个字符',
      '统计不等于某值：使用 "<>值"',
    ],
    warnings: [
      '条件区分大小写（英文）',
    ],
    relatedFunctions: ['COUNTIFS', 'SUMIF', 'COUNT', 'COUNTA'],
    keywords: ['条件计数', '统计个数', 'countif', '有多少', '出现次数'],
  },
  {
    name: 'COUNTIFS',
    nameZh: '多条件计数',
    category: 'statistics',
    difficulty: 'medium',
    popularity: 7,
    description: '统计满足多个条件的单元格个数。',
    syntax: 'COUNTIFS(条件区域1, 条件1, [条件区域2, 条件2], ...)',
    parameters: [
      { name: 'criteria_range1', nameZh: '条件区域1', required: true, type: 'range', description: '第一个条件区域' },
      { name: 'criteria1', nameZh: '条件1', required: true, type: 'value', description: '第一个条件' },
      { name: 'criteria_range2', nameZh: '条件区域2', required: false, type: 'range', description: '第二个条件区域' },
      { name: 'criteria2', nameZh: '条件2', required: false, type: 'value', description: '第二个条件' },
    ],
    examples: [
      {
        formula: '=COUNTIFS(A:A, "苹果", B:B, ">100")',
        description: '统计 A 列为"苹果"且 B 列大于100的记录数',
        expectedResult: '（符合所有条件的个数）',
      },
    ],
    tips: [
      '所有条件必须同时满足（AND 关系）',
    ],
    warnings: [
      '所有条件区域的大小必须相同',
    ],
    relatedFunctions: ['COUNTIF', 'SUMIFS', 'AVERAGEIFS'],
    keywords: ['多条件计数', 'countifs', '同时满足', '多个条件'],
  },
  {
    name: 'COUNTA',
    nameZh: '非空计数',
    category: 'statistics',
    difficulty: 'easy',
    popularity: 7,
    description: '计算包含任何内容（数字、文本等）的非空单元格个数。',
    syntax: 'COUNTA(值1, [值2], ...)',
    parameters: [
      { name: 'value1', nameZh: '值1', required: true, type: 'any', description: '第一个值或区域' },
      { name: 'value2', nameZh: '值2', required: false, type: 'any', description: '其他值或区域' },
    ],
    examples: [
      {
        formula: '=COUNTA(A1:A10)',
        description: '统计 A1 到 A10 中非空单元格的个数',
        expectedResult: '（非空单元格个数）',
      },
    ],
    tips: [
      '与 COUNT 不同，COUNTA 会统计文本单元格',
      '如果单元格包含空字符串 ""，COUNTA 仍会统计',
    ],
    warnings: [],
    relatedFunctions: ['COUNT', 'COUNTBLANK', 'COUNTIF'],
    keywords: ['非空', '有内容', 'counta', '不是空的'],
  },
  {
    name: 'MAX',
    nameZh: '最大值',
    category: 'statistics',
    difficulty: 'easy',
    popularity: 8,
    description: '返回一组数值中的最大值。',
    syntax: 'MAX(数值1, [数值2], ...)',
    parameters: [
      { name: 'number1', nameZh: '数值1', required: true, type: 'any', description: '第一个数值或区域' },
      { name: 'number2', nameZh: '数值2', required: false, type: 'any', description: '其他数值或区域' },
    ],
    examples: [
      {
        formula: '=MAX(A1:A10)',
        description: '返回 A1 到 A10 中的最大值',
        sampleData: [[85], [92], [78], [96]],
        expectedResult: '96',
      },
    ],
    tips: [
      '如果需要按条件求最大值，可以使用 MAXIFS（Excel 2019+）',
    ],
    warnings: [],
    relatedFunctions: ['MIN', 'MAXIFS', 'LARGE'],
    keywords: ['最大', '最高', 'max', '第一名', '峰值'],
  },
  {
    name: 'MIN',
    nameZh: '最小值',
    category: 'statistics',
    difficulty: 'easy',
    popularity: 8,
    description: '返回一组数值中的最小值。',
    syntax: 'MIN(数值1, [数值2], ...)',
    parameters: [
      { name: 'number1', nameZh: '数值1', required: true, type: 'any', description: '第一个数值或区域' },
      { name: 'number2', nameZh: '数值2', required: false, type: 'any', description: '其他数值或区域' },
    ],
    examples: [
      {
        formula: '=MIN(A1:A10)',
        description: '返回 A1 到 A10 中的最小值',
        sampleData: [[85], [92], [78], [96]],
        expectedResult: '78',
      },
    ],
    tips: [
      '如果需要按条件求最小值，可以使用 MINIFS（Excel 2019+）',
    ],
    warnings: [],
    relatedFunctions: ['MAX', 'MINIFS', 'SMALL'],
    keywords: ['最小', '最低', 'min', '最后一名', '谷底'],
  },
];
