import fs from 'fs';
import path from 'path';

console.log('🚀 创建启动脚本...');

const startScript = `#!/bin/bash

# MidScene Server 启动脚本
echo "🚀 启动 MidScene Server..."

# 检查 Node.js 版本
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ 错误: 需要 Node.js 18 或更高版本，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在"
    if [ -f ".env.sample" ]; then
        echo "📋 复制 .env.sample 到 .env"
        cp .env.sample .env
        echo "📝 请编辑 .env 文件配置环境变量"
        echo "   必需的变量: OPENAI_API_KEY, OPENAI_BASE_URL, MIDSCENE_MODEL_NAME"
        echo ""
        echo "按任意键继续，或 Ctrl+C 取消..."
        read -n 1
    else
        echo "❌ 错误: .env.sample 文件不存在"
        exit 1
    fi
fi

# 检查必要的环境变量
if ! grep -q "OPENAI_API_KEY=" .env || grep -q "OPENAI_API_KEY=your_" .env; then
    echo "⚠️  警告: OPENAI_API_KEY 未正确配置"
fi

if ! grep -q "OPENAI_BASE_URL=" .env || grep -q "OPENAI_BASE_URL=https://api.openai.com/v1" .env; then
    echo "⚠️  警告: OPENAI_BASE_URL 未正确配置"
fi

if ! grep -q "MIDSCENE_MODEL_NAME=" .env || grep -q "MIDSCENE_MODEL_NAME=gpt-4" .env; then
    echo "⚠️  警告: MIDSCENE_MODEL_NAME 未正确配置"
fi

# 安装依赖
echo "📦 安装依赖..."
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 启动服务
echo "🚀 启动服务..."
echo "📍 服务将在 http://localhost:3000 启动"
echo "🔍 健康检查: http://localhost:3000/health"
echo ""

npm start
`;

// 确保 dist 目录存在
const distDir = 'dist';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 写入启动脚本
fs.writeFileSync(
  path.join(distDir, 'start.sh'),
  startScript
);

// 设置执行权限
fs.chmodSync(path.join(distDir, 'start.sh'), '755');

console.log('✅ 启动脚本已创建');
