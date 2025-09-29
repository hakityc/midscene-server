# MidScene Server

一个基于 Mastra 的浏览器自动化服务器，提供 MCP (Model Context Protocol) 支持。

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

```bash
# 访问应用
open http://localhost:3000
```

### Docker 部署

#### 使用 Docker Compose（推荐）

1. **复制环境变量文件**
```bash
cp env.example .env
```

2. **编辑环境变量**
```bash
# 编辑 .env 文件，设置必要的环境变量
nano .env
```

3. **启动服务**
```bash
# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 使用 Docker 命令

1. **构建镜像**
```bash
docker build -t midscene-server .
```

2. **运行容器**
```bash
docker run -d \
  --name midscene-server \
  -p 3000:3000 \
  -e OPENAI_API_KEY=your_api_key \
  -e OPENAI_BASE_URL=https://api.openai.com/v1 \
  -e MIDSCENE_MODEL_NAME=gpt-4 \
  midscene-server
```

## 环境变量

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | `production` | 否 |
| `PORT` | 服务器端口 | `3000` | 否 |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - | 是 |
| `OPENAI_BASE_URL` | OpenAI API 基础 URL | `https://api.openai.com/v1` | 否 |
| `MIDSCENE_MODEL_NAME` | 使用的模型名称 | - | 是 |
| `DATABASE_URL` | 数据库连接 URL | - | 否 |

## API 端点

- `GET /` - 服务信息
- `GET /health` - 健康检查
- `GET /browser/demo` - 浏览器演示

## 开发

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 健康检查

服务提供健康检查端点 `/health`，返回服务状态信息：

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```
