/**
 * 查找匹配类函数
 * VLOOKUP, HLOOKUP, INDEX, MATCH, XLOOKUP 等
 */
import { ExcelFunction } from '../types';

export const LOOKUP_FUNCTIONS: ExcelFunction[] = [
  {
    name: 'VLOOKUP',
    nameZh: '垂直查找',
    category: 'lookup',
    difficulty: 'medium',
    popularity: 10,
    description: '在表格的第一列中查找指定值，返回同一行中指定列的值。这是最常用的查找函数。',
    syntax: 'VLOOKUP(查找值, 查找区域, 返回列号, [匹配类型])',
    parameters: [
      { name: 'lookup_value', nameZh: '查找值', required: true, type: 'value', description: '要查找的值，例如姓名、编号等' },
      { name: 'table_array', nameZh: '查找区域', required: true, type: 'range', description: '包含数据的区域，第一列必须是查找列' },
      { name: 'col_index_num', nameZh: '返回列号', required: true, type: 'number', description: '返回第几列的值（从1开始计数）' },
      { name: 'range_lookup', nameZh: '匹配类型', required: false, type: 'boolean', description: 'FALSE=精确匹配（推荐），TRUE=近似匹配', defaultValue: 'FALSE' },
    ],
    examples: [
      {
        formula: '=VLOOKUP("张三", A2:C10, 3, FALSE)',
        description: '在 A2:C10 区域中查找"张三"，返回第3列的值',
        sampleData: [
          ['姓名', '部门', '电话'],
          ['张三', '销售部', '13800001111'],
          ['李四', '技术部', '13800002222'],
        ],
        expectedResult: '13800001111',
      },
      {
        formula: '=VLOOKUP(A2, 产品表!A:C, 2, FALSE)',
        description: '跨表查找：根据A2的产品编号，从产品表中查找产品名称',
        expectedResult: '（返回对应的产品名称）',
      },
    ],
    tips: [
      '第四个参数建议始终使用 FALSE，确保精确匹配',
      '查找值必须在区域的第一列，这是 VLOOKUP 的限制',
      '如需更灵活的查找，可以考虑 INDEX+MATCH 组合',
    ],
    warnings: [
      '如果找不到匹配值，返回 #N/A 错误',
      '查找区域的第一列必须包含查找值',
      '返回列号不能超过查找区域的列数',
    ],
    relatedFunctions: ['HLOOKUP', 'INDEX', 'MATCH', 'XLOOKUP'],
    keywords: ['查找', '匹配', '搜索', 'lookup', '根据...查找', '对应', '关联'],
  },
  {
    name: 'HLOOKUP',
    nameZh: '水平查找',
    category: 'lookup',
    difficulty: 'medium',
    popularity: 6,
    description: '在表格的第一行中查找指定值，返回同一列中指定行的值。与VLOOKUP类似，但方向是水平的。',
    syntax: 'HLOOKUP(查找值, 查找区域, 返回行号, [匹配类型])',
    parameters: [
      { name: 'lookup_value', nameZh: '查找值', required: true, type: 'value', description: '要查找的值' },
      { name: 'table_array', nameZh: '查找区域', required: true, type: 'range', description: '包含数据的区域，第一行是查找行' },
      { name: 'row_index_num', nameZh: '返回行号', required: true, type: 'number', description: '返回第几行的值' },
      { name: 'range_lookup', nameZh: '匹配类型', required: false, type: 'boolean', description: 'FALSE=精确匹配，TRUE=近似匹配', defaultValue: 'FALSE' },
    ],
    examples: [
      {
        formula: '=HLOOKUP("销售额", A1:D3, 2, FALSE)',
        description: '在第一行查找"销售额"，返回第2行对应的值',
        expectedResult: '（返回销售额对应的数值）',
      },
    ],
    tips: [
      '适用于表头在第一行、数据横向排列的表格',
      '如果表格是纵向排列，应使用 VLOOKUP',
    ],
    warnings: [
      '查找值必须在区域的第一行',
    ],
    relatedFunctions: ['VLOOKUP', 'INDEX', 'MATCH'],
    keywords: ['水平查找', '横向', 'hlookup'],
  },
  {
    name: 'INDEX',
    nameZh: '索引',
    category: 'lookup',
    difficulty: 'medium',
    popularity: 8,
    description: '返回表格或区域中指定行列位置的值。常与 MATCH 函数配合使用，实现比 VLOOKUP 更灵活的查找。',
    syntax: 'INDEX(数组, 行号, [列号])',
    parameters: [
      { name: 'array', nameZh: '数组', required: true, type: 'range', description: '包含数据的区域' },
      { name: 'row_num', nameZh: '行号', required: true, type: 'number', description: '要返回的行号' },
      { name: 'column_num', nameZh: '列号', required: false, type: 'number', description: '要返回的列号（单列区域可省略）' },
    ],
    examples: [
      {
        formula: '=INDEX(A1:C10, 3, 2)',
        description: '返回 A1:C10 区域中第3行第2列的值',
        expectedResult: '（返回对应单元格的值）',
      },
      {
        formula: '=INDEX(A:A, MATCH("张三", B:B, 0))',
        description: 'INDEX+MATCH组合：根据B列的"张三"，返回A列对应的值',
        expectedResult: '（返回张三对应的A列值）',
      },
    ],
    tips: [
      'INDEX+MATCH 组合比 VLOOKUP 更灵活，查找列可以在返回列的右边',
      '适合需要双向查找的场景',
    ],
    warnings: [
      '行号或列号超出范围会返回 #REF! 错误',
    ],
    relatedFunctions: ['MATCH', 'VLOOKUP', 'OFFSET'],
    keywords: ['索引', '取值', '返回', 'index', '第几行', '第几列'],
  },
  {
    name: 'MATCH',
    nameZh: '匹配',
    category: 'lookup',
    difficulty: 'medium',
    popularity: 8,
    description: '在指定区域中查找指定值，返回该值在区域中的相对位置（行号或列号）。',
    syntax: 'MATCH(查找值, 查找区域, [匹配类型])',
    parameters: [
      { name: 'lookup_value', nameZh: '查找值', required: true, type: 'value', description: '要查找的值' },
      { name: 'lookup_array', nameZh: '查找区域', required: true, type: 'range', description: '单行或单列的查找区域' },
      { name: 'match_type', nameZh: '匹配类型', required: false, type: 'number', description: '0=精确匹配，1=小于等于，-1=大于等于', defaultValue: '0' },
    ],
    examples: [
      {
        formula: '=MATCH("张三", A:A, 0)',
        description: '在A列查找"张三"，返回它的行号',
        expectedResult: '（返回行号，如 5）',
      },
    ],
    tips: [
      '第三个参数使用 0 表示精确匹配，这是最常用的方式',
      '通常与 INDEX 配合使用，实现灵活的查找',
    ],
    warnings: [
      '如果找不到匹配值，返回 #N/A 错误',
      '查找区域必须是单行或单列',
    ],
    relatedFunctions: ['INDEX', 'VLOOKUP', 'SEARCH'],
    keywords: ['匹配', '位置', '行号', 'match', '第几个', '在哪里'],
  },
  {
    name: 'XLOOKUP',
    nameZh: '增强查找',
    category: 'lookup',
    difficulty: 'easy',
    popularity: 9,
    description: 'Excel 新版查找函数，比 VLOOKUP 更强大、更易用。可以向左查找，支持默认值，功能更全面。',
    syntax: 'XLOOKUP(查找值, 查找区域, 返回区域, [找不到时], [匹配模式], [搜索模式])',
    parameters: [
      { name: 'lookup_value', nameZh: '查找值', required: true, type: 'value', description: '要查找的值' },
      { name: 'lookup_array', nameZh: '查找区域', required: true, type: 'range', description: '用于查找的单列或单行' },
      { name: 'return_array', nameZh: '返回区域', required: true, type: 'range', description: '返回结果的单列或单行' },
      { name: 'if_not_found', nameZh: '找不到时', required: false, type: 'value', description: '找不到时返回的值', defaultValue: '#N/A' },
      { name: 'match_mode', nameZh: '匹配模式', required: false, type: 'number', description: '0=精确匹配，-1=近似小于，1=近似大于', defaultValue: '0' },
      { name: 'search_mode', nameZh: '搜索模式', required: false, type: 'number', description: '1=从头搜索，-1=从尾搜索', defaultValue: '1' },
    ],
    examples: [
      {
        formula: '=XLOOKUP("张三", B:B, A:A, "未找到")',
        description: '在B列查找"张三"，返回A列对应的值，找不到则显示"未找到"',
        expectedResult: '（返回A列对应值或"未找到"）',
      },
    ],
    tips: [
      '相比 VLOOKUP，XLOOKUP 可以向左查找',
      '第四个参数可以设置找不到时的默认值，避免 #N/A 错误',
      '如果你的 Excel 版本支持，优先使用 XLOOKUP',
    ],
    warnings: [
      'XLOOKUP 仅在 Excel 2021 及 Microsoft 365 中可用',
      'WPS 2019 及以上版本也支持此函数',
    ],
    relatedFunctions: ['VLOOKUP', 'INDEX', 'MATCH'],
    keywords: ['查找', '新版', 'xlookup', '增强', '向左查找'],
  },
];
