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
