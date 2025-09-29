# MidScene Server 部署说明

## 环境要求
- Node.js 18+
- npm 或 yarn

## 快速部署

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.sample .env
# 编辑 .env 文件，设置必要的环境变量
```

### 3. 启动服务
```bash
npm start
```

## 环境变量配置

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `PORT` | 服务端口 | `3000` | 否 |
| `NODE_ENV` | 运行环境 | `production` | 否 |
| `OPENAI_API_KEY` | AI 模型 API 密钥 | - | 是 |
| `OPENAI_BASE_URL` | AI 模型 API 基础 URL | - | 是 |
| `MIDSCENE_MODEL_NAME` | 模型名称 | - | 是 |

## 支持的模型

### 国内模型
- **阿里云通义千问**：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- **字节跳动豆包**：`https://ark.cn-beijing.volces.com/api/v3`
- **百度文心一言**：`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat`
- **智谱AI GLM**：`https://open.bigmodel.cn/api/paas/v4`

### 国外模型
- **OpenAI GPT 系列**：`https://api.openai.com/v1`
- **Anthropic Claude 系列**
- **Google Gemini 系列**

## 模型配置示例

### 通义千问
```bash
OPENAI_API_KEY=your_qwen_api_key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MIDSCENE_MODEL_NAME=qwen-plus
```

### 豆包
```bash
OPENAI_API_KEY=your_doubao_api_key
OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
MIDSCENE_MODEL_NAME=ep-20241220123456-abcdef
```

## 健康检查

访问 `http://localhost:3000/health` 检查服务状态

## API 端点

- `GET /` - 服务信息
- `GET /health` - 健康检查
- `GET /browser/demo` - 浏览器演示

## 故障排除

### 端口被占用
```bash
# 检查端口占用
lsof -i :3000

# 杀掉占用进程
kill -9 <PID>
```

### 环境变量未设置
确保 `.env` 文件存在且包含必要的环境变量。

### 模型连接失败
检查 API 密钥和基础 URL 是否正确配置。

## 日志查看

服务启动后会在控制台输出日志信息，包括：
- 模型配置信息
- 服务启动状态
- 错误信息

## 支持

如有问题，请检查：
1. Node.js 版本是否为 18+
2. 环境变量是否正确配置
3. 网络连接是否正常
4. API 密钥是否有效
