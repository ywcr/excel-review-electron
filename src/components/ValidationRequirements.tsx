import type { ValidationResult } from "../../shared/types";

interface ValidationRequirementsProps {
  taskName: string;
  validationResult?: ValidationResult | null;
}

// 根据任务获取验证规则配置
function getRequirements(taskName: string) {
  switch (taskName) {
    case "药店拜访":
      return {
        title: "药店拜访验证要求",
        requirements: [
          {
            category: "重复拜访限制",
            items: [
              "同一药店1日内不能重复拜访",
              "同一对接人7日内不能重复拜访",
            ],
          },
          {
            category: "频次限制",
            items: ["同一实施人每日拜访不超过5家药店"],
          },
          {
            category: "拜访时长要求",
            items: ["拜访有效时间不低于60分钟"],
          },
          {
            category: "拜访时间范围",
            items: ["必须在08:00-19:00范围内"],
          },
          {
            category: "内容合规要求",
            items: ["拜访事项、信息反馈内容不能包含禁用词汇"],
          },
        ],
      };

    case "等级医院拜访":
      return {
        title: "等级医院拜访验证要求",
        requirements: [
          {
            category: "医疗类型要求",
            items: ["必须选择以下类别：等级、基层、民营"],
          },
          {
            category: "重复拜访限制",
            items: ["同一医院1日内不能重复拜访", "同一医生7日内不能重复拜访"],
          },
          {
            category: "频次限制",
            items: ["同一实施人每日拜访不超过4家医院"],
          },
          {
            category: "拜访时长要求",
            items: ["拜访有效时间不低于100分钟"],
          },
          {
            category: "拜访时间范围",
            items: ["必须在07:00-19:00范围内"],
          },
        ],
      };

    case "基层医疗机构拜访":
      return {
        title: "基层医疗机构拜访验证要求",
        requirements: [
          {
            category: "医疗类型要求",
            items: ["必须选择以下类别：等级、基层、民营"],
          },
          {
            category: "重复拜访限制",
            items: ["同一医院2日内不能重复拜访", "同一医生7日内不能重复拜访"],
          },
          {
            category: "频次限制",
            items: ["同一实施人每日拜访不超过4家医院"],
          },
          {
            category: "拜访时长要求",
            items: ["拜访有效时间不低于100分钟"],
          },
          {
            category: "拜访时间范围",
            items: ["必须在07:00-19:00范围内"],
          },
        ],
      };

    case "民营医院拜访":
      return {
        title: "民营医院拜访验证要求",
        requirements: [
          {
            category: "医疗类型要求",
            items: ["必须选择以下类别：等级、基层、民营"],
          },
          {
            category: "重复拜访限制",
            items: ["同一医院2日内不能重复拜访", "同一医生7日内不能重复拜访"],
          },
          {
            category: "频次限制",
            items: ["同一实施人每日拜访不超过4家医院"],
          },
          {
            category: "拜访时长要求",
            items: ["拜访有效时间不低于100分钟"],
          },
          {
            category: "拜访时间范围",
            items: ["必须在07:00-19:00范围内"],
          },
        ],
      };

    case "科室拜访":
      return {
        title: "科室拜访验证要求",
        requirements: [
          {
            category: "重复拜访限制",
            items: ["同一医院3日内不能重复拜访", "同一医生7日内不能重复拜访"],
          },
          {
            category: "频次限制",
            items: ["同一实施人每日拜访不超过4家医院"],
          },
          {
            category: "拜访时长要求",
            items: ["拜访有效时间不低于100分钟"],
          },
          {
            category: "拜访时间范围",
            items: ["必须在07:00-19:00范围内"],
          },
          {
            category: "特殊要求",
            items: ["当月同一医院不可同时出现在「科室拜访」和「医院级拜访」中"],
          },
        ],
      };

    case "消费者调研":
      return {
        title: "消费者调研验证要求",
        requirements: [
          {
            category: "唯一性要求",
            items: ["调查对象姓名永远不能重复", "同一实施人每日不超过50份"],
          },
          {
            category: "基本要求",
            items: ["日期格式：纯日期格式（如：2025-01-15）", "必填字段不能为空"],
          },
        ],
      };

    case "患者调研":
      return {
        title: "患者调研验证要求",
        requirements: [
          {
            category: "唯一性要求",
            items: ["调查对象姓名永远不能重复", "同一实施人每日不超过20份"],
          },
          {
            category: "基本要求",
            items: ["日期格式：纯日期格式（如：2025-01-15）", "必填字段不能为空"],
          },
        ],
      };

    case "店员调研":
      return {
        title: "店员调研验证要求",
        requirements: [
          {
            category: "唯一性要求",
            items: [
              "店员姓名永远不能重复",
              "同一实施人每日拜访不超过2家药店",
              "每个药店不超过5份",
              "同一实施人每日不超过10份",
            ],
          },
          {
            category: "基本要求",
            items: ["日期格式：纯日期格式（如：2025-01-15）", "必填字段不能为空"],
          },
        ],
      };

    case "药店调研":
      return {
        title: "药店调研验证要求",
        requirements: [
          {
            category: "唯一性要求",
            items: [
              "调查对象姓名永远不能重复",
              "同一药店只能调研1次",
              "同一实施人每日拜访不超过2家药店",
            ],
          },
          {
            category: "基本要求",
            items: ["日期格式：纯日期格式（如：2025-01-15）", "必填字段不能为空"],
          },
        ],
      };

    case "竞品信息收集":
      return {
        title: "竞品信息收集验证要求",
        requirements: [
          {
            category: "时间间隔要求",
            items: ["同一医院半年内不能重复收集竞品信息"],
          },
          {
            category: "基本要求",
            items: ["日期格式：纯日期格式（如：2025-01-15）", "必填字段不能为空"],
          },
        ],
      };

    case "培训会":
      return {
        title: "培训会验证要求",
        requirements: [
          {
            category: "参会要求",
            items: ["参会人数不能少于30人"],
          },
          {
            category: "材料要求",
            items: [
              "申请审批表、培训发票、培训大纲及课件",
              "登记表、议程、总结",
              "培训现场照片（主讲人和PPT）",
            ],
          },
        ],
      };

    case "科室会":
      return {
        title: "科室会验证要求",
        requirements: [
          {
            category: "参会要求",
            items: ["参会人数不能少于5人（不包括主讲人）"],
          },
          {
            category: "材料要求",
            items: [
              "会议申请表、登记表、议程",
              "现场照片（PPT、全景照片等）",
              "相关发票、总结、费用结算单",
            ],
          },
        ],
      };

    case "圆桌会":
      return {
        title: "圆桌会验证要求",
        requirements: [
          {
            category: "参会要求",
            items: ["参会人数不能少于5人（不包括主讲人）"],
          },
          {
            category: "材料要求",
            items: [
              "活动现场照片（PPT、横幅、海报等）",
              "相关发票、登记表、议程、总结",
            ],
          },
        ],
      };

    case "学术研讨、病例讨论会":
      return {
        title: "学术研讨验证要求",
        requirements: [
          {
            category: "参会要求",
            items: ["参会人数不能少于30人"],
          },
          {
            category: "材料要求",
            items: [
              "申请审批表、会议发票、大纲及课件",
              "登记表、议程、总结",
              "现场照片（主讲人和PPT）",
            ],
          },
        ],
      };

    case "大型推广活动":
      return {
        title: "大型推广活动验证要求",
        requirements: [
          {
            category: "参与要求",
            items: ["参与人数不能少于20人"],
          },
          {
            category: "材料要求",
            items: [
              "照片：横幅、海报、彩页、易拉宝、样品等",
              "相关发票、活动申请表、总结、费用结算单",
            ],
          },
        ],
      };

    case "小型推广活动":
      return {
        title: "小型推广活动验证要求",
        requirements: [
          {
            category: "参与要求",
            items: ["参与人数不能少于10人"],
          },
          {
            category: "材料要求",
            items: [
              "照片：横幅、海报、彩页、易拉宝、样品等",
              "相关发票、活动申请表、总结、费用结算单",
            ],
          },
        ],
      };

    case "药店陈列服务":
      return {
        title: "药店陈列服务验证要求",
        requirements: [
          {
            category: "基本要求",
            items: [
              "药店名称不能为空",
              "陈列位置明确",
              "陈列效果照片完整",
              "服务时间记录准确",
            ],
          },
        ],
      };

    default:
      return {
        title: "通用验证要求",
        requirements: [
          {
            category: "基本要求",
            items: [
              "日期格式：纯日期格式（如：2025-01-15）",
              "必填字段不能为空",
              "数据格式需符合模板要求",
            ],
          },
        ],
      };
  }
}

