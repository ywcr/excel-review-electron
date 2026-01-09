/**
 * 场景化案例库 - HR人事场景
 */
import { Scenario } from './types';

export const HR_SCENARIOS: Scenario[] = [
  {
    id: 'hr-employee-lookup',
    title: '员工信息查询',
    description: '根据员工工号快速查找对应的姓名、部门、联系方式等信息',
    category: 'lookup',
    difficulty: 'beginner',
    tags: ['hr'],
    
    businessContext: `
      你是一名HR专员，公司有500多名员工。每天需要根据员工工号查询各种信息，
      比如当员工来咨询社保问题时，需要快速找到他的部门和入职日期。
      手动在表格中搜索太慢了，需要用公式实现秒查。
    `,
    
    learningGoals: [
      '掌握VLOOKUP函数的基本用法',
      '理解精确匹配和模糊匹配的区别',
      '学会处理查找不到的情况'
    ],
    
    functions: ['VLOOKUP', 'IFERROR'],
    
    sampleData: {
      headers: ['工号', '姓名', '部门', '入职日期', '联系电话'],
      rows: [
        ['E001', '张三', '销售部', '2020-03-15', '13800001111'],
        ['E002', '李四', '技术部', '2019-07-20', '13800002222'],
        ['E003', '王五', '财务部', '2021-01-10', '13800003333'],
        ['E004', '赵六', '人事部', '2018-05-08', '13800004444'],
        ['E005', '钱七', '销售部', '2022-09-01', '13800005555'],
      ]
    },
    
    steps: [
      {
        title: '确定查找目标',
        description: '我们要根据工号（如 E003）查找员工的姓名',
        hint: '工号在A列，姓名在B列'
      },
      {
        title: '使用VLOOKUP函数',
        description: '在目标单元格输入公式',
        formula: '=VLOOKUP("E003", A:E, 2, FALSE)',
        expectedResult: '王五',
        hint: '第3个参数是返回第几列，姓名在第2列'
      },
      {
        title: '查询部门信息',
        description: '修改列序号可以查询其他信息',
        formula: '=VLOOKUP("E003", A:E, 3, FALSE)',
        expectedResult: '财务部',
        hint: '部门在第3列，所以参数改为3'
      },
      {
        title: '处理查找失败',
        description: '如果工号不存在，VLOOKUP会返回#N/A错误，用IFERROR处理',
        formula: '=IFERROR(VLOOKUP("E999", A:E, 2, FALSE), "未找到该员工")',
        expectedResult: '未找到该员工'
      }
    ],
    
    solution: {
      formula: '=IFERROR(VLOOKUP(G2, A:E, 2, FALSE), "未找到")',
      explanation: `
        1. G2 是输入工号的单元格
        2. A:E 是员工信息表的范围
        3. 2 表示返回第2列（姓名）
        4. FALSE 表示精确匹配
        5. IFERROR 处理查找失败的情况
      `
    },
    
    exercises: [
      {
        question: '如何同时显示姓名和部门？',
        answer: '=VLOOKUP(G2,A:E,2,FALSE)&" - "&VLOOKUP(G2,A:E,3,FALSE)'
      },
      {
        question: '如何根据姓名反向查找工号？',
        answer: '使用INDEX+MATCH: =INDEX(A:A,MATCH("王五",B:B,0))'
      }
    ]
  },
  
  {
    id: 'hr-attendance-stats',
    title: '考勤统计分析',
    description: '统计员工的出勤天数、迟到次数、请假天数等考勤数据',
    category: 'statistics',
    difficulty: 'intermediate',
    tags: ['hr', 'reporting'],
    
    businessContext: `
      月底需要统计各部门的考勤情况，包括：
      - 每个部门的总出勤人次
      - 迟到次数超过3次的员工名单
      - 各类型假期的使用情况
    `,
    
    learningGoals: [
      '掌握COUNTIF/COUNTIFS条件计数',
      '掌握SUMIF/SUMIFS条件求和',
      '学会多条件统计'
    ],
    
    functions: ['COUNTIF', 'COUNTIFS', 'SUMIF', 'SUMIFS'],
    
    sampleData: {
      headers: ['日期', '工号', '姓名', '部门', '状态', '迟到(分钟)'],
      rows: [
        ['2024-01-02', 'E001', '张三', '销售部', '正常', 0],
        ['2024-01-02', 'E002', '李四', '技术部', '迟到', 15],
        ['2024-01-02', 'E003', '王五', '财务部', '请假', 0],
        ['2024-01-03', 'E001', '张三', '销售部', '迟到', 30],
        ['2024-01-03', 'E002', '李四', '技术部', '正常', 0],
        ['2024-01-03', 'E003', '王五', '财务部', '正常', 0],
      ]
    },
    
    steps: [
      {
        title: '统计销售部出勤次数',
        description: '使用COUNTIF统计单一条件',
        formula: '=COUNTIF(D:D, "销售部")',
        expectedResult: '2',
        hint: 'COUNTIF(范围, 条件)'
      },
      {
        title: '统计销售部迟到次数',
        description: '使用COUNTIFS统计多条件',
        formula: '=COUNTIFS(D:D, "销售部", E:E, "迟到")',
        expectedResult: '1',
        hint: 'COUNTIFS(范围1, 条件1, 范围2, 条件2)'
      },
      {
        title: '统计总迟到时长',
        description: '使用SUMIF对迟到分钟求和',
        formula: '=SUMIF(E:E, "迟到", F:F)',
        expectedResult: '45',
        hint: 'SUMIF(条件范围, 条件, 求和范围)'
      }
    ],
    
    solution: {
      formula: '=COUNTIFS(D:D, H2, E:E, "迟到")',
      explanation: `
        H2 是部门名称单元格，此公式统计指定部门的迟到次数。
        可以通过下拉复制，快速生成各部门的统计报表。
      `
    }
  },
  
  {
    id: 'hr-tenure-calculation',
    title: '工龄与年假计算',
    description: '根据入职日期自动计算工龄，并按公司政策计算应享年假天数',
    category: 'date',
    difficulty: 'intermediate',
    tags: ['hr'],
    
    businessContext: `
      公司年假政策：
      - 工龄 < 1年：5天
      - 工龄 1-5年：10天
      - 工龄 5-10年：15天
      - 工龄 > 10年：20天
      需要自动计算每位员工的工龄和对应年假。
    `,
    
    learningGoals: [
      '掌握DATEDIF计算日期差',
      '使用IFS处理多条件判断',
      '组合日期函数与逻辑函数'
    ],
    
    functions: ['DATEDIF', 'TODAY', 'IFS', 'YEAR'],
    
    sampleData: {
      headers: ['工号', '姓名', '入职日期'],
      rows: [
        ['E001', '张三', '2020-03-15'],
        ['E002', '李四', '2015-07-20'],
        ['E003', '王五', '2023-11-10'],
        ['E004', '赵六', '2010-05-08'],
      ]
    },
    
    steps: [
      {
        title: '计算工龄（年）',
        description: '使用DATEDIF计算入职至今的完整年数',
        formula: '=DATEDIF(C2, TODAY(), "Y")',
        expectedResult: '根据当前日期计算',
        hint: '"Y"表示完整年数'
      },
      {
        title: '计算年假天数',
        description: '根据工龄判断年假',
        formula: '=IFS(D2<1, 5, D2<5, 10, D2<10, 15, D2>=10, 20)',
        hint: 'IFS可以处理多个条件分支'
      }
    ],
    
    solution: {
      formula: '=IFS(DATEDIF(C2,TODAY(),"Y")<1, 5, DATEDIF(C2,TODAY(),"Y")<5, 10, DATEDIF(C2,TODAY(),"Y")<10, 15, TRUE, 20)',
      explanation: `
        将工龄计算和年假判断合并为一个公式。
        TRUE 作为最后一个条件，相当于"否则"。
      `
    }
  }
];
