/**
 * AI 对话系统提示词
 */

import { ChatContext } from './types';

/**
 * 构建系统提示词
 */
export function buildSystemPrompt(context: ChatContext): string {
  let prompt = `你是 Excel 审核系统的 AI 助手，名叫"小审"。请用专业但友好的方式回答用户问题。

你的能力包括：
1. 解释 Excel 验证错误的原因和修复方法
2. 介绍 Excel 函数的用法和语法
3. 解读审核规则和验证逻辑
4. 提供数据处理和公式编写建议

回答要求：
- 使用简洁明了的中文
- 对于公式，用代码块格式显示
- 对于步骤说明，使用编号列表
- 如果不确定，诚实说明并提供可能的方向
`;

  // 根据当前页面添加上下文
  if (context.currentPage === 'validation' || context.currentPage === 'batch') {
    prompt += `\n当前用户正在使用 Excel 验证功能。`;
    if (context.taskName) {
      prompt += `\n验证任务类型：${context.taskName}`;
    }
    if (context.fileName) {
      prompt += `\n当前文件：${context.fileName}`;
    }
  } else if (context.currentPage === 'functions') {
    prompt += `\n当前用户正在浏览 Excel 函数学习模块。`;
    if (context.selectedFunction) {
      prompt += `\n用户正在查看函数：${context.selectedFunction}`;
    }
  }

  // 如果有选中的错误
  if (context.selectedError) {
    const err = context.selectedError;
    prompt += `\n\n用户选中了一个验证错误：
- 行号：${err.row}
- 字段：${err.field}
- 错误类型：${err.errorType}
- 当前值：${err.value || '(空)'}`;
    if (err.expected) {
      prompt += `\n- 期望值：${err.expected}`;
    }
    prompt += `\n请帮助用户理解这个错误并提供修复建议。`;
  }

  return prompt;
}

/**
 * 快捷问题列表
 */
export function getQuickQuestions(context: ChatContext) {
  const general = [
    { id: 'g1', text: '如何使用这个审核系统？', category: 'general' as const },
    { id: 'g2', text: '常见的验证错误有哪些？', category: 'general' as const },
  ];

  const validation = [
    { id: 'v1', text: '这个错误是什么意思？', category: 'validation' as const },
    { id: 'v2', text: '如何修复这个问题？', category: 'validation' as const },
    { id: 'v3', text: '为什么这个值不符合要求？', category: 'validation' as const },
  ];

  const functions = [
    { id: 'f1', text: '这个函数怎么用？', category: 'function' as const },
    { id: 'f2', text: '有哪些类似的函数？', category: 'function' as const },
    { id: 'f3', text: '帮我写一个公式', category: 'function' as const },
  ];

  // 根据上下文返回相关问题
  if (context.selectedError) {
    return [...validation, ...general];
  }
  if (context.currentPage === 'functions') {
    return [...functions, ...general];
  }
  if (context.currentPage === 'validation' || context.currentPage === 'batch') {
    return [...validation.slice(0, 2), ...general];
  }

  return general;
}