// 根据要求文本获取对应的错误类型
function getErrorTypesForRequirement(requirementText: string): string[] {
  if (
    requirementText.includes("医疗类型") ||
    requirementText.includes("级别") ||
    requirementText.includes("类别")
  ) {
    return ["medicalLevel"];
  }

  if (requirementText.includes("重复拜访") && requirementText.includes("医院")) {
    return ["dateInterval"];
  }
  if (requirementText.includes("重复拜访") && requirementText.includes("医生")) {
    return ["dateInterval"];
  }
  if (requirementText.includes("重复拜访") && requirementText.includes("药店")) {
    return ["unique"];
  }
  if (requirementText.includes("重复拜访") && requirementText.includes("对接人")) {
    return ["dateInterval"];
  }

  if (
    requirementText.includes("永远不能重复") ||
    (requirementText.includes("姓名") && requirementText.includes("不能重复"))
  ) {
    return ["unique"];
  }

  if (requirementText.includes("只能") && requirementText.includes("1次")) {
    return ["unique"];
  }

  if (
    requirementText.includes("频次") ||
    requirementText.includes("每日") ||
    (requirementText.includes("不超过") && requirementText.includes("份"))
  ) {
    return ["frequency"];
  }

  if (requirementText.includes("时长") || requirementText.includes("分钟")) {
    return ["duration"];
  }

  if (
    requirementText.includes("时间范围") ||
    requirementText.includes("07:00") ||
    requirementText.includes("08:00")
  ) {
    return ["timeRange"];
  }

  if (requirementText.includes("日期格式")) {
    return ["dateFormat"];
  }

  if (requirementText.includes("必填") || requirementText.includes("不能为空")) {
    return ["required"];
  }

  if (
    (requirementText.includes("不能少于") || requirementText.includes("不少于")) &&
    requirementText.includes("人")
  ) {
    return ["minValue"];
  }

  if (requirementText.includes("半年内") && requirementText.includes("医院")) {
    return ["sixMonthsInterval"];
  }

  if (
    requirementText.includes("当月") &&
    requirementText.includes("同一医院") &&
    requirementText.includes("不可同时")
  ) {
    return ["crossTaskValidation"];
  }

  if (requirementText.includes("禁用词汇") || requirementText.includes("不能包含")) {
    return ["prohibitedContent"];
  }

  return [];
}

