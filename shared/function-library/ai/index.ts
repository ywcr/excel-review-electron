/**
 * AI 推荐模块入口
 */
export { recommendFunctions, getExampleQueries } from './recommendation-engine';
export type { RecommendationResult } from './recommendation-engine';
export { 
  getLLMRecommendations, 
  getLLMConfig, 
  saveLLMConfig, 
  isLLMConfigured,
  convertLLMToRecommendation 
} from './llm-service';
export type { LLMConfig, LLMRecommendation, LLMResponse } from './llm-service';
