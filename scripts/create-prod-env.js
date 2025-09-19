import fs from 'node:fs';
import path from 'node:path';

console.log('🔧 创建生产环境 .env 文件...');

// 生产环境配置
const prodEnvContent = `# MidScene Server 环境变量配置 - 生产环境
# 此文件由构建脚本自动生成

# 服务器配置
PORT=3000
NODE_ENV=prod

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
LOG_LEVEL=info

# 生产环境特定配置
# 请根据实际生产环境修改以下配置
# OPENAI_API_KEY=your_production_api_key
# OPENAI_BASE_URL=your_production_base_url
# MIDSCENE_MODEL_NAME=your_production_model_name
`;

// 确保 dist/server 目录存在
const distDir = 'dist/server';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 写入生产环境的 .env 文件
fs.writeFileSync(path.join(distDir, '.env'), prodEnvContent);

console.log('✅ 生产环境 .env 文件已创建');
