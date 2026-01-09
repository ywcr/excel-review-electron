/**
 * 数学运算类函数
 * ROUND, ABS, INT, MOD, POWER, SQRT 等
 */
import { ExcelFunction } from './types';

export const MATH_FUNCTIONS: ExcelFunction[] = [
  {
    name: 'ROUND',
    nameZh: '四舍五入',
    category: 'math',
    difficulty: 'easy',
    popularity: 9,
    description: '将数值四舍五入到指定的位数。',
    syntax: 'ROUND(数值, 位数)',
    parameters: [
      { name: 'number', nameZh: '数值', required: true, type: 'number', description: '要四舍五入的数值' },
      { name: 'num_digits', nameZh: '位数', required: true, type: 'number', description: '保留的小数位数（可以是负数）' },
    ],
    examples: [
      {
        formula: '=ROUND(3.456, 2)',
        description: '保留2位小数',
        expectedResult: '3.46',
      },
      {
        formula: '=ROUND(1234.5, -2)',
        description: '四舍五入到百位',
        expectedResult: '1200',
      },
    ],
    tips: [
      '位数为正数：保留小数位',
      '位数为0：取整',
      '位数为负数：四舍五入到十位、百位等',
    ],
    warnings: [],
    relatedFunctions: ['ROUNDUP', 'ROUNDDOWN', 'INT', 'TRUNC'],
    keywords: ['四舍五入', '取整', 'round', '保留小数', '约等于'],
  },
  {
    name: 'ROUNDUP',
    nameZh: '向上舍入',
    category: 'math',
    difficulty: 'easy',
    popularity: 7,
    description: '向上舍入（远离0的方向），不论第一个被舍去的数字是多少。',
    syntax: 'ROUNDUP(数值, 位数)',
    parameters: [
      { name: 'number', nameZh: '数值', required: true, type: 'number', description: '要舍入的数值' },
      { name: 'num_digits', nameZh: '位数', required: true, type: 'number', description: '保留的小数位数' },
    ],
    examples: [
      {
        formula: '=ROUNDUP(3.21, 1)',
        description: '向上舍入到1位小数',
        expectedResult: '3.3',
      },
      {
        formula: '=ROUNDUP(21, -1)',
        description: '向上舍入到十位',
        expectedResult: '30',
      },
    ],
    tips: [
      '总是远离0舍入，正数变大，负数变更小',
      '常用于计算"至少需要多少"的场景',
    ],
    warnings: [],
    relatedFunctions: ['ROUNDDOWN', 'ROUND', 'CEILING'],
    keywords: ['向上', '进位', 'roundup', '至少', '不少于'],
  },
  {
    name: 'ROUNDDOWN',
    nameZh: '向下舍入',
    category: 'math',
    difficulty: 'easy',
    popularity: 7,
    description: '向下舍入（向0的方向），直接截断。',
    syntax: 'ROUNDDOWN(数值, 位数)',
    parameters: [
      { name: 'number', nameZh: '数值', required: true, type: 'number', description: '要舍入的数值' },
      { name: 'num_digits', nameZh: '位数', required: true, type: 'number', description: '保留的小数位数' },
    ],
    examples: [
      {
        formula: '=ROUNDDOWN(3.99, 1)',
        description: '向下舍入到1位小数',
        expectedResult: '3.9',
      },
    ],
    tips: [
      '总是向0舍入，相当于截断',
      '与 TRUNC 函数效果相同',
    ],
    warnings: [],
    relatedFunctions: ['ROUNDUP', 'ROUND', 'TRUNC', 'INT'],
    keywords: ['向下', '截断', 'rounddown', '舍去', '不超过'],
  },
  {
    name: 'INT',
    nameZh: '取整',
    category: 'math',
    difficulty: 'easy',
    popularity: 8,
    description: '将数值向下取整到最接近的整数。',
    syntax: 'INT(数值)',
    parameters: [
      { name: 'number', nameZh: '数值', required: true, type: 'number', description: '要取整的数值' },
    ],
    examples: [
      {
        formula: '=INT(8.9)',
        description: '取整',
        expectedResult: '8',
      },
      {
        formula: '=INT(-8.9)',
        description: '负数取整（向负无穷方向）',
        expectedResult: '-9',
      },
    ],
    tips: [
      '对于正数，直接去掉小数部分',
      '对于负数，向负无穷方向取整',
    ],
    warnings: [
      '负数的行为可能与预期不同：INT(-2.5)=-3',
    ],
    relatedFunctions: ['TRUNC', 'ROUND', 'FLOOR'],
    keywords: ['取整', '整数', 'int', '去掉小数', '向下取整'],
  },
  {
    name: 'ABS',
    nameZh: '绝对值',
    category: 'math',
    difficulty: 'easy',
    popularity: 7,
    description: '返回数值的绝对值（去掉正负号）。',
    syntax: 'ABS(数值)',
    parameters: [
      { name: 'number', nameZh: '数值', required: true, type: 'number', description: '任意实数' },
    ],
    examples: [
      {
        formula: '=ABS(-5)',
        description: '取-5的绝对值',
        expectedResult: '5',
      },
      {
        formula: '=ABS(A1-B1)',
        description: '计算A1和B1的差的绝对值',
        expectedResult: '（非负数值）',
      },
    ],
    tips: [
      '常用于计算两个数的差距大小',
    ],
    warnings: [],
    relatedFunctions: ['SIGN', 'INT'],
    keywords: ['绝对值', '正数', 'abs', '大小', '距离'],
  },
  {
    name: 'MOD',
    nameZh: '取余',
    category: 'math',
    difficulty: 'easy',
    popularity: 7,
    description: '返回两数相除的余数。',
    syntax: 'MOD(被除数, 除数)',
    parameters: [
      { name: 'number', nameZh: '被除数', required: true, type: 'number', description: '被除数' },
      { name: 'divisor', nameZh: '除数', required: true, type: 'number', description: '除数' },
    ],
    examples: [
      {
        formula: '=MOD(10, 3)',
        description: '10除以3的余数',
        expectedResult: '1',
      },
      {
        formula: '=MOD(ROW(), 2)',
        description: '判断行号奇偶（用于隔行着色）',
        expectedResult: '（0或1）',
      },
    ],
    tips: [
      '常用于判断奇偶：MOD(A1, 2)=0 表示偶数',
      '可用于循环计算：每N个一组',
    ],
    warnings: [
      '除数不能为0',
    ],
    relatedFunctions: ['QUOTIENT', 'INT'],
    keywords: ['余数', '取模', 'mod', '整除', '奇偶'],
  },
  {
    name: 'POWER',
    nameZh: '幂运算',
    category: 'math',
    difficulty: 'easy',
    popularity: 6,
    description: '返回数字的指定次幂。',
    syntax: 'POWER(底数, 指数)',
    parameters: [
      { name: 'number', nameZh: '底数', required: true, type: 'number', description: '底数' },
      { name: 'power', nameZh: '指数', required: true, type: 'number', description: '指数（幂次）' },
    ],
    examples: [
      {
        formula: '=POWER(2, 10)',
        description: '2的10次方',
        expectedResult: '1024',
      },
      {
        formula: '=POWER(9, 0.5)',
        description: '9的0.5次方（即开方）',
        expectedResult: '3',
      },
    ],
    tips: [
      '也可以使用 ^ 符号：2^10 等同于 POWER(2,10)',
      '指数为0.5可用于开平方',
    ],
    warnings: [],
    relatedFunctions: ['SQRT', 'EXP', 'LOG'],
    keywords: ['幂', '次方', 'power', '乘方', '指数'],
  },
  {
    name: 'SQRT',
    nameZh: '平方根',
    category: 'math',
    difficulty: 'easy',
    popularity: 6,
    description: '返回数字的平方根。',
    syntax: 'SQRT(数值)',
    parameters: [
      { name: 'number', nameZh: '数值', required: true, type: 'number', description: '要计算平方根的非负数' },
    ],
    examples: [
      {
        formula: '=SQRT(16)',
        description: '16的平方根',
        expectedResult: '4',
      },
    ],
    tips: [
      '等同于 POWER(n, 0.5)',
    ],
    warnings: [
      '参数必须是非负数，否则返回 #NUM! 错误',
    ],
    relatedFunctions: ['POWER', 'SQRTPI'],
    keywords: ['平方根', '开方', 'sqrt', '根号', '开平方'],
  },
  {
    name: 'RAND',
    nameZh: '随机数',
    category: 'math',
    difficulty: 'easy',
    popularity: 6,
    description: '返回0到1之间的随机数。每次计算工作表时都会更新。',
    syntax: 'RAND()',
    parameters: [],
    examples: [
      {
        formula: '=RAND()',
        description: '生成0-1之间的随机数',
        expectedResult: '（如 0.547...）',
      },
      {
        formula: '=INT(RAND()*100)+1',
        description: '生成1-100之间的随机整数',
        expectedResult: '（1-100的整数）',
      },
    ],
    tips: [
      '生成n-m范围的随机数：=RAND()*(m-n)+n',
      '生成随机整数建议使用 RANDBETWEEN',
    ],
    warnings: [
      '每次重新计算都会变化',
    ],
    relatedFunctions: ['RANDBETWEEN'],
    keywords: ['随机', '随机数', 'rand', '抽奖', '随机生成'],
  },
  {
    name: 'RANDBETWEEN',
    nameZh: '范围随机',
    category: 'math',
    difficulty: 'easy',
    popularity: 7,
    description: '返回指定范围内的随机整数。',
    syntax: 'RANDBETWEEN(最小值, 最大值)',
    parameters: [
      { name: 'bottom', nameZh: '最小值', required: true, type: 'number', description: '范围的下限' },
      { name: 'top', nameZh: '最大值', required: true, type: 'number', description: '范围的上限' },
    ],
    examples: [
      {
        formula: '=RANDBETWEEN(1, 100)',
        description: '生成1到100之间的随机整数',
        expectedResult: '（1-100的整数）',
      },
      {
        formula: '=RANDBETWEEN(1, 6)',
        description: '模拟掷骰子',
        expectedResult: '（1-6的整数）',
      },
    ],
    tips: [
      '包含最小值和最大值',
      '比 RAND() 更方便生成整数',
    ],
    warnings: [
      '每次重新计算都会变化',
    ],
    relatedFunctions: ['RAND'],
    keywords: ['随机整数', '范围随机', 'randbetween', '骰子', '抽签'],
  },
];
