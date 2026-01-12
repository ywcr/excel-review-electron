/**
 * 文本处理类函数
 * LEFT, RIGHT, MID, LEN, TRIM, CONCATENATE, TEXT 等
 */
import { ExcelFunction } from '../types';

export const TEXT_FUNCTIONS: ExcelFunction[] = [
  {
    name: 'LEFT',
    nameZh: '左取字符',
    category: 'text',
    difficulty: 'easy',
    popularity: 8,
    description: '从文本字符串的左侧开始提取指定个数的字符。',
    syntax: 'LEFT(文本, [字符数])',
    parameters: [
      { name: 'text', nameZh: '文本', required: true, type: 'text', description: '要提取字符的文本' },
      { name: 'num_chars', nameZh: '字符数', required: false, type: 'number', description: '要提取的字符个数', defaultValue: '1' },
    ],
    examples: [
      {
        formula: '=LEFT("张三丰", 2)',
        description: '从"张三丰"左侧提取2个字符',
        expectedResult: '张三',
      },
      {
        formula: '=LEFT(A1, 4)',
        description: '从A1单元格内容的左侧提取4个字符',
        expectedResult: '（前4个字符）',
      },
    ],
    tips: [
      '中文字符和英文字符都按1个计算',
      '如果省略字符数，默认提取1个字符',
    ],
    warnings: [
      '如果字符数大于文本长度，返回整个文本',
    ],
    relatedFunctions: ['RIGHT', 'MID', 'LEN'],
    keywords: ['左边', '开头', 'left', '前几个', '提取'],
  },
  {
    name: 'RIGHT',
    nameZh: '右取字符',
    category: 'text',
    difficulty: 'easy',
    popularity: 8,
    description: '从文本字符串的右侧开始提取指定个数的字符。',
    syntax: 'RIGHT(文本, [字符数])',
    parameters: [
      { name: 'text', nameZh: '文本', required: true, type: 'text', description: '要提取字符的文本' },
      { name: 'num_chars', nameZh: '字符数', required: false, type: 'number', description: '要提取的字符个数', defaultValue: '1' },
    ],
    examples: [
      {
        formula: '=RIGHT("张三丰", 2)',
        description: '从"张三丰"右侧提取2个字符',
        expectedResult: '三丰',
      },
      {
        formula: '=RIGHT("13812345678", 4)',
        description: '提取手机号后4位',
        expectedResult: '5678',
      },
    ],
    tips: [
      '常用于提取编号、手机号后几位等场景',
    ],
    warnings: [],
    relatedFunctions: ['LEFT', 'MID', 'LEN'],
    keywords: ['右边', '结尾', 'right', '后几个', '末尾'],
  },
  {
    name: 'MID',
    nameZh: '中间取字符',
    category: 'text',
    difficulty: 'easy',
    popularity: 7,
    description: '从文本字符串的指定位置开始提取指定个数的字符。',
    syntax: 'MID(文本, 开始位置, 字符数)',
    parameters: [
      { name: 'text', nameZh: '文本', required: true, type: 'text', description: '要提取字符的文本' },
      { name: 'start_num', nameZh: '开始位置', required: true, type: 'number', description: '从第几个字符开始（从1计数）' },
      { name: 'num_chars', nameZh: '字符数', required: true, type: 'number', description: '要提取的字符个数' },
    ],
    examples: [
      {
        formula: '=MID("张三丰武当派", 4, 3)',
        description: '从第4个字符开始提取3个字符',
        expectedResult: '武当派',
      },
      {
        formula: '=MID(A1, 7, 8)',
        description: '提取身份证号中的出生日期（第7-14位）',
        expectedResult: '（出生日期8位数字）',
      },
    ],
    tips: [
      '开始位置从1开始计数，不是0',
      '常用于提取身份证号中的信息',
    ],
    warnings: [
      '如果开始位置超过文本长度，返回空文本',
    ],
    relatedFunctions: ['LEFT', 'RIGHT', 'LEN', 'FIND'],
    keywords: ['中间', '截取', 'mid', '指定位置', '第几个开始'],
  },
  {
    name: 'LEN',
    nameZh: '文本长度',
    category: 'text',
    difficulty: 'easy',
    popularity: 7,
    description: '返回文本字符串的字符数。',
    syntax: 'LEN(文本)',
    parameters: [
      { name: 'text', nameZh: '文本', required: true, type: 'text', description: '要计算长度的文本' },
    ],
    examples: [
      {
        formula: '=LEN("张三丰")',
        description: '计算"张三丰"的字符数',
        expectedResult: '3',
      },
      {
        formula: '=LEN("Hello世界")',
        description: '中英文混合计算',
        expectedResult: '7',
      },
    ],
    tips: [
      '中文、英文、数字都按1个字符计算',
      '空格也算1个字符',
    ],
    warnings: [],
    relatedFunctions: ['LENB', 'LEFT', 'RIGHT', 'MID'],
    keywords: ['长度', '字符数', 'len', '几个字', '多长'],
  },
  {
    name: 'TRIM',
    nameZh: '去除空格',
    category: 'text',
    difficulty: 'easy',
    popularity: 7,
    description: '删除文本中多余的空格，只保留单词之间的单个空格。',
    syntax: 'TRIM(文本)',
    parameters: [
      { name: 'text', nameZh: '文本', required: true, type: 'text', description: '要清理空格的文本' },
    ],
    examples: [
      {
        formula: '=TRIM("  张三  丰  ")',
        description: '清理多余空格',
        expectedResult: '张三 丰',
      },
    ],
    tips: [
      '常用于清理从其他系统导入的数据',
      '只能清理普通空格，不能清理不间断空格',
    ],
    warnings: [],
    relatedFunctions: ['CLEAN', 'SUBSTITUTE'],
    keywords: ['去空格', '清理', 'trim', '删除空格', '整理'],
  },
  {
    name: 'CONCATENATE',
    nameZh: '文本合并',
    category: 'text',
    difficulty: 'easy',
    popularity: 8,
    description: '将多个文本字符串合并为一个。',
    syntax: 'CONCATENATE(文本1, [文本2], ...)',
    parameters: [
      { name: 'text1', nameZh: '文本1', required: true, type: 'text', description: '第一个文本' },
      { name: 'text2', nameZh: '文本2', required: false, type: 'text', description: '其他文本' },
    ],
    examples: [
      {
        formula: '=CONCATENATE(A1, "-", B1)',
        description: '用"-"连接A1和B1的内容',
        expectedResult: '（合并后的文本）',
      },
      {
        formula: '=CONCATENATE("姓名：", A1)',
        description: '在A1内容前加上"姓名："',
        expectedResult: '姓名：张三',
      },
    ],
    tips: [
      'Excel 2016+ 可以使用 CONCAT 函数，支持区域合并',
      '也可以使用 & 符号替代，如 A1&"-"&B1',
    ],
    warnings: [],
    relatedFunctions: ['CONCAT', 'TEXTJOIN'],
    keywords: ['合并', '连接', '拼接', 'concatenate', '组合'],
  },
  {
    name: 'TEXT',
    nameZh: '格式转换',
    category: 'text',
    difficulty: 'medium',
    popularity: 7,
    description: '将数值转换为指定格式的文本。常用于日期、数字的格式化显示。',
    syntax: 'TEXT(值, 格式代码)',
    parameters: [
      { name: 'value', nameZh: '值', required: true, type: 'value', description: '要格式化的数值' },
      { name: 'format_text', nameZh: '格式代码', required: true, type: 'text', description: '格式代码字符串' },
    ],
    examples: [
      {
        formula: '=TEXT(TODAY(), "YYYY年MM月DD日")',
        description: '将今天日期转换为中文格式',
        expectedResult: '2024年01月15日',
      },
      {
        formula: '=TEXT(0.85, "0%")',
        description: '将小数转换为百分比',
        expectedResult: '85%',
      },
      {
        formula: '=TEXT(1234.5, "#,##0.00")',
        description: '添加千位分隔符和两位小数',
        expectedResult: '1,234.50',
      },
    ],
    tips: [
      '常用格式代码：YYYY(年)、MM(月)、DD(日)、0(数字占位)、#(可选数字)',
      '结果是文本，无法用于数学计算',
    ],
    warnings: [
      'TEXT 返回的是文本，不是数值',
    ],
    relatedFunctions: ['VALUE', 'DATEVALUE', 'NUMBERVALUE'],
    keywords: ['格式', '转文本', 'text', '显示格式', '格式化'],
  },
  {
    name: 'SUBSTITUTE',
    nameZh: '替换文本',
    category: 'text',
    difficulty: 'easy',
    popularity: 7,
    description: '将文本中的指定字符串替换为新字符串。',
    syntax: 'SUBSTITUTE(文本, 旧文本, 新文本, [第几个])',
    parameters: [
      { name: 'text', nameZh: '文本', required: true, type: 'text', description: '原始文本' },
      { name: 'old_text', nameZh: '旧文本', required: true, type: 'text', description: '要被替换的文本' },
      { name: 'new_text', nameZh: '新文本', required: true, type: 'text', description: '替换后的文本' },
      { name: 'instance_num', nameZh: '第几个', required: false, type: 'number', description: '只替换第几个匹配项（省略则全部替换）' },
    ],
    examples: [
      {
        formula: '=SUBSTITUTE("张三丰", "三", "无")',
        description: '将"三"替换为"无"',
        expectedResult: '张无丰',
      },
      {
        formula: '=SUBSTITUTE(A1, " ", "")',
        description: '删除所有空格',
        expectedResult: '（无空格的文本）',
      },
    ],
    tips: [
      '区分大小写',
      '若要删除某个字符，新文本使用空字符串 ""',
    ],
    warnings: [],
    relatedFunctions: ['REPLACE', 'TRIM', 'CLEAN'],
    keywords: ['替换', '换成', 'substitute', '删除字符', '修改'],
  },
  {
    name: 'FIND',
    nameZh: '查找位置',
    category: 'text',
    difficulty: 'medium',
    popularity: 6,
    description: '在文本中查找指定字符串，返回其起始位置。区分大小写。',
    syntax: 'FIND(查找文本, 在文本中, [开始位置])',
    parameters: [
      { name: 'find_text', nameZh: '查找文本', required: true, type: 'text', description: '要查找的文本' },
      { name: 'within_text', nameZh: '在文本中', required: true, type: 'text', description: '被搜索的文本' },
      { name: 'start_num', nameZh: '开始位置', required: false, type: 'number', description: '从第几个字符开始查找', defaultValue: '1' },
    ],
    examples: [
      {
        formula: '=FIND("@", "test@example.com")',
        description: '查找@符号的位置',
        expectedResult: '5',
      },
    ],
    tips: [
      '常与 LEFT、MID 配合使用，提取特定位置的内容',
      '如果不区分大小写，使用 SEARCH 函数',
    ],
    warnings: [
      '如果找不到，返回 #VALUE! 错误',
      '区分大小写',
    ],
    relatedFunctions: ['SEARCH', 'MID', 'LEFT', 'RIGHT'],
    keywords: ['查找', '位置', 'find', '在哪', '第几个位置'],
  },
  {
    name: 'TEXTJOIN',
    nameZh: '按分隔符合并',
    category: 'text',
    difficulty: 'medium',
    popularity: 8,
    description: '使用指定分隔符将多个文本合并为一个，可以忽略空值。',
    syntax: 'TEXTJOIN(分隔符, 忽略空值, 文本1, [文本2], ...)',
    parameters: [
      { name: 'delimiter', nameZh: '分隔符', required: true, type: 'text', description: '用于分隔的字符' },
      { name: 'ignore_empty', nameZh: '忽略空值', required: true, type: 'boolean', description: 'TRUE=忽略空单元格' },
      { name: 'text1', nameZh: '文本1', required: true, type: 'text', description: '要合并的文本或区域' },
    ],
    examples: [
      {
        formula: '=TEXTJOIN(",", TRUE, A1:A10)',
        description: '用逗号合并A1到A10，忽略空值',
        expectedResult: '张三,李四,王五',
      },
      {
        formula: '=TEXTJOIN("-", FALSE, "2024", "01", "15")',
        description: '合并为日期格式',
        expectedResult: '2024-01-15',
      },
    ],
    tips: [
      '比 CONCATENATE 更强大，支持区域和忽略空值',
      '第二个参数设为 TRUE 可以忽略空单元格',
    ],
    warnings: [],
    relatedFunctions: ['CONCATENATE', 'CONCAT'],
    keywords: ['合并', '连接', '分隔符', 'textjoin', '拼接'],
  },
  {
    name: 'TEXTBEFORE',
    nameZh: '提取分隔符前',
    category: 'text',
    difficulty: 'medium',
    popularity: 6,
    description: '提取文本中指定分隔符之前的部分（Excel 365+）',
    syntax: 'TEXTBEFORE(text, delimiter, [instance_num], [match_mode], [match_end], [if_not_found])',
    parameters: [
      { name: 'text', nameZh: '文本', required: true, type: 'text', description: '原始文本' },
      { name: 'delimiter', nameZh: '分隔符', required: true, type: 'text', description: '分隔符' },
      { name: 'instance_num', nameZh: '第几个', required: false, type: 'number', description: '第几个分隔符，默认1' },
    ],
    examples: [
      {
        formula: '=TEXTBEFORE("张三-销售部-北京", "-")',
        description: '提取第一个-之前的内容',
        expectedResult: '张三',
      },
      {
        formula: '=TEXTBEFORE("a@b@c", "@", 2)',
        description: '提取第2个@之前的内容',
        expectedResult: 'a@b',
      },
    ],
    tips: [
      'Excel 365 专属函数',
      '负数表示从右边数',
    ],
    warnings: [],
    relatedFunctions: ['TEXTAFTER', 'LEFT', 'FIND'],
    keywords: ['提取', '之前', '分隔', 'textbefore', '左边'],
  },
  {
    name: 'TEXTAFTER',
    nameZh: '提取分隔符后',
    category: 'text',
    difficulty: 'medium',
    popularity: 6,
    description: '提取文本中指定分隔符之后的部分（Excel 365+）',
    syntax: 'TEXTAFTER(text, delimiter, [instance_num], [match_mode], [match_end], [if_not_found])',
    parameters: [
      { name: 'text', nameZh: '文本', required: true, type: 'text', description: '原始文本' },
      { name: 'delimiter', nameZh: '分隔符', required: true, type: 'text', description: '分隔符' },
      { name: 'instance_num', nameZh: '第几个', required: false, type: 'number', description: '第几个分隔符，默认1' },
    ],
    examples: [
      {
        formula: '=TEXTAFTER("张三-销售部-北京", "-")',
        description: '提取第一个-之后的内容',
        expectedResult: '销售部-北京',
      },
      {
        formula: '=TEXTAFTER("user@example.com", "@")',
        description: '提取邮箱域名',
        expectedResult: 'example.com',
      },
    ],
    tips: [
      'Excel 365 专属函数',
      '比 MID+FIND 组合更简洁',
    ],
    warnings: [],
    relatedFunctions: ['TEXTBEFORE', 'RIGHT', 'FIND'],
    keywords: ['提取', '之后', '分隔', 'textafter', '右边'],
  },
  {
    name: 'TEXTSPLIT',
    nameZh: '拆分文本',
    category: 'text',
    difficulty: 'medium',
    popularity: 7,
    description: '按分隔符将文本拆分为多个单元格（Excel 365+）',
    syntax: 'TEXTSPLIT(text, col_delimiter, [row_delimiter], [ignore_empty], [match_mode], [pad_with])',
    parameters: [
      { name: 'text', nameZh: '文本', required: true, type: 'text', description: '要拆分的文本' },
      { name: 'col_delimiter', nameZh: '列分隔符', required: true, type: 'text', description: '按此分隔符横向拆分' },
      { name: 'row_delimiter', nameZh: '行分隔符', required: false, type: 'text', description: '按此分隔符纵向拆分' },
    ],
    examples: [
      {
        formula: '=TEXTSPLIT("苹果,香蕉,橙子", ",")',
        description: '按逗号拆分为多列',
        expectedResult: '苹果 | 香蕉 | 橙子（分布在3个单元格）',
      },
      {
        formula: '=TEXTSPLIT("张三|李四;王五|赵六", "|", ";")',
        description: '同时按行和列拆分',
        expectedResult: '2x2的数组',
      },
    ],
    tips: [
      'Excel 365 专属函数',
      '返回动态数组，自动扩展到多个单元格',
      '也可用于将分隔符分隔的数据转换为表格',
    ],
    warnings: [],
    relatedFunctions: ['TEXTJOIN', 'FILTER'],
    keywords: ['拆分', '分列', '分隔', 'textsplit', '分开'],
  },
];
