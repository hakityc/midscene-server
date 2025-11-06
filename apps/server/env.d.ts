declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      NODE_ENV: string;
      CLS_ENDPOINT: string;
      CLS_TOPIC_ID: string;
      LOG_LEVEL: string;
      OPENAI_API_KEY: string;
      OPENAI_BASE_URL: string;
      MIDSCENE_MODEL_NAME: string;
      MIDSCENE_USE_QWEN3_VL: string;
      SUMMARIZE_OPENAI_API_KEY: string;
      SUMMARIZE_OPENAI_BASE_URL: string;
      SUMMARIZE_MODEL_NAME: string;
      MIDSCENE_CACHE: string;
      MIDSCENE_REPLANNING_CYCLE_LIMIT: string;
      MASTRA_TELEMETRY_DISABLED: string;
      MIDSCENE_LANGSMITH_DEBUG: string;
      LANGSMITH_TRACING_V2: string;
      LANGSMITH_ENDPOINT: string;
      LANGSMITH_API_KEY: string;
      LANGSMITH_PROJECT: string;
      COS_SECRET_ID: string;
      COS_SECRET_KEY: string;
      COS_BUCKET: string;
      COS_REGION: string;
      COS_URL: string;
      ENABLE_IPP_PRINTER: string;
      IPP_PRINTER_NAME: string;
      IPP_ZEROCONF: string;
    }
  }
}

export {}
