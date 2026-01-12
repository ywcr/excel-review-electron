/**
 * 日期时间类函数
 * DATE, TODAY, NOW, YEAR, MONTH, DAY, DATEDIF 等
 */
import { ExcelFunction } from '../types';

export const DATE_FUNCTIONS: ExcelFunction[] = [
  {
    name: 'TODAY',
    nameZh: '今天日期',
    category: 'date',
    difficulty: 'easy',
    popularity: 9,
    description: '返回当前日期（不含时间）。每次打开或计算工作表时会自动更新。',
    syntax: 'TODAY()',
    parameters: [],
    examples: [
      {
        formula: '=TODAY()',
        description: '返回今天的日期',
        expectedResult: '（当前日期，如 2024/1/15）',
      },
      {
        formula: '=TODAY()+7',
        description: '返回一周后的日期',
        expectedResult: '（7天后的日期）',
      },
    ],
    tips: [
      '可以直接进行日期运算，如 TODAY()+30 表示30天后',
      '如果需要固定日期，请直接输入日期值',
    ],
    warnings: [
      '每次重新计算都会更新，不适合需要固定日期的场景',
    ],
    relatedFunctions: ['NOW', 'DATE', 'YEAR', 'MONTH', 'DAY'],
    keywords: ['今天', '当前日期', 'today', '今日', '现在'],
  },
  {
    name: 'NOW',
    nameZh: '当前时间',
    category: 'date',
    difficulty: 'easy',
    popularity: 7,
    description: '返回当前日期和时间。每次打开或计算工作表时会自动更新。',
    syntax: 'NOW()',
    parameters: [],
    examples: [
      {
        formula: '=NOW()',
        description: '返回当前日期和时间',
        expectedResult: '（如 2024/1/15 14:30:00）',
      },
    ],
    tips: [
      '如果只需要日期，使用 TODAY()',
      '可以用 INT(NOW()) 只保留日期部分',
    ],
    warnings: [
      '每次重新计算都会更新',
    ],
    relatedFunctions: ['TODAY', 'TIME', 'HOUR', 'MINUTE'],
    keywords: ['现在', '当前时间', 'now', '此刻', '时间戳'],
  },
  {
    name: 'DATE',
    nameZh: '构造日期',
    category: 'date',
    difficulty: 'easy',
    popularity: 8,
    description: '根据年、月、日创建日期值。',
    syntax: 'DATE(年, 月, 日)',
    parameters: [
      { name: 'year', nameZh: '年', required: true, type: 'number', description: '年份（1-9999）' },
      { name: 'month', nameZh: '月', required: true, type: 'number', description: '月份（1-12）' },
      { name: 'day', nameZh: '日', required: true, type: 'number', description: '日期（1-31）' },
    ],
    examples: [
      {
        formula: '=DATE(2024, 1, 15)',
        description: '创建2024年1月15日的日期',
        expectedResult: '2024/1/15',
      },
      {
        formula: '=DATE(YEAR(A1), MONTH(A1)+1, 1)',
        description: '根据A1日期，获取下个月1号',
        expectedResult: '（下个月1号的日期）',
      },
    ],
    tips: [
      '月份可以超过12，会自动进位到下一年',
      '日期可以是0或负数，会自动退回到上个月',
    ],
    warnings: [],
    relatedFunctions: ['YEAR', 'MONTH', 'DAY', 'TODAY'],
    keywords: ['日期', '创建日期', 'date', '构造', '年月日'],
  },
  {
    name: 'YEAR',
    nameZh: '提取年份',
    category: 'date',
    difficulty: 'easy',
    popularity: 8,
    description: '从日期中提取年份。',
    syntax: 'YEAR(日期)',
    parameters: [
      { name: 'serial_number', nameZh: '日期', required: true, type: 'value', description: '包含日期的单元格或日期值' },
    ],
    examples: [
      {
        formula: '=YEAR(TODAY())',
        description: '提取今年的年份',
        expectedResult: '2024',
      },
      {
        formula: '=YEAR(A1)',
        description: '提取A1单元格日期的年份',
        expectedResult: '（年份数字）',
      },
    ],
    tips: [
      '返回的是数字，可以用于计算',
    ],
    warnings: [],
    relatedFunctions: ['MONTH', 'DAY', 'DATE'],
    keywords: ['年份', '哪一年', 'year', '年', '提取年'],
  },
  {
    name: 'MONTH',
    nameZh: '提取月份',
    category: 'date',
    difficulty: 'easy',
    popularity: 8,
    description: '从日期中提取月份（1-12）。',
    syntax: 'MONTH(日期)',
    parameters: [
      { name: 'serial_number', nameZh: '日期', required: true, type: 'value', description: '包含日期的单元格或日期值' },
    ],
    examples: [
      {
        formula: '=MONTH(TODAY())',
        description: '提取当前月份',
        expectedResult: '（1-12的数字）',
      },
    ],
    tips: [
      '返回1-12的数字',
    ],
    warnings: [],
    relatedFunctions: ['YEAR', 'DAY', 'DATE'],
    keywords: ['月份', '几月', 'month', '月', '提取月'],
  },
  {
    name: 'DAY',
    nameZh: '提取日',
    category: 'date',
    difficulty: 'easy',
    popularity: 7,
    description: '从日期中提取日期（1-31）。',
    syntax: 'DAY(日期)',
    parameters: [
      { name: 'serial_number', nameZh: '日期', required: true, type: 'value', description: '包含日期的单元格或日期值' },
    ],
    examples: [
      {
        formula: '=DAY(TODAY())',
        description: '提取今天是几号',
        expectedResult: '（1-31的数字）',
      },
    ],
    tips: [],
    warnings: [],
    relatedFunctions: ['YEAR', 'MONTH', 'DATE'],
    keywords: ['日', '几号', 'day', '号', '提取日'],
  },
  {
    name: 'DATEDIF',
    nameZh: '日期差',
    category: 'date',
    difficulty: 'medium',
    popularity: 8,
    description: '计算两个日期之间的差值，可以返回年数、月数或天数。',
    syntax: 'DATEDIF(开始日期, 结束日期, 单位)',
    parameters: [
      { name: 'start_date', nameZh: '开始日期', required: true, type: 'value', description: '较早的日期' },
      { name: 'end_date', nameZh: '结束日期', required: true, type: 'value', description: '较晚的日期' },
      { name: 'unit', nameZh: '单位', required: true, type: 'text', description: '"Y"=年数, "M"=月数, "D"=天数' },
    ],
    examples: [
      {
        formula: '=DATEDIF(A1, TODAY(), "Y")',
        description: '计算从A1日期到今天的完整年数（可用于计算年龄）',
        expectedResult: '（年数）',
      },
      {
        formula: '=DATEDIF("2020/1/1", "2024/6/15", "M")',
        description: '计算两个日期之间的月数',
        expectedResult: '53',
      },
      {
        formula: '=DATEDIF(A1, B1, "D")',
        description: '计算两个日期之间的天数差',
        expectedResult: '（天数）',
      },
    ],
    tips: [
      '"Y" = 完整年数',
      '"M" = 完整月数',
      '"D" = 天数',
      '"YM" = 年后剩余月数',
      '"MD" = 月后剩余天数',
      '计算年龄常用：=DATEDIF(出生日期, TODAY(), "Y")',
    ],
    warnings: [
      '开始日期必须早于结束日期，否则返回错误',
      '这是一个隐藏函数，公式输入时不会有提示',
    ],
    relatedFunctions: ['DATE', 'YEAR', 'MONTH', 'DAY'],
    keywords: ['日期差', '相差', 'datedif', '间隔', '年龄', '多少天', '多少年'],
  },
  {
    name: 'WEEKDAY',
    nameZh: '星期几',
    category: 'date',
    difficulty: 'easy',
    popularity: 6,
    description: '返回日期对应的星期几（数字形式）。',
    syntax: 'WEEKDAY(日期, [类型])',
    parameters: [
      { name: 'serial_number', nameZh: '日期', required: true, type: 'value', description: '日期值' },
      { name: 'return_type', nameZh: '类型', required: false, type: 'number', description: '1=周日为1, 2=周一为1', defaultValue: '1' },
    ],
    examples: [
      {
        formula: '=WEEKDAY(TODAY(), 2)',
        description: '返回今天是星期几（周一=1，周日=7）',
        expectedResult: '（1-7的数字）',
      },
    ],
    tips: [
      '第二参数用2更符合中国习惯（周一为1）',
      '可以配合 CHOOSE 函数转换为中文星期',
    ],
    warnings: [],
    relatedFunctions: ['WEEKNUM', 'TODAY', 'DATE'],
    keywords: ['星期', '周几', 'weekday', '礼拜', '工作日'],
  },
  {
    name: 'EOMONTH',
    nameZh: '月末日期',
    category: 'date',
    difficulty: 'medium',
    popularity: 6,
    description: '返回指定月数之前或之后的月末日期。',
    syntax: 'EOMONTH(开始日期, 月数)',
    parameters: [
      { name: 'start_date', nameZh: '开始日期', required: true, type: 'value', description: '基准日期' },
      { name: 'months', nameZh: '月数', required: true, type: 'number', description: '向前（负数）或向后（正数）的月份数' },
    ],
    examples: [
      {
        formula: '=EOMONTH(TODAY(), 0)',
        description: '返回本月最后一天',
        expectedResult: '（本月月末日期）',
      },
      {
        formula: '=EOMONTH(TODAY(), 1)',
        description: '返回下个月最后一天',
        expectedResult: '（下月月末日期）',
      },
    ],
    tips: [
      '月数为0表示当月月末',
      '常用于财务计算中确定账期结束日',
    ],
    warnings: [],
    relatedFunctions: ['DATE', 'MONTH', 'DAY'],
    keywords: ['月末', '月底', 'eomonth', '最后一天', '月份结束'],
  },
];
