// 问卷验证服务
// 用于验证被审核的"数据清单"Excel中的问卷题目是否与标准模板一致

import * as fs from "fs";
import * as path from "path";

// 问卷题目结构
interface QuestionItem {
  number: number;
  question: string;
  options: string;
}

// 品牌问卷模板
interface BrandQuestionnaires {
  患者问卷: QuestionItem[];
  消费者问卷: QuestionItem[];
}

// 问卷验证错误
export interface QuestionnaireError {
  type: "missing" | "extra" | "mismatch";
  questionNumber: number;
  field: "question" | "options";
  expected?: string;
  actual?: string;
  message: string;
}

// 问卷验证结果
export interface QuestionnaireValidationResult {
  isValid: boolean;
  errors: QuestionnaireError[];
  brandName: string;
  questionnaireType: string;
}

// 加载问卷模板
let cachedTemplates: Record<string, BrandQuestionnaires> | null = null;

function loadQuestionnaireTemplates(): Record<string, BrandQuestionnaires> {
  if (cachedTemplates) return cachedTemplates;

  // 尝试多个可能的路径
  const possiblePaths = [
    path.join(__dirname, "../../shared/questionnaire-templates.json"),
    path.join(__dirname, "../shared/questionnaire-templates.json"),
    path.join(process.cwd(), "shared/questionnaire-templates.json"),
    path.resolve("shared/questionnaire-templates.json"),
  ];

  for (const templatePath of possiblePaths) {
    try {
      if (fs.existsSync(templatePath)) {
        const content = fs.readFileSync(templatePath, "utf-8");
        cachedTemplates = JSON.parse(content);
        console.log("✅ [问卷模板] 加载成功，路径:", templatePath, "品牌:", Object.keys(cachedTemplates!));
        return cachedTemplates!;
      }
    } catch (err) {
      // 继续尝试下一个路径
    }
  }

  console.error("❌ [问卷模板] 加载失败，尝试过的路径:", possiblePaths);
  return {};
}

// 规范化题目文本（去除多余空格和特殊字符）
function normalizeQuestionText(text: string): string {
  return text
    .replace(/\s+/g, "") // 移除所有空格
    .replace(/[（）]/g, (m) => (m === "（" ? "(" : ")")) // 统一括号
    .replace(/[\[\]【】]/g, "") // 移除方括号
    .replace(/单选项|多选项/g, "") // 移除选项类型标记
    .toLowerCase();
}

// 从列标题中提取题号
function extractQuestionNumber(header: string): number | null {
  const match = header.match(/^(\d+)、/);
  return match ? parseInt(match[1]) : null;
}

// 判断任务类型对应的问卷
function getQuestionnaireType(taskName: string): string | null {
  if (taskName === "消费者调研") return "消费者问卷";
  if (taskName === "患者调研") return "患者问卷";
  return null;
}

/**
 * 验证数据清单表头中的问卷题目
 * @param headerRow 表头行的列名列表
 * @param brandName 品牌名称
 * @param taskName 任务名称（消费者调研/患者调研）
 */
export function validateQuestionnaireHeaders(
  headerRow: string[],
  brandName: string,
  taskName: string
): QuestionnaireValidationResult {
  const questionnaireType = getQuestionnaireType(taskName);

  if (!questionnaireType) {
    return {
      isValid: true,
      errors: [],
      brandName,
      questionnaireType: taskName,
    };
  }

  const templates = loadQuestionnaireTemplates();
  const brandTemplate = templates[brandName];

  if (!brandTemplate) {
    return {
      isValid: false,
      errors: [{
        type: "mismatch",
        questionNumber: 0,
        field: "question",
        message: `未找到品牌"${brandName}"的问卷模板`,
      }],
      brandName,
      questionnaireType,
    };
  }

  const standardQuestions = brandTemplate[questionnaireType as keyof BrandQuestionnaires];
  if (!standardQuestions || standardQuestions.length === 0) {
    return {
      isValid: false,
      errors: [{
        type: "mismatch",
        questionNumber: 0,
        field: "question",
        message: `品牌"${brandName}"没有${questionnaireType}模板`,
      }],
      brandName,
      questionnaireType,
    };
  }

  const errors: QuestionnaireError[] = [];

  // 从表头中提取问卷题目（题目列通常以数字和、开头，如"1、题目内容"）
  const extractedQuestions: Map<number, string> = new Map();
  for (const header of headerRow) {
    if (!header) continue;
    const qNum = extractQuestionNumber(header);
    if (qNum !== null) {
      extractedQuestions.set(qNum, header);
    }
  }

  console.log(`📋 [问卷验证] 品牌: ${brandName}, 类型: ${questionnaireType}`);
  console.log(`   标准题目数: ${standardQuestions.length}, 提取题目数: ${extractedQuestions.size}`);

  // 创建标准题目的映射
  const standardMap = new Map<number, QuestionItem>();
  for (const q of standardQuestions) {
    standardMap.set(q.number, q);
  }

  // 检查缺失和不一致的题目
  for (const [num, standard] of standardMap) {
    const extractedHeader = extractedQuestions.get(num);
    
    if (!extractedHeader) {
      errors.push({
        type: "missing",
        questionNumber: num,
        field: "question",
        expected: standard.question,
        message: `缺少第${num}题`,
      });
      continue;
    }

    // 比较题目内容（只比较核心部分，忽略格式差异）
    const normalizedStandard = normalizeQuestionText(standard.question);
    const normalizedExtracted = normalizeQuestionText(extractedHeader);

    if (normalizedStandard !== normalizedExtracted) {
      errors.push({
        type: "mismatch",
        questionNumber: num,
        field: "question",
        expected: standard.question,
        actual: extractedHeader,
        message: `第${num}题题目不一致`,
      });
    }
  }

  // 检查多余的题目
  for (const [num, header] of extractedQuestions) {
    if (!standardMap.has(num)) {
      errors.push({
        type: "extra",
        questionNumber: num,
        field: "question",
        actual: header,
        message: `存在多余的第${num}题`,
      });
    }
  }

  // 按题号排序
  errors.sort((a, b) => a.questionNumber - b.questionNumber);

  console.log(`   验证结果: ${errors.length === 0 ? "✅ 通过" : `❌ ${errors.length}个错误`}`);

  return {
    isValid: errors.length === 0,
    errors,
    brandName,
    questionnaireType,
  };
}

