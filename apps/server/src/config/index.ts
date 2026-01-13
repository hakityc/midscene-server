import { printValidationResult, validateEnv } from './envValidator.js';

export interface Config {
  port: number;
  nodeEnv: string;
  database?: {
    url: string;
  };
  model: {
    // provider: string;
    name: string;
    apiKey: string;
    baseUrl: string;
  };
  cos?: {
    secretId: string;
    secretKey: string;
    bucket: string;
    region: string;
    reportPath: string;
    url?: string; // 自定义域名 URL 前缀
  };
}

// 验证环境变量
const envValidation = validateEnv();

// 如果验证失败，抛出错误
if (!envValidation.valid) {
  printValidationResult(envValidation);
  throw new Error(`环境变量验证失败: ${envValidation.errors.join('; ')}`);
}

// 使用方括号语法避免 tsup 静态替换
export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  database: process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
      }
    : undefined,
  model: {
    name: process.env.MIDSCENE_MODEL_NAME || '',
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || '',
  },
  cos:
    process.env.COS_SECRET_ID &&
    process.env.COS_SECRET_KEY &&
    process.env.COS_BUCKET &&
    process.env.COS_REGION
      ? {
          secretId: process.env.COS_SECRET_ID,
          secretKey: process.env.COS_SECRET_KEY,
          bucket: process.env.COS_BUCKET,
          region: process.env.COS_REGION,
          reportPath: process.env.COS_REPORT_PATH || 'midscene-reports',
          url: process.env.COS_URL, // 自定义域名 URL 前缀
        }
      : undefined,
};

// 导出环境验证结果，供其他模块使用
export { envValidation };

/**
 * 更新运行时配置
 * @param newConfig 新的配置项
 */
export function updateRuntimeConfig(
  newConfig: Partial<Config> & { useQwen3Vl?: boolean | number },
) {
  if (newConfig.model) {
    if (newConfig.model.name) {
      config.model.name = newConfig.model.name;
      process.env.MIDSCENE_MODEL_NAME = newConfig.model.name;
    }
    if (newConfig.model.apiKey) {
      config.model.apiKey = newConfig.model.apiKey;
      process.env.OPENAI_API_KEY = newConfig.model.apiKey;
    }
    if (newConfig.model.baseUrl) {
      config.model.baseUrl = newConfig.model.baseUrl;
      process.env.OPENAI_BASE_URL = newConfig.model.baseUrl;
    }
  }

  if (newConfig.useQwen3Vl !== undefined) {
    process.env.MIDSCENE_USE_QWEN3_VL = String(
      newConfig.useQwen3Vl === true || newConfig.useQwen3Vl === 1 ? '1' : '0',
    );
  }

  console.log('Runtime config updated:', {
    modelName: config.model.name,
    baseUrl: config.model.baseUrl,
    useQwen3Vl: process.env.MIDSCENE_USE_QWEN3_VL,
  });
}
