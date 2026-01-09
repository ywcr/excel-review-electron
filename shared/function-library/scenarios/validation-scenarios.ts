/**
 * 验证类场景案例
 * 基于现有 Excel 验证能力，教用户如何用公式实现数据验证
 */

import { Scenario } from './types';

export const VALIDATION_SCENARIOS: Scenario[] = [
  // ========== 必填项验证 ==========
  {
    id: 'validation-required-check',
    title: '批量检查必填项完整性',
    description: '检测表格中哪些必填字段为空，生成完整度报告。',
    category: 'logic',
    difficulty: 'beginner',
    tags: ['data-cleaning', 'reporting'],
    businessContext: '在提交数据前，需要确保所有必填字段都已填写。手动逐条检查效率低，容易遗漏。',
    learningGoals: ['使用 ISBLANK 判断空值', '使用 COUNTBLANK 统计空单元格', '结合 IF 返回检查结果'],
    functions: ['ISBLANK', 'COUNTBLANK', 'IF'],
    sampleData: {
      headers: ['姓名', '电话', '邮箱', '地址', '检查结果'],
      rows: [
        ['张三', '138xxx', '', '', '2项未填'],
        ['李四', '139xxx', 'a@b.com', '北京', '完整'],
        ['', '137xxx', 'c@d.com', '上海', '1项未填']
      ]
    },
    steps: [
      { title: '判断单个单元格', description: '使用 ISBLANK(A2) 判断是否为空', formula: '=ISBLANK(A2)', expectedResult: 'TRUE 或 FALSE' },
      { title: '统计空单元格数量', description: '使用 COUNTBLANK(A2:D2) 统计一行中的空值数', formula: '=COUNTBLANK(A2:D2)', expectedResult: '空单元格数量' },
      { title: '生成检查报告', description: '根据空值数量返回不同提示', formula: '=IF(COUNTBLANK(A2:D2)>0, COUNTBLANK(A2:D2)&"项未填", "完整")' }
    ],
    solution: {
      formula: '=IF(COUNTBLANK(A2:D2)>0, COUNTBLANK(A2:D2)&"项未填", "完整")',
      explanation: 'COUNTBLANK 统计指定范围内的空单元格数量，如果大于0则显示未填项数，否则显示"完整"。'
    },
    exercises: [
      { question: '如何只检查姓名和电话两个字段？', answer: '=IF(COUNTBLANK(A2:B2)>0, "必填项缺失", "OK")' }
    ]
  },

  // ========== 重复检测 ==========
  {
    id: 'validation-duplicate-detect',
    title: '检测重复数据并标记',
    description: '找出表格中的重复值，支持单列和多条件组合检测。',
    category: 'statistics',
    difficulty: 'beginner',
    tags: ['data-cleaning', 'analysis'],
    businessContext: '数据录入时可能出现重复记录，需要快速识别并处理重复项。',
    learningGoals: ['使用 COUNTIF 统计出现次数', '使用 COUNTIFS 多条件统计', '标记重复数据'],
    functions: ['COUNTIF', 'COUNTIFS', 'IF'],
    sampleData: {
      headers: ['订单号', '客户', '日期', '是否重复'],
      rows: [
        ['ORD001', '客户A', '2024-01-15', ''],
        ['ORD002', '客户B', '2024-01-15', '⚠️ 重复'],
        ['ORD002', '客户B', '2024-01-15', '⚠️ 重复'],
        ['ORD003', '客户A', '2024-01-16', '']
      ]
    },
    steps: [
      { title: '单列查重', description: '统计订单号出现次数', formula: '=COUNTIF(A:A, A2)', expectedResult: '出现次数' },
      { title: '标记重复', description: '大于1次的标记为重复', formula: '=IF(COUNTIF(A:A, A2)>1, "⚠️ 重复", "")', expectedResult: '重复的行显示标记' },
      { title: '多条件查重', description: '同时匹配订单号+客户+日期', formula: '=IF(COUNTIFS(A:A, A2, B:B, B2, C:C, C2)>1, "⚠️ 重复", "")' }
    ],
    solution: {
      formula: '=IF(COUNTIF(A:A, A2)>1, "⚠️ 重复", "")',
      explanation: 'COUNTIF 统计该值在整列中出现的次数，大于1表示有重复。COUNTIFS 可用于多条件组合判断。'
    }
  },

  // ========== 日期时间验证 ==========
  {
    id: 'validation-time-range',
    title: '验证时间是否在工作时间范围',
    description: '检查拜访时间是否在08:00-19:00的工作时间范围内。',
    category: 'date',
    difficulty: 'intermediate',
    tags: ['reporting', 'analysis'],
    businessContext: '业务拜访需要在规定的工作时间内进行，超出时间范围的记录需要标记审核。',
    learningGoals: ['使用 HOUR 提取小时', '使用 AND 组合多个条件', '时间范围判断'],
    functions: ['HOUR', 'AND', 'IF'],
    sampleData: {
      headers: ['拜访时间', '检查结果'],
      rows: [
        ['2024-01-15 09:30', '✓ 正常'],
        ['2024-01-15 20:00', '❌ 超时'],
        ['2024-01-15 07:30', '❌ 过早']
      ]
    },
    steps: [
      { title: '提取小时', description: '从时间中提取小时部分', formula: '=HOUR(A2)', expectedResult: '小时数(0-23)' },
      { title: '判断范围', description: '检查是否在8-19之间', formula: '=AND(HOUR(A2)>=8, HOUR(A2)<19)', expectedResult: 'TRUE 或 FALSE' },
      { title: '生成结果', description: '根据判断返回提示', formula: '=IF(AND(HOUR(A2)>=8, HOUR(A2)<19), "✓ 正常", "❌ 超时")' }
    ],
    solution: {
      formula: '=IF(AND(HOUR(A2)>=8, HOUR(A2)<19), "✓ 正常", "❌ 超时")',
      explanation: 'HOUR 提取时间的小时部分，AND 组合两个条件判断是否在工作时间范围内。'
    }
  },
  {
    id: 'validation-date-interval',
    title: '检查日期间隔是否符合规则',
    description: '验证同一客户的拜访间隔是否满足最小天数要求。',
    category: 'date',
    difficulty: 'advanced',
    tags: ['reporting', 'analysis'],
    businessContext: '为避免过度拜访，规定同一客户7天内不能重复拜访。需要自动检测违规记录。',
    learningGoals: ['使用 MAXIFS 找到上次日期', '计算日期间隔', '条件判断'],
    functions: ['MAXIFS', 'IF', 'DATEDIF'],
    sampleData: {
      headers: ['拜访日期', '客户名', '距上次天数', '检查结果'],
      rows: [
        ['2024-01-01', '客户A', '-', ''],
        ['2024-01-05', '客户A', '4', '⚠️ 间隔不足'],
        ['2024-01-10', '客户A', '5', '⚠️ 间隔不足'],
        ['2024-01-18', '客户A', '8', '']
      ]
    },
    steps: [
      { title: '找上次日期', description: '使用 MAXIFS 找同一客户的上次拜访日期', formula: '=MAXIFS(A$2:A$100, B$2:B$100, B2, A$2:A$100, "<"&A2)', expectedResult: '上次拜访日期' },
      { title: '计算间隔', description: '当前日期减去上次日期', formula: '=A2-MAXIFS(A$2:A$100, B$2:B$100, B2, A$2:A$100, "<"&A2)', expectedResult: '间隔天数' },
      { title: '判断是否违规', description: '间隔小于7天标记警告', formula: '=IF(A2-MAXIFS(...)<7, "⚠️ 间隔不足", "")' }
    ],
    solution: {
      formula: '=IF(A2-MAXIFS(A$2:A$100, B$2:B$100, B2, A$2:A$100, "<"&A2)<7, "⚠️ 间隔不足", "")',
      explanation: 'MAXIFS 找到同一客户（B列匹配）且日期小于当前行的最大日期（即上次拜访），然后计算与当前日期的差值。'
    }
  },

  // ========== 禁用词检测 ==========
  {
    id: 'validation-prohibited-words',
    title: '检测文本中的禁用词汇',
    description: '检查反馈内容是否包含"回扣""返利""佣金"等敏感词汇。',
    category: 'text',
    difficulty: 'intermediate',
    tags: ['data-cleaning', 'reporting'],
    businessContext: '业务反馈中不能出现涉及商业贿赂的敏感词汇，需要自动检测并标记。',
    learningGoals: ['使用 SEARCH 查找文本', '使用 ISNUMBER 判断是否找到', '使用 OR 检测多个词'],
    functions: ['SEARCH', 'ISNUMBER', 'OR', 'IF'],
    sampleData: {
      headers: ['反馈内容', '检查结果'],
      rows: [
        ['产品效果良好，客户满意', ''],
        ['讨论了回扣事宜', '⚠️ 含禁用词'],
        ['协商返利比例', '⚠️ 含禁用词'],
        ['正常业务沟通', '']
      ]
    },
    steps: [
      { title: '查找单个词', description: '使用 SEARCH 查找"回扣"的位置', formula: '=SEARCH("回扣", A2)', expectedResult: '位置数字或#VALUE!' },
      { title: '判断是否找到', description: '用 ISNUMBER 判断是否返回了数字', formula: '=ISNUMBER(SEARCH("回扣", A2))', expectedResult: 'TRUE 或 FALSE' },
      { title: '多词检测', description: '用 OR 组合多个词的检测', formula: '=IF(OR(ISNUMBER(SEARCH("回扣",A2)), ISNUMBER(SEARCH("返利",A2)), ISNUMBER(SEARCH("佣金",A2))), "⚠️ 含禁用词", "")' }
    ],
    solution: {
      formula: '=IF(OR(ISNUMBER(SEARCH("回扣",A2)), ISNUMBER(SEARCH("返利",A2)), ISNUMBER(SEARCH("佣金",A2))), "⚠️ 含禁用词", "")',
      explanation: 'SEARCH 查找文本位置，找到返回数字，找不到返回错误。ISNUMBER 判断是否为数字（即是否找到），OR 组合多个条件。'
    }
  },

  // ========== 跨表验证 ==========
  {
    id: 'validation-cross-table',
    title: '跨表验证数据一致性',
    description: '检查当前表的客户ID是否存在于主数据表中。',
    category: 'lookup',
    difficulty: 'intermediate',
    tags: ['data-cleaning', 'reporting'],
    businessContext: '录入数据时引用的客户ID必须在主数据表中存在，防止无效引用。',
    learningGoals: ['使用 VLOOKUP 跨表查找', '使用 ISNA 判断是否找到', '处理 #N/A 错误'],
    functions: ['VLOOKUP', 'ISNA', 'IF', 'IFERROR'],
    sampleData: {
      headers: ['客户ID', '订单金额', '检查结果'],
      rows: [
        ['C001', '5000', '✓ 存在'],
        ['C999', '3000', '❌ 不存在'],
        ['C002', '8000', '✓ 存在']
      ]
    },
    steps: [
      { title: '跨表查找', description: '在主数据表中查找客户ID', formula: '=VLOOKUP(A2, 主数据!A:A, 1, FALSE)', expectedResult: '找到返回ID，否则#N/A' },
      { title: '判断是否存在', description: '用 ISNA 判断是否返回了 #N/A', formula: '=ISNA(VLOOKUP(A2, 主数据!A:A, 1, FALSE))', expectedResult: 'TRUE=不存在, FALSE=存在' },
      { title: '生成结果', description: '根据判断返回提示', formula: '=IF(ISNA(VLOOKUP(A2, 主数据!A:A, 1, FALSE)), "❌ 不存在", "✓ 存在")' }
    ],
    solution: {
      formula: '=IF(ISNA(VLOOKUP(A2, 主数据!A:A, 1, FALSE)), "❌ 不存在", "✓ 存在")',
      explanation: 'VLOOKUP 在主数据表的A列查找当前行的客户ID，找不到返回 #N/A。ISNA 判断是否为 #N/A 错误。'
    }
  }
];
