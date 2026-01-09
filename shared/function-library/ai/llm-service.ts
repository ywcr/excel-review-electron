/**
 * LLM API 服务 - 支持通义千问等大模型
 * 用于智能推荐的增强版本
 */

import { ExcelFunction, ALL_FUNCTIONS } from '../index';

// API 配置
export interface LLMConfig {
  provider: 'qwen' | 'openai' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// LLM 推荐结果
export interface LLMRecommendation {
  functionName: string;
  confidence: number;
  reason: string;
  suggestedFormula?: string;
}

// API 响应
export interface LLMResponse {
  success: boolean;
  recommendations: LLMRecommendation[];
  explanation?: string;
  error?: string;
}

// 默认配置
const DEFAULT_CONFIG: Partial<LLMConfig> = {
  provider: 'qwen',
  model: 'qwen-plus'
};

// 存储配置的 key
const CONFIG_KEY = 'excel-function-llm-config';

/**
 * 保存 LLM 配置
 */
export function saveLLMConfig(config: LLMConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save LLM config:', error);
  }
}

/**
 * 获取 LLM 配置
 */
export function getLLMConfig(): LLMConfig | null {
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load LLM config:', error);
  }
  return null;
}

/**
 * 检查是否已配置 LLM
 */
export function isLLMConfigured(): boolean {
  const config = getLLMConfig();
  return !!(config && config.apiKey);
}

/**
 * 构建函数列表提示
 */
function buildFunctionListPrompt(): string {
  const functionList = ALL_FUNCTIONS.map(fn => 
    `- ${fn.name}: ${fn.nameZh} - ${fn.description}`
  ).join('\n');
  
  return functionList;
}

/**
 * 构建系统提示
 */
function buildSystemPrompt(): string {
  return `你是一个 Excel 函数专家助手。用户会描述他们想要解决的问题，你需要推荐最合适的 Excel 函数。

可用的 Excel 函数列表：
${buildFunctionListPrompt()}

请根据用户的问题，推荐最合适的函数（最多5个），并按相关性排序。

返回格式必须是严格的 JSON：
{
  "recommendations": [
    {
      "functionName": "函数名",
      "confidence": 0.95,
      "reason": "推荐理由",
      "suggestedFormula": "示例公式（可选）"
    }
  ],
  "explanation": "整体解释"
}

注意：
1. functionName 必须是上述列表中存在的函数名
2. confidence 是 0-1 之间的数字
3. 按 confidence 从高到低排序
4. 理由要简洁明了，用中文`;
}

/**
 * 调用通义千问 API
 */
async function callQwenAPI(
  query: string, 
  config: LLMConfig
): Promise<LLMResponse> {
  const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = config.model || 'qwen-plus';
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in API response');
    }

    // 解析 JSON 响应
    const parsed = JSON.parse(content);
    
    // 验证推荐的函数是否存在
    const validRecommendations = (parsed.recommendations || [])
      .filter((rec: LLMRecommendation) => {
        const fn = ALL_FUNCTIONS.find(f => f.name === rec.functionName);
        return !!fn;
      })
      .map((rec: LLMRecommendation) => ({
        ...rec,
        confidence: Math.min(1, Math.max(0, rec.confidence))
      }));

    return {
      success: true,
      recommendations: validRecommendations,
      explanation: parsed.explanation
    };
  } catch (error) {
    console.error('LLM API error:', error);
    return {
      success: false,
      recommendations: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 调用 LLM 获取推荐
 */
export async function getLLMRecommendations(query: string): Promise<LLMResponse> {
  const config = getLLMConfig();
  
  if (!config || !config.apiKey) {
    return {
      success: false,
      recommendations: [],
      error: '未配置 API Key'
    };
  }

  switch (config.provider) {
    case 'qwen':
      return callQwenAPI(query, config);
    
    case 'openai':
      // OpenAI 兼容模式
      return callQwenAPI(query, {
        ...config,
        baseUrl: config.baseUrl || 'https://api.openai.com/v1'
      });
    
    case 'custom':
      return callQwenAPI(query, config);
    
    default:
      return {
        success: false,
        recommendations: [],
        error: `不支持的 provider: ${config.provider}`
      };
  }
}

/**
 * 将 LLM 推荐转换为标准推荐格式
 */
export function convertLLMToRecommendation(
  llmRec: LLMRecommendation
): { function: ExcelFunction; score: number; reason: string; matchedKeywords: string[] } | null {
  const fn = ALL_FUNCTIONS.find(f => f.name === llmRec.functionName);
  if (!fn) return null;
  
  return {
    function: fn,
    score: Math.round(llmRec.confidence * 100),
    reason: llmRec.reason,
    matchedKeywords: llmRec.suggestedFormula ? [llmRec.suggestedFormula] : []
  };
}
