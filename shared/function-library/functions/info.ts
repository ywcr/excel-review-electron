/**
 * Excel 信息函数
 */

import { ExcelFunction } from '../types';

export const INFO_FUNCTIONS: ExcelFunction[] = [
  {
    name: 'ISNUMBER',
    nameZh: '是否数字',
    category: 'logic',
    difficulty: 'easy',
    popularity: 7,
    description: '判断值是否为数字，返回 TRUE 或 FALSE',
    syntax: 'ISNUMBER(value)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'value', description: '要检查的值' }
    ],
    examples: [
      { formula: '=ISNUMBER(A1)', description: '检查单元格是否为数字', expectedResult: 'TRUE 或 FALSE' },
      { formula: '=ISNUMBER(DATEVALUE(A1))', description: '验证日期格式', expectedResult: '日期有效返回TRUE' }
    ],
    tips: ['日期在 Excel 中也是数字', '常用于数据验证'],
    warnings: [],
    relatedFunctions: ['ISTEXT', 'ISBLANK', 'IFERROR'],
    keywords: ['是否数字', 'isnumber', '判断', '数字', '验证']
  },
  {
    name: 'ISTEXT',
    nameZh: '是否文本',
    category: 'logic',
    difficulty: 'easy',
    popularity: 6,
    description: '判断值是否为文本',
    syntax: 'ISTEXT(value)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'value', description: '要检查的值' }
    ],
    examples: [
      { formula: '=ISTEXT(A1)', description: '检查是否为文本', expectedResult: 'TRUE 或 FALSE' }
    ],
    tips: ['空单元格返回 FALSE，空字符串返回 TRUE'],
    warnings: [],
    relatedFunctions: ['ISNUMBER', 'ISBLANK'],
    keywords: ['是否文本', 'istext', '判断', '文本']
  },
  {
    name: 'ISBLANK',
    nameZh: '是否空白',
    category: 'logic',
    difficulty: 'easy',
    popularity: 8,
    description: '判断单元格是否为空',
    syntax: 'ISBLANK(value)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'value', description: '要检查的单元格' }
    ],
    examples: [
      { formula: '=IF(ISBLANK(A1), "请填写", "已填写")', description: '检查必填项', expectedResult: '根据是否为空返回提示' },
      { formula: '=COUNTBLANK(A1:A100)', description: '统计空单元格数量', expectedResult: '空单元格的数量' }
    ],
    tips: ['只有完全空白才返回 TRUE', '常用于数据验证'],
    warnings: ['包含空格或公式的不算空白'],
    relatedFunctions: ['COUNTBLANK', 'IF', 'ISNUMBER'],
    keywords: ['是否为空', 'isblank', '空白', '空单元格', '必填']
  },
  {
    name: 'ISERROR',
    nameZh: '是否错误',
    category: 'logic',
    difficulty: 'easy',
    popularity: 7,
    description: '判断值是否为任何错误类型',
    syntax: 'ISERROR(value)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'value', description: '要检查的值' }
    ],
    examples: [
      { formula: '=IF(ISERROR(A1/B1), 0, A1/B1)', description: '避免除零错误', expectedResult: '出错返回0' }
    ],
    tips: ['检测所有错误类型', '建议用 IFERROR 替代'],
    warnings: [],
    relatedFunctions: ['IFERROR', 'ISNA'],
    keywords: ['是否错误', 'iserror', '错误', '判断']
  },
  {
    name: 'IFERROR',
    nameZh: '错误处理',
    category: 'logic',
    difficulty: 'easy',
    popularity: 9,
    description: '如果公式出错则返回指定值，否则返回公式结果',
    syntax: 'IFERROR(value, value_if_error)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'value', description: '要检查的公式' },
      { name: 'value_if_error', nameZh: '错误值', required: true, type: 'value', description: '出错时返回的值' }
    ],
    examples: [
      { formula: '=IFERROR(VLOOKUP(A1, 数据!A:B, 2, FALSE), "")', description: 'VLOOKUP找不到返回空', expectedResult: '找到返回结果，否则空' },
      { formula: '=IFERROR(A1/B1, 0)', description: '除法出错返回0', expectedResult: '正常返回商，否则0' }
    ],
    tips: ['比 IF+ISERROR 更简洁', '处理所有错误类型'],
    warnings: [],
    relatedFunctions: ['IFNA', 'ISERROR', 'VLOOKUP'],
    keywords: ['错误处理', 'iferror', '避免错误', '容错']
  },
  {
    name: 'IFNA',
    nameZh: 'NA错误处理',
    category: 'logic',
    difficulty: 'easy',
    popularity: 7,
    description: '仅当公式返回 #N/A 时返回指定值',
    syntax: 'IFNA(value, value_if_na)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'value', description: '要检查的公式' },
      { name: 'value_if_na', nameZh: 'NA值', required: true, type: 'value', description: '#N/A 时返回的值' }
    ],
    examples: [
      { formula: '=IFNA(VLOOKUP(A1, B:C, 2, FALSE), "未找到")', description: '查找失败返回提示', expectedResult: '找到返回结果，#N/A返回"未找到"' }
    ],
    tips: ['只处理 #N/A，其他错误正常显示', '比 IFERROR 更精确'],
    warnings: [],
    relatedFunctions: ['IFERROR', 'VLOOKUP'],
    keywords: ['NA', 'ifna', '找不到', '未找到']
  },
  {
    name: 'ISNA',
    nameZh: '是否NA',
    category: 'logic',
    difficulty: 'easy',
    popularity: 5,
    description: '判断值是否为 #N/A 错误',
    syntax: 'ISNA(value)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'value', description: '要检查的值' }
    ],
    examples: [
      { formula: '=IF(ISNA(VLOOKUP(...)), "未找到", "已找到")', description: '检查查找结果', expectedResult: '根据查找结果返回提示' }
    ],
    tips: ['只检测 #N/A 错误'],
    warnings: [],
    relatedFunctions: ['IFNA', 'ISERROR'],
    keywords: ['isna', 'NA', '判断']
  },
  {
    name: 'TYPE',
    nameZh: '值类型',
    category: 'logic',
    difficulty: 'medium',
    popularity: 4,
    description: '返回值的类型编号',
    syntax: 'TYPE(value)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'value', description: '要检查的值' }
    ],
    examples: [
      { formula: '=TYPE(A1)', description: '判断值的类型', expectedResult: '1=数字，2=文本，4=逻辑，16=错误' }
    ],
    tips: ['类型编号：1=数字，2=文本，4=逻辑，16=错误，64=数组'],
    warnings: [],
    relatedFunctions: ['ISNUMBER', 'ISTEXT'],
    keywords: ['类型', 'type', '判断类型']
  }
];
