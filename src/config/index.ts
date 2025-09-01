export interface Config {
  port: number;
  nodeEnv: string;
  database?: {
    url: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: process.env.DATABASE_URL ? {
    url: process.env.DATABASE_URL,
  } : undefined,
};
