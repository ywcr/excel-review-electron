// 前端验证规则定义
export interface ValidationRule {
  field: string;
  type:
    | "required"
    | "unique"
    | "timeRange"
    | "duration"
    | "frequency"
    | "dateInterval"
    | "dateFormat"
    | "minValue"
    | "medicalLevel"
    | "sixMonthsInterval"
    | "crossTaskValidation"
    | "prohibitedContent"
    | "sameImplementer"; // 同一目标需由同一人拜访
  params?: any;
  message: string;
}

export interface TaskTemplate {
  name: string;
  description: string;
  requiredFields: string[];
  sheetNames: string[]; // 可能的工作表名称
  matchKeywords?: string[]; // 模糊匹配关键字（工作表名必须包含其中之一）
  fieldMappings: Record<string, string>; // Excel列名 -> 标准字段名映射
  validationRules: ValidationRule[];
}

// 公共禁用词列表 - 用于所有拜访任务的内容验证
export const COMMON_PROHIBITED_TERMS = [
  "统方",
  "买票",
  "购票",
  "销票",
  "捐赠",
  "资助",
  "赞助",
  "行贿",
  "受贿",
  "返利",
  "返佣",
  "临床观察费",
  "好处费",
  "手续费",
  "回款",
  "费用",
  "佣金",
  "提成",
  "红利",
  "红包",
  "礼品",
  "礼金",
  "消费卡",
  "有价证券",
  "股权",
  "商业贿赂",
  "宴请",
  "娱乐",
  "信息费",
  "感谢费",
  "提单费",
  "返现",
  "票折",
  "指标",
  "回扣",
  "销量",
  "销售",
  "logo",
] as const;

