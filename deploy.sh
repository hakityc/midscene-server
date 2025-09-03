#!/bin/bash

# MidScene Server Docker 部署脚本

set -e

echo "🚀 开始部署 MidScene Server..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从 env.example 复制..."
    cp env.example .env
    echo "📝 请编辑 .env 文件设置必要的环境变量"
    echo "   特别是 OPENAI_API_KEY 和 MIDSCENE_MODEL_NAME"
    read -p "按 Enter 键继续..."
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down 2>/dev/null || true

# 构建并启动容器
echo "🔨 构建并启动容器..."
docker-compose up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ 服务启动成功！"
    echo "🌐 访问地址: http://localhost:3000"
    echo "📊 健康检查: http://localhost:3000/health"
else
    echo "❌ 服务启动失败，请检查日志："
    docker-compose logs
    exit 1
fi

echo "📋 常用命令："
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  更新服务: docker-compose up -d --build"
