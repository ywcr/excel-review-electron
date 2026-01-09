/**
 * Excel 财务函数
 */

import { ExcelFunction } from '../types';

export const FINANCIAL_FUNCTIONS: ExcelFunction[] = [
  {
    name: 'PMT',
    nameZh: '等额还款',
    category: 'math',
    difficulty: 'medium',
    popularity: 8,
    description: '计算贷款的等额月供金额',
    syntax: 'PMT(rate, nper, pv, [fv], [type])',
    parameters: [
      { name: 'rate', nameZh: '利率', required: true, type: 'number', description: '每期利率（年利率/12）' },
      { name: 'nper', nameZh: '期数', required: true, type: 'number', description: '总期数' },
      { name: 'pv', nameZh: '本金', required: true, type: 'number', description: '贷款本金（现值）' },
      { name: 'fv', nameZh: '终值', required: false, type: 'number', description: '期末余额（默认0）' },
      { name: 'type', nameZh: '类型', required: false, type: 'number', description: '0=期末付款，1=期初付款' }
    ],
    examples: [
      { formula: '=PMT(4.5%/12, 30*12, 1000000)', description: '100万贷款，年利率4.5%，30年月供', expectedResult: '-5066.85（负数表示支出）' },
      { formula: '=PMT(5%/12, 36, 200000)', description: '20万车贷，年利率5%，3年月供', expectedResult: '-5996.82' }
    ],
    tips: ['结果为负数表示现金流出（还款）', '年利率要除以12转月利率'],
    warnings: [],
    relatedFunctions: ['FV', 'PV', 'RATE', 'NPER'],
    keywords: ['月供', 'pmt', '贷款', '还款', '房贷']
  },
  {
    name: 'FV',
    nameZh: '终值',
    category: 'math',
    difficulty: 'medium',
    popularity: 7,
    description: '计算定期投资的未来价值',
    syntax: 'FV(rate, nper, pmt, [pv], [type])',
    parameters: [
      { name: 'rate', nameZh: '利率', required: true, type: 'number', description: '每期利率' },
      { name: 'nper', nameZh: '期数', required: true, type: 'number', description: '总期数' },
      { name: 'pmt', nameZh: '定投', required: true, type: 'number', description: '每期投入金额' },
      { name: 'pv', nameZh: '现值', required: false, type: 'number', description: '初始投入（默认0）' },
      { name: 'type', nameZh: '类型', required: false, type: 'number', description: '0=期末，1=期初' }
    ],
    examples: [
      { formula: '=FV(5%/12, 10*12, -1000)', description: '每月定投1000，年化5%，10年后', expectedResult: '155282.28' },
      { formula: '=FV(6%, 5, 0, -100000)', description: '10万一次性投资，年化6%，5年后', expectedResult: '133822.56' }
    ],
    tips: ['投入金额用负数表示（现金流出）', '结果为正数表示未来获得的金额'],
    warnings: [],
    relatedFunctions: ['PV', 'PMT', 'RATE'],
    keywords: ['终值', 'fv', '定投', '理财', '复利']
  },
  {
    name: 'PV',
    nameZh: '现值',
    category: 'math',
    difficulty: 'medium',
    popularity: 6,
    description: '计算未来现金流的现在价值',
    syntax: 'PV(rate, nper, pmt, [fv], [type])',
    parameters: [
      { name: 'rate', nameZh: '利率', required: true, type: 'number', description: '每期折现率' },
      { name: 'nper', nameZh: '期数', required: true, type: 'number', description: '总期数' },
      { name: 'pmt', nameZh: '年金', required: true, type: 'number', description: '每期现金流' },
      { name: 'fv', nameZh: '终值', required: false, type: 'number', description: '期末一次性收入' },
      { name: 'type', nameZh: '类型', required: false, type: 'number', description: '0=期末，1=期初' }
    ],
    examples: [
      { formula: '=PV(5%/12, 5*12, 1000)', description: '每月收入1000，持续5年，年化5%的现值', expectedResult: '-52990.71' },
      { formula: '=PV(6%, 5, 0, 1000000)', description: '5年后收入100万，年化6%的现值', expectedResult: '-747258.17' }
    ],
    tips: ['用于评估投资价值', '结果为负表示需要投入的金额'],
    warnings: [],
    relatedFunctions: ['FV', 'NPV', 'PMT'],
    keywords: ['现值', 'pv', '折现', '投资价值']
  },
  {
    name: 'RATE',
    nameZh: '利率',
    category: 'math',
    difficulty: 'hard',
    popularity: 6,
    description: '计算贷款或投资的利率',
    syntax: 'RATE(nper, pmt, pv, [fv], [type], [guess])',
    parameters: [
      { name: 'nper', nameZh: '期数', required: true, type: 'number', description: '总期数' },
      { name: 'pmt', nameZh: '还款', required: true, type: 'number', description: '每期还款额' },
      { name: 'pv', nameZh: '本金', required: true, type: 'number', description: '贷款本金' },
      { name: 'fv', nameZh: '终值', required: false, type: 'number', description: '期末余额' },
      { name: 'type', nameZh: '类型', required: false, type: 'number', description: '0=期末，1=期初' },
      { name: 'guess', nameZh: '预估', required: false, type: 'number', description: '预估利率' }
    ],
    examples: [
      { formula: '=RATE(36, -6000, 1000000)*12', description: '贷款100万，月供6000，36期，求年利率', expectedResult: '约5.2%年利率' }
    ],
    tips: ['返回每期利率，年化需乘12', 'pmt 用负数表示还款'],
    warnings: [],
    relatedFunctions: ['PMT', 'NPER', 'IRR'],
    keywords: ['利率', 'rate', '年化', '计算利率']
  },
  {
    name: 'NPV',
    nameZh: '净现值',
    category: 'math',
    difficulty: 'hard',
    popularity: 6,
    description: '计算一系列现金流的净现值',
    syntax: 'NPV(rate, value1, [value2], ...)',
    parameters: [
      { name: 'rate', nameZh: '折现率', required: true, type: 'number', description: '每期折现率' },
      { name: 'value1', nameZh: '现金流1', required: true, type: 'number', description: '第一期现金流' },
      { name: 'value2', nameZh: '现金流2', required: false, type: 'number', description: '后续现金流' }
    ],
    examples: [
      { formula: '=NPV(10%, 30000, 40000, 50000) - 100000', description: '投资10万，3年收入3、4、5万，年化10%', expectedResult: '净现值约-2487（项目略亏）' }
    ],
    tips: ['NPV 不包含第0期，初始投资要单独减', '正值表示项目可行'],
    warnings: [],
    relatedFunctions: ['IRR', 'PV'],
    keywords: ['净现值', 'npv', '项目评估', '投资分析']
  },
  {
    name: 'IRR',
    nameZh: '内部收益率',
    category: 'math',
    difficulty: 'hard',
    popularity: 6,
    description: '计算一系列现金流的内部收益率',
    syntax: 'IRR(values, [guess])',
    parameters: [
      { name: 'values', nameZh: '现金流', required: true, type: 'range', description: '现金流数组' },
      { name: 'guess', nameZh: '预估', required: false, type: 'number', description: '预估收益率' }
    ],
    examples: [
      { formula: '=IRR({-100000, 30000, 40000, 60000})', description: '投资-10万，3年回收3、4、6万', expectedResult: '约11.8%年收益率' }
    ],
    tips: ['第一个值通常是负数（投资）', '必须至少有正负值各一个'],
    warnings: ['#NUM! 表示迭代无法收敛'],
    relatedFunctions: ['NPV', 'RATE'],
    keywords: ['内部收益率', 'irr', '收益率', '回报率']
  },
  {
    name: 'NPER',
    nameZh: '期数',
    category: 'math',
    difficulty: 'medium',
    popularity: 6,
    description: '计算达到目标需要的期数',
    syntax: 'NPER(rate, pmt, pv, [fv], [type])',
    parameters: [
      { name: 'rate', nameZh: '利率', required: true, type: 'number', description: '每期利率' },
      { name: 'pmt', nameZh: '还款', required: true, type: 'number', description: '每期还款/投入' },
      { name: 'pv', nameZh: '现值', required: true, type: 'number', description: '贷款本金' },
      { name: 'fv', nameZh: '终值', required: false, type: 'number', description: '目标金额' },
      { name: 'type', nameZh: '类型', required: false, type: 'number', description: '0=期末，1=期初' }
    ],
    examples: [
      { formula: '=NPER(5%/12, -5000, 500000)', description: '贷款50万，月供5000，年利率5%', expectedResult: '约125个月' },
      { formula: '=NPER(4%/12, -1000, 0, 100000)', description: '每月存1000，年化4%，存到10万', expectedResult: '约89个月' }
    ],
    tips: ['pmt 为负数表示支出', '结果可能是小数，需要向上取整'],
    warnings: [],
    relatedFunctions: ['PMT', 'RATE', 'FV'],
    keywords: ['期数', 'nper', '需要多久', '还多少期']
  }
];
