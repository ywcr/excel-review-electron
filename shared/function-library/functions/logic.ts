/**
 * 逻辑判断类函数
 * IF, IFS, AND, OR, NOT, IFERROR 等
 */
import { ExcelFunction } from '../types';

export const LOGIC_FUNCTIONS: ExcelFunction[] = [
  {
    name: 'IF',
    nameZh: '条件判断',
    category: 'logic',
    difficulty: 'easy',
    popularity: 10,
    description: '根据条件返回不同的值。这是最常用的逻辑函数，可以实现"如果...则...否则..."的判断。',
    syntax: 'IF(条件, 条件为真时的值, [条件为假时的值])',
    parameters: [
      { name: 'logical_test', nameZh: '条件', required: true, type: 'boolean', description: '要判断的条件表达式' },
      { name: 'value_if_true', nameZh: '真值', required: true, type: 'any', description: '条件成立时返回的值' },
      { name: 'value_if_false', nameZh: '假值', required: false, type: 'any', description: '条件不成立时返回的值', defaultValue: 'FALSE' },
    ],
    examples: [
      {
        formula: '=IF(A1>=60, "及格", "不及格")',
        description: '判断成绩是否及格',
        sampleData: [[75]],
        expectedResult: '及格',
      },
      {
        formula: '=IF(A1>0, "正数", IF(A1<0, "负数", "零"))',
        description: 'IF嵌套：判断正负零',
        expectedResult: '（根据数值返回对应结果）',
      },
    ],
    tips: [
      '可以嵌套多个 IF 实现多条件判断',
      'Excel 2019+ 可以使用 IFS 函数替代多层嵌套',
      '条件可以使用比较运算符：=, <>, >, <, >=, <=',
    ],
    warnings: [
      '嵌套层数过多会导致公式难以阅读和维护',
      '条件表达式的结果必须是 TRUE 或 FALSE',
    ],
    relatedFunctions: ['IFS', 'AND', 'OR', 'IFERROR', 'SWITCH'],
    keywords: ['如果', '判断', '条件', 'if', '是否', '那么', '否则'],
  },
  {
    name: 'IFS',
    nameZh: '多条件判断',
    category: 'logic',
    difficulty: 'medium',
    popularity: 7,
    description: '检查多个条件，返回第一个为 TRUE 的条件对应的值。比嵌套 IF 更清晰。',
    syntax: 'IFS(条件1, 值1, [条件2, 值2], ...)',
    parameters: [
      { name: 'logical_test1', nameZh: '条件1', required: true, type: 'boolean', description: '第一个条件' },
      { name: 'value_if_true1', nameZh: '值1', required: true, type: 'any', description: '条件1为真时的值' },
      { name: 'logical_test2', nameZh: '条件2', required: false, type: 'boolean', description: '第二个条件' },
      { name: 'value_if_true2', nameZh: '值2', required: false, type: 'any', description: '条件2为真时的值' },
    ],
    examples: [
      {
        formula: '=IFS(A1>=90, "优秀", A1>=80, "良好", A1>=60, "及格", TRUE, "不及格")',
        description: '根据成绩评定等级',
        sampleData: [[85]],
        expectedResult: '良好',
      },
    ],
    tips: [
      '最后一个条件可以用 TRUE 作为"其他情况"的处理',
      '条件按顺序判断，返回第一个满足条件的值',
    ],
    warnings: [
      '仅 Excel 2019 及以上版本支持',
      '如果没有条件满足且没有 TRUE 作为最后条件，会返回错误',
    ],
    relatedFunctions: ['IF', 'SWITCH', 'CHOOSE'],
    keywords: ['多条件', '多个判断', 'ifs', '分级', '等级'],
  },
  {
    name: 'AND',
    nameZh: '且',
    category: 'logic',
    difficulty: 'easy',
    popularity: 8,
    description: '检查所有条件是否都为 TRUE。所有条件都满足时返回 TRUE，否则返回 FALSE。',
    syntax: 'AND(条件1, [条件2], ...)',
    parameters: [
      { name: 'logical1', nameZh: '条件1', required: true, type: 'boolean', description: '第一个条件' },
      { name: 'logical2', nameZh: '条件2', required: false, type: 'boolean', description: '其他条件' },
    ],
    examples: [
      {
        formula: '=AND(A1>=60, B1>=60)',
        description: '检查A1和B1是否都大于等于60',
        sampleData: [[75, 80]],
        expectedResult: 'TRUE',
      },
      {
        formula: '=IF(AND(A1>=18, A1<=65), "适龄", "不适龄")',
        description: '与IF配合判断年龄范围',
        expectedResult: '（根据年龄返回结果）',
      },
    ],
    tips: [
      '常与 IF 配合使用，实现多条件判断',
      '可以检查任意多个条件',
    ],
    warnings: [],
    relatedFunctions: ['OR', 'NOT', 'IF'],
    keywords: ['且', '同时', '都满足', 'and', '并且', '全部'],
  },
  {
    name: 'OR',
    nameZh: '或',
    category: 'logic',
    difficulty: 'easy',
    popularity: 8,
    description: '检查是否至少有一个条件为 TRUE。只要有一个条件满足就返回 TRUE。',
    syntax: 'OR(条件1, [条件2], ...)',
    parameters: [
      { name: 'logical1', nameZh: '条件1', required: true, type: 'boolean', description: '第一个条件' },
      { name: 'logical2', nameZh: '条件2', required: false, type: 'boolean', description: '其他条件' },
    ],
    examples: [
      {
        formula: '=OR(A1="VIP", B1>10000)',
        description: '检查是否是VIP或消费超过10000',
        expectedResult: '（满足任一条件返回TRUE）',
      },
      {
        formula: '=IF(OR(A1="", B1=""), "信息不完整", "已完成")',
        description: '检查是否有空值',
        expectedResult: '（根据情况返回结果）',
      },
    ],
    tips: [
      '与 AND 相反，只需要一个条件满足即可',
      '常用于"满足任意一个条件"的场景',
    ],
    warnings: [],
    relatedFunctions: ['AND', 'NOT', 'IF'],
    keywords: ['或', '任一', '其中一个', 'or', '或者', '满足一个'],
  },
  {
    name: 'NOT',
    nameZh: '非',
    category: 'logic',
    difficulty: 'easy',
    popularity: 6,
    description: '对逻辑值取反。TRUE 变 FALSE，FALSE 变 TRUE。',
    syntax: 'NOT(条件)',
    parameters: [
      { name: 'logical', nameZh: '条件', required: true, type: 'boolean', description: '要取反的逻辑值' },
    ],
    examples: [
      {
        formula: '=NOT(A1="")',
        description: '检查A1是否不为空',
        expectedResult: '（非空返回TRUE）',
      },
      {
        formula: '=IF(NOT(A1=0), A1, "")',
        description: '如果A1不为0则显示值，否则显示空',
        expectedResult: '（非0值或空）',
      },
    ],
    tips: [
      '可以将条件结果取反',
      '等同于使用 <> 比较',
    ],
    warnings: [],
    relatedFunctions: ['AND', 'OR', 'IF'],
    keywords: ['非', '不是', '取反', 'not', '相反', '否定'],
  },
  {
    name: 'IFERROR',
    nameZh: '错误处理',
    category: 'logic',
    difficulty: 'easy',
    popularity: 9,
    description: '如果公式结果是错误则返回指定值，否则返回公式结果。常用于处理 VLOOKUP 等函数的 #N/A 错误。',
    syntax: 'IFERROR(值, 错误时的值)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'any', description: '要计算的公式或值' },
      { name: 'value_if_error', nameZh: '错误时的值', required: true, type: 'any', description: '出错时返回的值' },
    ],
    examples: [
      {
        formula: '=IFERROR(VLOOKUP(A1, B:C, 2, FALSE), "未找到")',
        description: 'VLOOKUP找不到时显示"未找到"而不是#N/A',
        expectedResult: '（查找结果或"未找到"）',
      },
      {
        formula: '=IFERROR(A1/B1, 0)',
        description: '除法出错（如除以0）时返回0',
        expectedResult: '（计算结果或0）',
      },
    ],
    tips: [
      '包裹在易出错的公式外层使用',
      '可以处理所有类型的错误：#N/A, #VALUE!, #DIV/0! 等',
    ],
    warnings: [
      '会隐藏所有错误，可能掩盖真正的问题',
    ],
    relatedFunctions: ['IFNA', 'ISERROR', 'IF'],
    keywords: ['错误处理', '容错', 'iferror', '出错时', '异常'],
  },
  {
    name: 'IFNA',
    nameZh: 'NA错误处理',
    category: 'logic',
    difficulty: 'easy',
    popularity: 6,
    description: '仅当公式结果是 #N/A 错误时返回指定值。比 IFERROR 更精确。',
    syntax: 'IFNA(值, NA时的值)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'any', description: '要计算的公式或值' },
      { name: 'value_if_na', nameZh: 'NA时的值', required: true, type: 'any', description: '#N/A时返回的值' },
    ],
    examples: [
      {
        formula: '=IFNA(VLOOKUP(A1, B:C, 2, FALSE), "")',
        description: '只处理VLOOKUP的#N/A错误，其他错误正常显示',
        expectedResult: '（查找结果或空）',
      },
    ],
    tips: [
      '只处理 #N/A 错误，其他错误会正常显示',
      '更推荐用于 VLOOKUP、MATCH 等查找函数',
    ],
    warnings: [
      'Excel 2013 及以上版本支持',
    ],
    relatedFunctions: ['IFERROR', 'ISNA', 'VLOOKUP'],
    keywords: ['NA', 'N/A', 'ifna', '找不到', '不存在'],
  },
];
