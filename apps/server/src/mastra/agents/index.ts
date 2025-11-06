import { openai } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import 'dotenv/config';

// 根据环境变量动态创建模型实例
export const createModel = (
  config: { modelName: string; apiKey: string; baseUrl: string } = {
    modelName: process.env.MIDSCENE_MODEL_NAME || 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || '',
  },
) => {
  const { modelName, apiKey, baseUrl } = config;
  // 检查必需的 API Key
  if (!apiKey) {
    throw new Error(
      '❌ OPENAI_API_KEY 未设置，AI 核心功能无法使用。请在 .env 文件中设置 OPENAI_API_KEY',
    );
  }
  console.log('Model config:', {
    modelName,
    apiKey: apiKey ? 'Set' : 'Not set',
    baseUrl: baseUrl || 'default (OpenAI)',
  });

  // 如果设置了自定义 baseURL，使用 openai-compatible 客户端（走 Chat Completions 兼容路径）
  if (baseUrl) {
    const compatOpenAI = createOpenAICompatible({
      apiKey,
      baseURL: baseUrl,
      name: modelName,
    });
    return compatOpenAI(modelName);
  }

  // 否则使用标准 OpenAI（自动从 OPENAI_API_KEY 环境变量读取）
  return openai(modelName);
};