export function ValidationRequirements({
  taskName,
  validationResult,
}: ValidationRequirementsProps) {
  const config = getRequirements(taskName);

  // 计算规则状态
  const getRequirementStatus = (
    errorTypes: string[]
  ): "success" | "error" | "neutral" => {
    if (!validationResult) {
      return "neutral";
    }

    if (!errorTypes || errorTypes.length === 0) {
      return "neutral";
    }

    const hasError = validationResult.errors.some((error) =>
      errorTypes.includes(error.errorType)
    );
    return hasError ? "error" : "success";
  };

  // 获取错误数量
  const getErrorCount = (errorTypes: string[]): number => {
    if (!validationResult) return 0;
    return validationResult.errors.filter((error) =>
      errorTypes.includes(error.errorType)
    ).length;
  };

  // 渲染状态图标
  const renderStatusIcon = (errorTypes: string[]) => {
    const status = getRequirementStatus(errorTypes);
    const errorCount = getErrorCount(errorTypes);

    switch (status) {
      case "success":
        return (
          <svg
            className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <div className="flex items-center mr-2 mt-0.5 flex-shrink-0">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {errorCount > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {errorCount}
              </span>
            )}
          </div>
        );
      default:
        return (
          <div className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 border border-zinc-300 rounded-sm bg-zinc-50"></div>
        );
    }
  };

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center mb-4">
        <div className="flex items-center justify-center w-7 h-7 bg-zinc-100 rounded-full mr-2.5">
          <svg
            className="w-4 h-4 text-zinc-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-zinc-800">{config.title}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {config.requirements.map((req, index) => (
          <div
            key={index}
            className="bg-white rounded-md p-4 border border-zinc-100"
          >
            <div className="flex items-center mb-2">
              <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full mr-2"></div>
              <h4 className="font-semibold text-zinc-700 text-sm">
                {req.category}
              </h4>
            </div>
            <ul className="space-y-1.5">
              {req.items.map((item, itemIndex) => {
                const errorTypes = getErrorTypesForRequirement(item);
                const status = getRequirementStatus(errorTypes);

                return (
                  <li
                    key={itemIndex}
                    className={`text-xs flex items-start ${
                      status === "error"
                        ? "text-red-600"
                        : status === "success"
                        ? "text-emerald-600"
                        : "text-zinc-600"
                    }`}
                  >
                    {renderStatusIcon(errorTypes)}
                    <span className="leading-relaxed">{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* 底部说明 */}
      <div className="mt-4 p-3 bg-zinc-100 rounded-md border border-zinc-150">
        <div className="flex items-start">
          <svg
            className="w-4 h-4 text-zinc-500 mr-2 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-xs text-zinc-600">
            {!validationResult ? (
              <span>
                系统将根据以上要求自动验证您上传的数据。不符合要求的数据将在验证结果中详细标出。
              </span>
            ) : (
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center">
                  <svg
                    className="w-3 h-3 text-emerald-500 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  通过
                </span>
                <span className="inline-flex items-center">
                  <svg
                    className="w-3 h-3 text-red-500 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  有错误
                </span>
                <span className="inline-flex items-center">
                  <span className="inline-block w-3 h-3 mr-1 border border-zinc-300 rounded-sm bg-zinc-50"></span>
                  未验证
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
