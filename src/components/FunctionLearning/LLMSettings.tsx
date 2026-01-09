/**
 * LLM 设置组件 - 配置 API Key
 */
import { useState, useEffect } from 'react';
import { 
  getLLMConfig, 
  saveLLMConfig, 
  LLMConfig,
  isLLMConfigured 
} from '../../../shared/function-library/ai';

interface LLMSettingsProps {
  onClose: () => void;
}

export function LLMSettings({ onClose }: LLMSettingsProps) {
  const [provider, setProvider] = useState<'qwen' | 'openai' | 'custom'>('qwen');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const config = getLLMConfig();
    if (config) {
      setProvider(config.provider);
      setApiKey(config.apiKey);
      setBaseUrl(config.baseUrl || '');
      setModel(config.model || '');
    }
    setIsConfigured(isLLMConfigured());
  }, []);

  const handleSave = () => {
    const config: LLMConfig = {
      provider,
      apiKey,
      baseUrl: baseUrl || undefined,
      model: model || undefined
    };
    saveLLMConfig(config);
    setSaved(true);
    setIsConfigured(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setApiKey('');
    setBaseUrl('');
    setModel('');
    localStorage.removeItem('excel-function-llm-config');
    setIsConfigured(false);
  };

  const getDefaultModel = () => {
    switch (provider) {
      case 'qwen':
        return 'qwen-plus';
      case 'openai':
        return 'gpt-3.5-turbo';
      default:
        return '';
    }
  };

  const getDefaultBaseUrl = () => {
    switch (provider) {
      case 'qwen':
        return 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      case 'openai':
        return 'https://api.openai.com/v1';
      default:
        return '';
    }
  };

  return (
    <div className="fl-llm-settings">
      <div className="fl-settings-header">
        <h2>🤖 AI 智能推荐设置</h2>
        <button className="fl-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="fl-settings-content">
        <p className="fl-settings-desc">
          配置大语言模型 API 以启用更智能的函数推荐。支持通义千问、OpenAI 及其他兼容 API。
        </p>

        {/* 状态提示 */}
        <div className={`fl-settings-status ${isConfigured ? 'configured' : 'not-configured'}`}>
          {isConfigured ? '✅ 已配置 - AI 智能推荐已启用' : '⚠️ 未配置 - 使用本地规则推荐'}
        </div>

        {/* Provider 选择 */}
        <div className="fl-settings-field">
          <label>API 提供商</label>
          <div className="fl-provider-options">
            <button 
              className={`fl-provider-btn ${provider === 'qwen' ? 'active' : ''}`}
              onClick={() => setProvider('qwen')}
            >
              通义千问
            </button>
            <button 
              className={`fl-provider-btn ${provider === 'openai' ? 'active' : ''}`}
              onClick={() => setProvider('openai')}
            >
              OpenAI
            </button>
            <button 
              className={`fl-provider-btn ${provider === 'custom' ? 'active' : ''}`}
              onClick={() => setProvider('custom')}
            >
              自定义
            </button>
          </div>
        </div>

        {/* API Key */}
        <div className="fl-settings-field">
          <label>API Key *</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === 'qwen' ? 'sk-xxx...' : 'sk-...'}
          />
          {provider === 'qwen' && (
            <span className="fl-field-hint">
              <a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" rel="noopener noreferrer">
                获取通义千问 API Key →
              </a>
            </span>
          )}
        </div>

        {/* Base URL (可选) */}
        <div className="fl-settings-field">
          <label>API 地址 (可选)</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={getDefaultBaseUrl()}
          />
          <span className="fl-field-hint">留空使用默认地址</span>
        </div>

        {/* Model (可选) */}
        <div className="fl-settings-field">
          <label>模型名称 (可选)</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={getDefaultModel()}
          />
          <span className="fl-field-hint">
            {provider === 'qwen' && '推荐: qwen-plus, qwen-turbo, qwen-max'}
            {provider === 'openai' && '推荐: gpt-3.5-turbo, gpt-4'}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="fl-settings-actions">
          <button 
            className="fl-save-btn"
            onClick={handleSave}
            disabled={!apiKey}
          >
            {saved ? '✓ 已保存' : '保存配置'}
          </button>
          {isConfigured && (
            <button className="fl-clear-btn" onClick={handleClear}>
              清除配置
            </button>
          )}
        </div>

        {/* 说明 */}
        <div className="fl-settings-note">
          <h4>💡 使用说明</h4>
          <ul>
            <li>API Key 仅保存在本地，不会上传到任何服务器</li>
            <li>配置后，智能推荐将结合本地规则和 AI 进行更精准的推荐</li>
            <li>如果 API 调用失败，会自动回退到本地规则推荐</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
