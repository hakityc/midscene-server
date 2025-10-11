import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import 'dotenv/config';

// 根据环境变量动态创建模型实例
export const createModel = () => {
  const name = process.env.TASK_MIDSCENE_MODEL_NAME || '';
  const apiKey = process.env.TASK_OPENAI_API_KEY || '';
  const baseUrl = process.env.TASK_OPENAI_BASE_URL || '';

  console.log('Model config:', {
    name,
    apiKey: apiKey ? 'Set' : 'Not set',
    baseUrl,
  });

  return createOpenAICompatible({
    name: name,
    baseURL: baseUrl,
    apiKey: apiKey,
  })(name);
};