// 内嵌的任务模板规则（从后端模板转换而来）
export const TASK_TEMPLATES: Record<string, TaskTemplate> = {
  药店拜访: {
    name: "药店拜访",
    description: "药店拜访任务验证",
    requiredFields: ["实施人", "零售渠道", "拜访开始时间", "拜访时长"],
    sheetNames: ["药店拜访"],
    matchKeywords: ["药店"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      "实施\n人": "implementer",
      对接人: "contactPerson",
      零售渠道: "retailChannel",
      渠道地址: "channelAddress",
      拜访开始时间: "visitStartTime",
      "拜访开始\n时间": "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "拜访事项\n（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "拜访事\n项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      门头: "storefront",
      内部: "interior",
    },
    validationRules: [
      {
        field: "retailChannel",
        type: "required",
        message: "零售渠道不能为空",
      },
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "visitStartTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "拜访开始时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "retailChannel",
        type: "unique",
        params: { scope: "day", groupBy: "retailChannel" },
        message: "同一药店1日内不能重复拜访",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 7, groupBy: "contactPerson" },
        message: "同一对接人7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 5,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访不超过5家药店",
      },
      {
        field: "retailChannel",
        type: "sameImplementer",
        params: {
          targetField: "retailChannel", // 目标字段（药店名称）
          implementerField: "implementer", // 实施人字段
          addressField: "channelAddress", // 增加地址字段校验
        },
        message: "同一药店在周期内需由同一人拜访",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 60 },
        message: "拜访有效时间不低于60分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 8, endHour: 19 },
        message: "拜访时间必须在08:00-19:00范围内",
      },
      // 禁用内容验证 - 拜访事项和信息反馈字段
      {
        field: "visitItem1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（1）内容不能包含禁用词汇",
      },
      {
        field: "feedback1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（1）内容不能包含禁用词汇",
      },
      {
        field: "visitItem2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（2）内容不能包含禁用词汇",
      },
      {
        field: "feedback2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（2）内容不能包含禁用词汇",
      },
    ],
  },

  等级医院拜访: {
    name: "等级医院拜访",
    description: "等级医院拜访任务验证",
    requiredFields: [
      "实施人",
      "医生姓名",
      "医疗机构名称",
      "医疗类型",
      "拜访开始时间",
      "拜访时长",
    ],
    sheetNames: ["等级医院拜访"],
    matchKeywords: ["等级"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      医疗类型: "medicalType",
      渠道地址: "channelAddress",
      科室: "department",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      医院门头照: "hospitalPhoto",
      内部照片: "interiorPhoto",
    },
    validationRules: [
      {
        field: "doctorName",
        type: "required",
        message: "医生姓名不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "medicalType",
        type: "medicalLevel",
        params: {
          allowedLevels: ["等级", "基层", "民营"],
          allowedSuffixes: [],
        },
        message: "医疗类型必须选择以下类别之一：等级、基层、民营",
      },
      {
        field: "hospitalName",
        type: "unique",
        params: { scope: "day", groupBy: "hospitalName" },
        message: "同一医院1日内不能重复拜访",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctorName" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 4,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访不超过4家医院",
      },
      {
        field: "hospitalName",
        type: "sameImplementer",
        params: {
          targetField: "hospitalName",
          implementerField: "implementer",
          addressField: "channelAddress",
        },
        message: "同一医院在周期内需由同一人拜访",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "拜访有效时间不低于100分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "拜访时间必须在07:00-19:00范围内",
      },
      // 禁用内容验证 - 拜访事项和信息反馈字段
      {
        field: "visitItem1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（1）内容不能包含禁用词汇",
      },
      {
        field: "feedback1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（1）内容不能包含禁用词汇",
      },
      {
        field: "visitItem2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（2）内容不能包含禁用词汇",
      },
      {
        field: "feedback2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（2）内容不能包含禁用词汇",
      },
    ],
  },

  科室拜访: {
    name: "科室拜访",
    description: "科室拜访任务验证",
    requiredFields: [
      "实施人",
      "医生姓名",
      "医疗机构名称",
      "科室",
      "拜访开始时间",
      "拜访时长",
    ],
    sheetNames: ["科室拜访"],
    matchKeywords: ["科室"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      渠道地址: "channelAddress",
      科室: "departmentName",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      医院门头照: "hospitalPhoto",
      科室照片: "departmentPhoto",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "doctorName",
        type: "required",
        message: "医生姓名不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "departmentName",
        type: "required",
        message: "科室不能为空",
      },
      {
        field: "visitStartTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "拜访开始时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "拜访有效时间不低于100分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "拜访时间必须在07:00-19:00范围内",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 3, groupBy: "hospitalName" },
        message: "同一医院3日内不能重复拜访",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctorName" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 4,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访不超过4家医院",
      },
      {
        field: "hospitalName",
        type: "crossTaskValidation",
        params: {
          scope: "month",
          excludeTasks: ["等级医院拜访", "基层医疗机构拜访", "民营医院拜访"],
          groupBy: "hospitalName",
        },
        message: "当月同一医院不可同时出现在「科室拜访」和「医院级拜访」中",
      },
      // 禁用内容验证 - 拜访事项和信息反馈字段
      {
        field: "visitItem1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（1）内容不能包含禁用词汇",
      },
      {
        field: "feedback1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（1）内容不能包含禁用词汇",
      },
      {
        field: "visitItem2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（2）内容不能包含禁用词汇",
      },
      {
        field: "feedback2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（2）内容不能包含禁用词汇",
      },
    ],
  },

  基层医疗机构拜访: {
    name: "基层医疗机构拜访",
    description: "基层医疗机构拜访任务验证",
    requiredFields: [
      "实施人",
      "医生姓名",
      "医疗机构名称",
      "医疗类型",
      "拜访开始时间",
      "拜访时长",
    ],
    sheetNames: ["基层医疗机构拜访"],
    matchKeywords: ["基层"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      医疗类型: "medicalType",
      渠道地址: "channelAddress",
      科室: "department",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      医院门头照: "hospitalPhoto",
      内部照片: "interiorPhoto",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "doctorName",
        type: "required",
        message: "医生姓名不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "medicalType",
        type: "medicalLevel",
        params: {
          allowedLevels: ["等级", "基层", "民营"],
          allowedSuffixes: [],
        },
        message: "医疗类型必须选择以下类别之一：等级、基层、民营",
      },
      {
        field: "visitStartTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "拜访开始时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "基层医疗机构拜访有效时间不能低于100分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "基层医疗机构拜访时间必须在07:00-19:00范围内",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 2, groupBy: "hospitalName" },
        message: "同一医院2日内不能重复拜访",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctorName" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 4,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访基层医疗机构不能超过4家",
      },
      {
        field: "hospitalName",
        type: "sameImplementer",
        params: {
          targetField: "hospitalName",
          implementerField: "implementer",
          addressField: "channelAddress",
        },
        message: "同一医疗机构在周期内需由同一人拜访",
      },
      // 禁用内容验证 - 拜访事项和信息反馈字段
      {
        field: "visitItem1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（1）内容不能包含禁用词汇",
      },
      {
        field: "feedback1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（1）内容不能包含禁用词汇",
      },
      {
        field: "visitItem2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（2）内容不能包含禁用词汇",
      },
      {
        field: "feedback2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（2）内容不能包含禁用词汇",
      },
    ],
  },

  民营医院拜访: {
    name: "民营医院拜访",
    description: "民营医院拜访任务验证",
    requiredFields: [
      "实施人",
      "医生姓名",
      "医疗机构名称",
      "医疗类型",
      "拜访开始时间",
      "拜访时长",
    ],
    sheetNames: ["民营医院拜访"],
    matchKeywords: ["民营"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      医疗类型: "medicalType",
      渠道地址: "channelAddress",
      科室: "department",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      医院门头照: "hospitalPhoto",
      内部照片: "interiorPhoto",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "doctorName",
        type: "required",
        message: "医生姓名不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "medicalType",
        type: "medicalLevel",
        params: {
          allowedLevels: ["等级", "基层", "民营"],
          allowedSuffixes: [],
        },
        message: "医疗类型必须选择以下类别之一：等级、基层、民营",
      },
      {
        field: "visitStartTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "拜访开始时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "民营医院拜访有效时间不能低于100分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "民营医院拜访时间必须在07:00-19:00范围内",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 2, groupBy: "hospitalName" },
        message: "同一医院2日内不能重复拜访",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctorName" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 4,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访民营医院不能超过4家",
      },
      {
        field: "hospitalName",
        type: "sameImplementer",
        params: {
          targetField: "hospitalName",
          implementerField: "implementer",
          addressField: "channelAddress",
        },
        message: "同一医院在周期内需由同一人拜访",
      },
      // 禁用内容验证 - 拜访事项和信息反馈字段
      {
        field: "visitItem1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（1）内容不能包含禁用词汇",
      },
      {
        field: "feedback1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（1）内容不能包含禁用词汇",
      },
      {
        field: "visitItem2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（2）内容不能包含禁用词汇",
      },
      {
        field: "feedback2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（2）内容不能包含禁用词汇",
      },
    ],
  },

  消费者调研: {
    name: "消费者调研",
    description: "消费者调研任务验证",
    // 模板总汇(消费者问卷数据清单)不包含"药店名称"
    requiredFields: ["实施人", "调查对象姓名", "调研时间"],
    sheetNames: [
      // 优先匹配数据清单类工作表
      "消费者问卷数据清单",
      "消费者调研数据清单",
      // 其次匹配模板与问卷页
      "消费者调研",
      "消费者问卷",
      // 兜底关键词
      "数据清单",
      "消费者数据",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人姓名: "implementer",
      实施人员: "implementer",
      调查员: "implementer",
      访员: "implementer",
      执行人: "implementer",
      调查对象姓名: "surveyTargetName",
      消费者姓名: "surveyTargetName",
      被访者姓名: "surveyTargetName",
      受访者姓名: "surveyTargetName",
      调研对象姓名: "surveyTargetName",
      被调查者姓名: "surveyTargetName",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      药店名: "pharmacyName",
      门店: "pharmacyName",
      门店全称: "pharmacyName",
      药店门店名称: "pharmacyName",
      调研时间: "surveyTime",
      实施时间: "surveyTime",
      调查时间: "surveyTime",
      问卷时间: "surveyTime",
      访问时间: "surveyTime",
      填写时间: "surveyTime",
      提交时间: "surveyTime",
      调研地址: "surveyAddress",
      调查地址: "surveyAddress",
      门店地址: "surveyAddress",
      药店地址: "surveyAddress",
      地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      问卷: "questionnaireContent",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "surveyTargetName",
        type: "required",
        message: "调查对象姓名不能为空",
      },
      {
        field: "pharmacyName",
        type: "required",
        message: "药店名称不能为空",
      },
      {
        field: "surveyTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "调研时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "surveyTargetName",
        type: "unique",
        params: { scope: "global" },
        message: "调查对象姓名永远不能重复",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 50, groupBy: "implementer" },
        message: "同一实施人每日不得超过50份",
      },
    ],
  },

  患者调研: {
    name: "患者调研",
    description: "患者调研任务验证",
    // 模板总汇(患者问卷数据清单)不包含“药店名称”
    requiredFields: ["实施人", "调查对象姓名", "调研时间"],
    sheetNames: [
      // 优先匹配数据清单类工作表
      "患者问卷数据清单",
      "患者调研数据清单",
      // 其次匹配模板与问卷页
      "患者调研",
      "患者问卷",
      // 兜底关键词
      "数据清单",
      "患者数据",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人姓名: "implementer",
      实施人员: "implementer",
      调查员: "implementer",
      访员: "implementer",
      执行人: "implementer",
      调查对象姓名: "surveyTargetName",
      患者姓名: "surveyTargetName",
      被访者姓名: "surveyTargetName",
      受访者姓名: "surveyTargetName",
      调研对象姓名: "surveyTargetName",
      被调查者姓名: "surveyTargetName",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      药店名: "pharmacyName",
      门店: "pharmacyName",
      门店全称: "pharmacyName",
      药店门店名称: "pharmacyName",
      调研时间: "surveyTime",
      实施时间: "surveyTime",
      调查时间: "surveyTime",
      问卷时间: "surveyTime",
      访问时间: "surveyTime",
      填写时间: "surveyTime",
      提交时间: "surveyTime",
      调研地址: "surveyAddress",
      调查地址: "surveyAddress",
      门店地址: "surveyAddress",
      药店地址: "surveyAddress",
      地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      问卷: "questionnaireContent",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "surveyTargetName",
        type: "required",
        message: "调查对象姓名不能为空",
      },
      {
        field: "pharmacyName",
        type: "required",
        message: "药店名称不能为空",
      },
      {
        field: "surveyTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "调研时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "surveyTargetName",
        type: "unique",
        params: { scope: "global" },
        message: "调查对象姓名永远不能重复",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 20, groupBy: "implementer" },
        message: "同一实施人每日不得超过20份",
      },
    ],
  },

  店员调研: {
    name: "店员调研",
    description: "店员调研任务验证",
    // 模板总汇(店员问卷数据清单)包含“药店名称”，表头为“药店名称”与“实施时间”
    requiredFields: ["实施人", "店员姓名", "药店名称", "调研时间"],
    sheetNames: [
      // 优先匹配数据清单类工作表
      "店员问卷数据清单",
      "店员调研数据清单",
      // 其次匹配模板与问卷页
      "店员调研",
      "店员问卷",
      // 兜底关键词
      "数据清单",
      "店员数据",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      调查员: "implementer",
      访员: "implementer",
      执行人: "implementer",
      店员姓名: "employeeName",
      员工姓名: "employeeName",
      导购姓名: "employeeName",
      营业员姓名: "employeeName",
      咨询师姓名: "employeeName",
      员工: "employeeName",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      药店名: "pharmacyName",
      门店: "pharmacyName",
      门店全称: "pharmacyName",
      药店门店名称: "pharmacyName",
      调研时间: "surveyTime",
      调查时间: "surveyTime",
      问卷时间: "surveyTime",
      访问时间: "surveyTime",
      填写时间: "surveyTime",
      提交时间: "surveyTime",
      调研地址: "surveyAddress",
      调查地址: "surveyAddress",
      门店地址: "surveyAddress",
      药店地址: "surveyAddress",
      地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      问卷: "questionnaireContent",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "employeeName",
        type: "required",
        message: "店员姓名不能为空",
      },
      {
        field: "pharmacyName",
        type: "required",
        message: "药店名称不能为空",
      },
      {
        field: "surveyTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "调研时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "employeeName",
        type: "unique",
        params: { scope: "global" },
        message: "店员姓名永远不能重复",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 2,
          groupBy: "implementer",
          countBy: "pharmacyName",
        },
        message: "同一实施人每日拜访不超过2家药店",
      },
      {
        field: "pharmacyName",
        type: "frequency",
        params: { maxPerDay: 5, groupBy: "pharmacyName" },
        message: "每个药店不超过5份",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 10, groupBy: "implementer" },
        message: "同一实施人每日不超过10份",
      },
    ],
  },

  药店调研: {
    name: "药店调研",
    description: "药店调研任务验证",
    requiredFields: ["实施人", "药店名称", "调研时间"],
    sheetNames: [
      // 优先匹配数据清单类工作表
      "药店问卷数据清单",
      "药店调研数据清单",
      // 其次匹配模板与问卷页
      "药店调研",
      "药店问卷",
      // 兜底关键词
      "数据清单",
      "药店数据",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      调查员: "implementer",
      访员: "implementer",
      执行人: "implementer",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      药店名: "pharmacyName",
      门店: "pharmacyName",
      门店全称: "pharmacyName",
      药店门店名称: "pharmacyName",
      调研时间: "surveyTime",
      调查时间: "surveyTime",
      问卷时间: "surveyTime",
      访问时间: "surveyTime",
      填写时间: "surveyTime",
      提交时间: "surveyTime",
      调研地址: "surveyAddress",
      调查地址: "surveyAddress",
      门店地址: "surveyAddress",
      药店地址: "surveyAddress",
      地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      问卷: "questionnaireContent",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "pharmacyName",
        type: "required",
        message: "药店名称不能为空",
      },
      {
        field: "surveyTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "调研时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "pharmacyName",
        type: "unique",
        params: { scope: "task" },
        message: "同一任务下同一药店只能调研1次",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 2,
          groupBy: "implementer",
          countBy: "pharmacyName",
        },
        message: "同一实施人每日拜访不超过2家药店",
      },
    ],
  },

  竞品信息收集: {
    name: "竞品信息收集",
    description: "竞品信息收集任务验证",
    requiredFields: ["实施人", "医疗机构名称", "收集时间"],
    sheetNames: [
      "竞品数据购进收集",
      "竞品信息收集",
      "竞品数据",
      "信息收集",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      医疗机构名称: "hospitalName",
      医院名称: "hospitalName",
      机构名称: "hospitalName",
      收集时间: "collectTime",
      实施时间: "collectTime",
      调研时间: "collectTime",
      竞品名称: "competitorName",
      产品名称: "competitorName",
      品牌名称: "competitorName",
      竞品信息: "competitorInfo",
      信息内容: "competitorInfo",
      收集内容: "competitorInfo",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "collectTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "收集时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "hospitalName",
        type: "sixMonthsInterval",
        params: { groupBy: "hospitalName" },
        message: "同一医院半年内不能重复收集竞品信息",
      },
    ],
  },

  培训会: {
    name: "培训会",
    description: "培训会验证",
    requiredFields: ["实施人", "培训时间", "参会人数"],
    sheetNames: ["培训会", "培训", "会议", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      培训时间: "trainingTime",
      实施时间: "trainingTime",
      会议时间: "trainingTime",
      活动时间: "trainingTime",
      参会人数: "attendeeCount",
      人数: "attendeeCount",
      培训地点: "location",
      地点: "location",
      培训主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "trainingTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "培训时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "attendeeCount",
        type: "minValue",
        params: { minValue: 30 },
        message: "参会人数不能少于30人",
      },
    ],
  },

  科室会: {
    name: "科室会",
    description: "科室会验证",
    requiredFields: ["实施人", "会议时间", "参会人数"],
    sheetNames: ["科室会", "科室", "会议", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      会议时间: "meetingTime",
      实施时间: "meetingTime",
      活动时间: "meetingTime",
      参会人数: "attendeeCount",
      人数: "attendeeCount",
      会议地点: "location",
      地点: "location",
      科室名称: "departmentName",
      科室: "departmentName",
      会议主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "meetingTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "会议时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "attendeeCount",
        type: "minValue",
        params: { minValue: 5 },
        message: "参会人数不能少于5人（不包括主讲人）",
      },
    ],
  },

  圆桌会: {
    name: "圆桌会",
    description: "圆桌会验证",
    requiredFields: ["实施人", "会议时间", "参会人数"],
    sheetNames: ["圆桌会", "圆桌", "会议", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      会议时间: "meetingTime",
      实施时间: "meetingTime",
      活动时间: "meetingTime",
      参会人数: "attendeeCount",
      人数: "attendeeCount",
      会议地点: "location",
      地点: "location",
      会议主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "meetingTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "会议时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "attendeeCount",
        type: "minValue",
        params: { minValue: 5 },
        message: "参会人数不能少于5人（不包括主讲人）",
      },
    ],
  },

  学术研讨病例讨论会: {
    name: "学术研讨、病例讨论会",
    description: "学术研讨、病例讨论会验证",
    requiredFields: ["实施人", "会议时间", "参会人数"],
    sheetNames: [
      "学术研讨病例讨论会",
      "学术研讨",
      "病例讨论会",
      "学术会议",
      "会议",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      会议时间: "meetingTime",
      实施时间: "meetingTime",
      活动时间: "meetingTime",
      参会人数: "attendeeCount",
      人数: "attendeeCount",
      会议地点: "location",
      地点: "location",
      会议主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "meetingTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "会议时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "attendeeCount",
        type: "minValue",
        params: { minValue: 30 },
        message: "参会人数不能少于30人",
      },
    ],
  },

  大型推广活动: {
    name: "大型推广活动",
    description: "大型推广活动验证",
    requiredFields: ["实施人", "活动时间", "参与人数"],
    sheetNames: ["大型推广活动", "推广活动", "活动", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      活动时间: "activityTime",
      实施时间: "activityTime",
      参与人数: "participantCount",
      人数: "participantCount",
      活动地点: "location",
      地点: "location",
      活动主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "activityTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "活动时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "participantCount",
        type: "minValue",
        params: { minValue: 20 },
        message: "参与人数不能少于20人",
      },
    ],
  },

  小型推广活动: {
    name: "小型推广活动",
    description: "小型推广活动验证",
    requiredFields: ["实施人", "活动时间", "参与人数"],
    sheetNames: ["小型推广活动", "推广活动", "活动", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      活动时间: "activityTime",
      实施时间: "activityTime",
      参与人数: "participantCount",
      人数: "participantCount",
      活动地点: "location",
      地点: "location",
      活动主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "activityTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "活动时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "participantCount",
        type: "minValue",
        params: { minValue: 10 },
        message: "参与人数不能少于10人",
      },
    ],
  },

  药店陈列服务: {
    name: "药店陈列服务",
    description: "药店陈列服务验证",
    requiredFields: ["实施人", "药店名称", "服务时间"],
    sheetNames: [
      "药店陈列服务",
      "陈列服务",
      "药店陈列",
      "陈列",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      服务时间: "serviceTime",
      实施时间: "serviceTime",
      陈列位置: "displayPosition",
      位置: "displayPosition",
      服务内容: "serviceContent",
      内容: "serviceContent",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "pharmacyName",
        type: "required",
        message: "药店名称不能为空",
      },
      {
        field: "serviceTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "服务时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
    ],
  },
};

