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
};
