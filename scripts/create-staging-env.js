import fs from 'node:fs';
import path from 'node:path';

console.log('🔧 创建预发布环境 .env 文件...');

// 预发布环境配置
const stagingEnvContent = `# MidScene Server 环境变量配置 - 预发布环境
# 此文件由构建脚本自动生成

# 服务器配置
PORT=3000
NODE_ENV=staging

# vl_model
OPENAI_API_KEY=""
MIDSCENE_MODEL_NAME=""
MIDSCENE_USE_QWEN_VL=1
OPENAI_BASE_URL=""

# task_model
TASK_OPENAI_BASE_URL=""
TASK_OPENAI_API_KEY=""
TASK_MIDSCENE_MODEL_NAME=""
TASK_MIDSCENE_USE_DOUBAO_VISION=1

# midscene_config
MIDSCENE_CACHE=1

# mastra_config
MASTRA_TELEMETRY_DISABLED=1

# 日志配置
LOG_LEVEL=debug

# 预发布环境特定配置
# 请根据实际预发布环境修改以下配置
# OPENAI_API_KEY=your_staging_api_key
# OPENAI_BASE_URL=your_staging_base_url
# MIDSCENE_MODEL_NAME=your_staging_model_name
`;

// 确保 dist/server 目录存在
const distDir = 'dist/server';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 写入预发布环境的 .env 文件
fs.writeFileSync(path.join(distDir, '.env'), stagingEnvContent);

console.log('✅ 预发布环境 .env 文件已创建');