// 获取可用品牌列表
export function getAvailableBrands(): string[] {
  const templates = loadQuestionnaireTemplates();
  return Object.keys(templates);
}

// ========== 问卷回答内容验证 ==========

// 回答验证错误
export interface AnswerValidationError {
  row: number;
  questionNumber: number;
  questionTitle: string;
  expectedOptions: string;
  actualAnswer: string;
  message: string;
}

// 从选项字符串中解析出有效选项列表
function parseOptions(optionsStr: string): string[] {
  if (!optionsStr || !optionsStr.trim()) return [];
  
  // 选项通常以●开头，用空格或换行分隔
  // 例如: "●定期记录  ●对比过血常规 / 肝肾功能检查结果  ●记录过疼痛评分"
  return optionsStr
    .split(/●/)
    .map(opt => opt.trim())
    .filter(opt => opt.length > 0);
}

// 规范化回答文本
function normalizeAnswer(answer: string): string {
  return answer
    .replace(/\s+/g, "") // 移除所有空格
    .toLowerCase();
}

// 检查回答是否匹配任意选项（多选题可能有多个答案）
function isAnswerValid(answer: string, validOptions: string[]): boolean {
  if (!answer || answer.trim() === "") return true; // 空回答暂时视为有效
  if (validOptions.length === 0) return true; // 没有标准选项则不验证
  
  const normalizedAnswer = normalizeAnswer(answer);
  
  // 检查是否与任一选项部分匹配
  return validOptions.some(option => {
    const normalizedOption = normalizeAnswer(option);
    // 回答应该包含在某个选项中，或某个选项包含回答
    return normalizedOption.includes(normalizedAnswer) || 
           normalizedAnswer.includes(normalizedOption);
  });
}

/**
 * 验证单行数据的问卷回答内容
 * @param headerRow 表头行（包含题目）
 * @param dataRow 数据行（包含回答）
 * @param rowIndex 行号
 * @param brandName 品牌名称
 * @param taskName 任务名称
 */
export function validateRowAnswers(
  headerRow: string[],
  dataRow: any[],
  rowIndex: number,
  brandName: string,
  taskName: string
): AnswerValidationError[] {
  const questionnaireType = getQuestionnaireType(taskName);
  if (!questionnaireType) return [];

  const templates = loadQuestionnaireTemplates();
  const brandTemplate = templates[brandName];
  if (!brandTemplate) return [];

  const standardQuestions = brandTemplate[questionnaireType as keyof BrandQuestionnaires];
  if (!standardQuestions) return [];

  // 创建标准题目映射
  const standardMap = new Map<number, QuestionItem>();
  for (const q of standardQuestions) {
    standardMap.set(q.number, q);
  }

  const errors: AnswerValidationError[] = [];

  // 遍历表头，找到问卷题目列
  for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
    const header = headerRow[colIndex]?.toString() || "";
    const qNum = extractQuestionNumber(header);
    
    if (qNum === null) continue;
    
    const standardQuestion = standardMap.get(qNum);
    if (!standardQuestion || !standardQuestion.options) continue;
    
    const validOptions = parseOptions(standardQuestion.options);
    if (validOptions.length === 0) continue;
    
    const answer = dataRow[colIndex]?.toString() || "";
    if (!answer.trim()) continue; // 跳过空回答
    
    if (!isAnswerValid(answer, validOptions)) {
      errors.push({
        row: rowIndex,
        questionNumber: qNum,
        questionTitle: header.substring(0, 30) + (header.length > 30 ? "..." : ""),
        expectedOptions: validOptions.slice(0, 3).join(" / ") + (validOptions.length > 3 ? " ..." : ""),
        actualAnswer: answer.substring(0, 30) + (answer.length > 30 ? "..." : ""),
        message: `第${qNum}题回答不在有效选项中`,
      });
    }
  }

  return errors;
}

/**
 * 获取问卷题目列的索引映射
 * @param headerRow 表头行
 * @returns 题号到列索引的映射
 */
export function getQuestionColumnMap(headerRow: string[]): Map<number, number> {
  const map = new Map<number, number>();
  for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
    const header = headerRow[colIndex]?.toString() || "";
    const qNum = extractQuestionNumber(header);
    if (qNum !== null) {
      map.set(qNum, colIndex);
    }
  }
  return map;
}
