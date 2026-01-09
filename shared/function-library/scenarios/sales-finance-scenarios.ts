/**
 * 场景化案例库 - 销售与财务场景
 */
import { Scenario } from './types';

export const SALES_FINANCE_SCENARIOS: Scenario[] = [
  {
    id: 'sales-commission-calc',
    title: '销售提成计算',
    description: '根据销售额阶梯计算销售人员的提成金额',
    category: 'logic',
    difficulty: 'intermediate',
    tags: ['sales', 'finance'],
    
    businessContext: `
      公司销售提成政策（阶梯式）：
      - 销售额 ≤ 10万：提成 3%
      - 销售额 10-30万：提成 5%
      - 销售额 30-50万：提成 8%
      - 销售额 > 50万：提成 10%
      注意：这是阶梯计算，不是一刀切！
    `,
    
    learningGoals: [
      '理解阶梯计算与一刀切的区别',
      '使用嵌套IF或IFS处理多条件',
      '掌握复杂业务逻辑的公式化'
    ],
    
    functions: ['IF', 'IFS', 'MIN', 'MAX'],
    
    sampleData: {
      headers: ['销售员', '月销售额'],
      rows: [
        ['张三', 80000],
        ['李四', 150000],
        ['王五', 350000],
        ['赵六', 600000],
      ]
    },
    
    steps: [
      {
        title: '理解阶梯式计算',
        description: '以35万为例：前10万按3%，10-30万按5%，30-35万按8%',
        hint: '不是全部按8%算！'
      },
      {
        title: '计算各阶梯金额',
        description: '分段计算后求和',
        formula: '=MIN(B2,100000)*0.03 + MAX(MIN(B2,300000)-100000,0)*0.05 + MAX(MIN(B2,500000)-300000,0)*0.08 + MAX(B2-500000,0)*0.1',
        hint: 'MIN和MAX用于限制每段的上下限'
      }
    ],
    
    solution: {
      formula: '=MIN(B2,100000)*0.03+MAX(MIN(B2,300000)-100000,0)*0.05+MAX(MIN(B2,500000)-300000,0)*0.08+MAX(B2-500000,0)*0.1',
      explanation: `
        阶梯计算公式解析：
        - 第1段：取销售额与10万的较小值 × 3%
        - 第2段：取销售额与30万较小值，减去10万，与0取大 × 5%
        - 第3段：取销售额与50万较小值，减去30万，与0取大 × 8%
        - 第4段：销售额超过50万的部分 × 10%
      `
    },
    
    exercises: [
      {
        question: '如果是一刀切（全部按最高档），公式怎么写？',
        answer: '=B2*IFS(B2<=100000,0.03, B2<=300000,0.05, B2<=500000,0.08, TRUE,0.1)'
      }
    ]
  },
  
  {
    id: 'finance-invoice-match',
    title: '发票与订单匹配',
    description: '批量核对发票信息与订单信息是否一致',
    category: 'lookup',
    difficulty: 'advanced',
    tags: ['finance'],
    
    businessContext: `
      财务月结时需要核对：
      1. 每张发票是否都有对应订单
      2. 发票金额与订单金额是否一致
      3. 找出异常记录
    `,
    
    learningGoals: [
      '使用VLOOKUP进行跨表匹配',
      '使用IFERROR处理匹配失败',
      '组合多个函数判断数据一致性'
    ],
    
    functions: ['VLOOKUP', 'IFERROR', 'IF', 'ABS'],
    
    sampleData: {
      headers: ['发票号', '订单号', '发票金额'],
      rows: [
        ['INV001', 'ORD001', 15000],
        ['INV002', 'ORD002', 8500],
        ['INV003', 'ORD003', 23000],
        ['INV004', 'ORD999', 5000],
      ]
    },
    
    steps: [
      {
        title: '查找订单金额',
        description: '根据订单号从订单表查找金额',
        formula: '=VLOOKUP(B2, 订单表!A:C, 3, FALSE)',
        hint: '假设订单表的金额在第3列'
      },
      {
        title: '比对金额差异',
        description: '计算发票金额与订单金额的差',
        formula: '=C2 - VLOOKUP(B2, 订单表!A:C, 3, FALSE)',
        hint: '正数表示发票多开，负数表示少开'
      },
      {
        title: '标记异常',
        description: '综合判断是否异常',
        formula: '=IF(ISNA(VLOOKUP(B2,订单表!A:C,1,FALSE)),"订单不存在",IF(ABS(C2-VLOOKUP(B2,订单表!A:C,3,FALSE))>0.01,"金额不符","正常"))'
      }
    ],
    
    solution: {
      formula: '=IFERROR(IF(ABS(C2-VLOOKUP(B2,订单表!A:C,3,FALSE))>0.01,"金额不符","✓"), "订单不存在")',
      explanation: `
        1. 首先用VLOOKUP查找订单金额
        2. 用ABS计算绝对差值（避免正负影响）
        3. 差值>0.01则标记"金额不符"，否则显示✓
        4. IFERROR处理订单不存在的情况
      `
    }
  },
  
  {
    id: 'sales-growth-analysis',
    title: '销售增长率分析',
    description: '计算同比、环比增长率，并用条件格式标记异常',
    category: 'math',
    difficulty: 'beginner',
    tags: ['sales', 'analysis'],
    
    businessContext: `
      分析月度销售数据：
      - 计算环比增长率（与上月相比）
      - 计算同比增长率（与去年同月相比）
      - 识别增长异常的月份
    `,
    
    learningGoals: [
      '掌握增长率计算公式',
      '处理除零错误',
      '使用ROUND控制小数位'
    ],
    
    functions: ['ROUND', 'IFERROR', 'IF'],
    
    sampleData: {
      headers: ['月份', '2023年销售额', '2024年销售额'],
      rows: [
        ['1月', 120000, 150000],
        ['2月', 0, 80000],
        ['3月', 180000, 200000],
        ['4月', 150000, 140000],
      ]
    },
    
    steps: [
      {
        title: '计算同比增长率',
        description: '(今年-去年)/去年',
        formula: '=ROUND((C2-B2)/B2, 4)',
        expectedResult: '0.25 (即25%)',
        hint: '乘100可转换为百分比显示'
      },
      {
        title: '处理去年为0的情况',
        description: '避免除零错误',
        formula: '=IFERROR(ROUND((C2-B2)/B2, 4), "N/A")',
        hint: '或用IF(B2=0, "N/A", ...)'
      },
      {
        title: '标记下降的月份',
        description: '增长率为负时标红',
        formula: '=IF((C2-B2)/B2<0, "↓下降", "↑增长")'
      }
    ],
    
    solution: {
      formula: '=IFERROR(TEXT((C2-B2)/B2, "0.00%"), "无去年数据")',
      explanation: `
        使用TEXT函数直接格式化为百分比，避免手动乘100。
        IFERROR处理分母为0的情况。
      `
    }
  }
];