// 获取任务模板
export function getTaskTemplate(taskName: string): TaskTemplate | undefined {
  return TASK_TEMPLATES[taskName];
}

// 获取所有可用任务
export function getAvailableTasks(): string[] {
  return Object.keys(TASK_TEMPLATES);
}

// ============= 动态配置支持 =============

// 类型定义用于动态配置
interface RuleConfig {
  id: string;
  field: string;
  type: ValidationRule["type"];
  enabled: boolean;
  params?: ValidationRule["params"];
  message: string;
}

interface TaskTemplateConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiredFields: string[];
  sheetNames: string[];
  matchKeywords?: string[];
  fieldMappings: Record<string, string>;
  validationRules: RuleConfig[];
}

interface ValidationConfig {
  version: string;
  lastModified: string;
  prohibitedTerms: string[];
  templates: Record<string, TaskTemplateConfig>;
}

const CONFIG_STORAGE_KEY = "excel-review-validation-config";

/**
 * 从配置存储获取活跃的任务模板
 * 优先使用用户自定义配置，如果没有则使用默认配置
 */
export function getActiveTaskTemplates(): Record<string, TaskTemplate> {
  // 服务端渲染时使用默认配置
  if (typeof window === "undefined") {
    return TASK_TEMPLATES;
  }

  try {
    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!stored) {
      return TASK_TEMPLATES;
    }

    const config: ValidationConfig = JSON.parse(stored);
    const result: Record<string, TaskTemplate> = {};

    for (const [name, templateConfig] of Object.entries(config.templates)) {
      // 跳过禁用的模板
      if (!templateConfig.enabled) continue;

      // 只保留启用的规则
      const enabledRules: ValidationRule[] = templateConfig.validationRules
        .filter((r: RuleConfig) => r.enabled)
        .map((r: RuleConfig) => ({
          field: r.field,
          type: r.type,
          params: r.params,
          message: r.message,
        }));

      result[name] = {
        name: templateConfig.name,
        description: templateConfig.description,
        requiredFields: templateConfig.requiredFields,
        sheetNames: templateConfig.sheetNames,
        matchKeywords: templateConfig.matchKeywords,
        fieldMappings: templateConfig.fieldMappings,
        validationRules: enabledRules,
      };
    }

    return result;
  } catch (error) {
    console.warn("Failed to load custom config, using defaults:", error);
    return TASK_TEMPLATES;
  }
}

/**
 * 获取单个活跃的任务模板
 */
export function getActiveTaskTemplate(
  taskName: string
): TaskTemplate | undefined {
  const templates = getActiveTaskTemplates();
  return templates[taskName];
}

/**
 * 获取所有活跃的任务名称
 */
export function getActiveTaskNames(): string[] {
  const templates = getActiveTaskTemplates();
  return Object.keys(templates);
}
