/**
 * 场景化案例库 - 数据处理与清洗场景
 */
import { Scenario } from './types';

export const DATA_PROCESSING_SCENARIOS: Scenario[] = [
  {
    id: 'data-phone-format',
    title: '手机号格式清洗',
    description: '将各种格式的手机号统一为标准11位格式',
    category: 'text',
    difficulty: 'beginner',
    tags: ['data-cleaning'],
    
    businessContext: `
      从不同渠道收集的客户手机号格式混乱：
      - 有的带区号：+86 13812345678
      - 有的有空格：138 1234 5678
      - 有的带横线：138-1234-5678
      需要统一清洗为纯11位数字格式。
    `,
    
    learningGoals: [
      '使用SUBSTITUTE删除指定字符',
      '使用TRIM去除首尾空格',
      '使用RIGHT/LEFT提取指定位数'
    ],
    
    functions: ['SUBSTITUTE', 'TRIM', 'RIGHT', 'LEN'],
    
    sampleData: {
      headers: ['原始手机号'],
      rows: [
        ['+86 13812345678'],
        ['138 1234 5678'],
        ['138-1234-5678'],
        ['86-13912345678'],
        ['13612345678'],
      ]
    },
    
    steps: [
      {
        title: '去除空格',
        description: '使用SUBSTITUTE将空格替换为空',
        formula: '=SUBSTITUTE(A2, " ", "")',
        expectedResult: '+8613812345678'
      },
      {
        title: '去除横线',
        description: '嵌套SUBSTITUTE处理多种字符',
        formula: '=SUBSTITUTE(SUBSTITUTE(A2, " ", ""), "-", "")',
        expectedResult: '+8613812345678'
      },
      {
        title: '提取后11位',
        description: '使用RIGHT取最后11位数字',
        formula: '=RIGHT(SUBSTITUTE(SUBSTITUTE(A2, " ", ""), "-", ""), 11)',
        expectedResult: '13812345678'
      }
    ],
    
    solution: {
      formula: '=RIGHT(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(A2," ",""),"-",""),"+86",""),11)',
      explanation: `
        清洗步骤：
        1. 去除空格
        2. 去除横线
        3. 去除+86前缀
        4. 取最右边11位
      `
    },
    
    exercises: [
      {
        question: '如何验证清洗后的手机号是否为11位？',
        answer: '=IF(LEN(清洗后的手机号)=11, "✓", "位数不对")'
      }
    ]
  },
  
  {
    id: 'data-name-split',
    title: '姓名拆分为姓和名',
    description: '将中文姓名拆分为姓氏和名字两列',
    category: 'text',
    difficulty: 'intermediate',
    tags: ['data-cleaning'],
    
    businessContext: `
      系统导出的客户姓名在一个单元格中，现在需要：
      - 拆分出姓氏（用于称呼，如"张先生"）
      - 拆分出名字
      - 处理复姓情况（欧阳、司马等）
    `,
    
    learningGoals: [
      '使用LEFT/RIGHT/MID提取文本',
      '使用LEN计算文本长度',
      '处理特殊情况（复姓）'
    ],
    
    functions: ['LEFT', 'RIGHT', 'MID', 'LEN', 'IF', 'OR'],
    
    sampleData: {
      headers: ['姓名'],
      rows: [
        ['张三'],
        ['李四'],
        ['欧阳明'],
        ['司马懿'],
        ['王小明'],
      ]
    },
    
    steps: [
      {
        title: '提取单姓',
        description: '大部分中国姓氏是单字',
        formula: '=LEFT(A2, 1)',
        expectedResult: '张'
      },
      {
        title: '提取名字（单姓情况）',
        description: '姓名去掉第一个字',
        formula: '=RIGHT(A2, LEN(A2)-1)',
        expectedResult: '三'
      },
      {
        title: '处理复姓',
        description: '判断是否为常见复姓',
        formula: '=IF(OR(LEFT(A2,2)="欧阳",LEFT(A2,2)="司马",LEFT(A2,2)="上官"), LEFT(A2,2), LEFT(A2,1))',
        hint: '可添加更多复姓'
      }
    ],
    
    solution: {
      formula: '=IF(OR(LEFT(A2,2)="欧阳",LEFT(A2,2)="司马",LEFT(A2,2)="上官",LEFT(A2,2)="诸葛"), LEFT(A2,2), LEFT(A2,1))',
      explanation: `
        使用OR函数列出所有复姓，匹配则取前2字，否则取前1字。
        名字则用 RIGHT(A2, LEN(A2)-LEN(姓氏列)) 计算。
      `
    }
  },
  
  {
    id: 'data-date-extract',
    title: '从文本中提取日期',
    description: '从订单号或文件名中提取日期信息',
    category: 'text',
    difficulty: 'intermediate',
    tags: ['data-cleaning'],
    
    businessContext: `
      系统生成的订单号包含日期信息：
      - ORD20240115001 → 2024年1月15日
      - 需要提取出日期用于统计分析
    `,
    
    learningGoals: [
      '使用MID从中间提取文本',
      '使用DATE构造日期',
      '文本转数字的技巧'
    ],
    
    functions: ['MID', 'LEFT', 'RIGHT', 'DATE', 'VALUE'],
    
    sampleData: {
      headers: ['订单号'],
      rows: [
        ['ORD20240115001'],
        ['ORD20240203002'],
        ['ORD20231225003'],
      ]
    },
    
    steps: [
      {
        title: '提取年份',
        description: '从第4位开始取4个字符',
        formula: '=MID(A2, 4, 4)',
        expectedResult: '2024'
      },
      {
        title: '提取月份',
        description: '从第8位开始取2个字符',
        formula: '=MID(A2, 8, 2)',
        expectedResult: '01'
      },
      {
        title: '提取日期',
        description: '从第10位开始取2个字符',
        formula: '=MID(A2, 10, 2)',
        expectedResult: '15'
      },
      {
        title: '组装为日期',
        description: '使用DATE函数组合',
        formula: '=DATE(MID(A2,4,4), MID(A2,8,2), MID(A2,10,2))',
        expectedResult: '2024/1/15'
      }
    ],
    
    solution: {
      formula: '=DATE(MID(A2,4,4), MID(A2,8,2), MID(A2,10,2))',
      explanation: `
        DATE(年, 月, 日) 可以将三个数值组合成日期。
        MID函数的文本会自动转为数字。
      `
    }
  },
  
  {
    id: 'data-duplicate-check',
    title: '重复数据检测',
    description: '找出表格中的重复记录',
    category: 'statistics',
    difficulty: 'beginner',
    tags: ['data-cleaning'],
    
    businessContext: `
      客户信息可能有重复录入：
      - 需要标记重复的手机号
      - 统计每个手机号出现的次数
    `,
    
    learningGoals: [
      '使用COUNTIF统计出现次数',
      '使用条件格式标记重复',
      '使用UNIQUE去重（Excel 365）'
    ],
    
    functions: ['COUNTIF', 'IF'],
    
    sampleData: {
      headers: ['客户姓名', '手机号'],
      rows: [
        ['张三', '13812345678'],
        ['李四', '13987654321'],
        ['张三三', '13812345678'],
        ['王五', '13600001111'],
        ['赵六', '13987654321'],
      ]
    },
    
    steps: [
      {
        title: '统计出现次数',
        description: '每个手机号出现了几次',
        formula: '=COUNTIF(B:B, B2)',
        expectedResult: '2（如果有重复）'
      },
      {
        title: '标记重复',
        description: '出现超过1次则标记',
        formula: '=IF(COUNTIF(B:B, B2)>1, "重复", "")',
        expectedResult: '重复'
      }
    ],
    
    solution: {
      formula: '=IF(COUNTIF(B$2:B2, B2)>1, "重复", IF(COUNTIF(B:B, B2)>1, "首次", "唯一"))',
      explanation: `
        进阶版：区分"首次出现"和"后续重复"。
        B$2:B2 是动态范围，只统计当前行及以上。
      `
    }
  }
];
