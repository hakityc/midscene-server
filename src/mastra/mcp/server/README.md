# MCP Server 配置

这个目录包含了 Midscene 浏览器自动化功能的 MCP Server 配置，遵循 Mastra 标准做法。

## 文件结构

```text
src/mastra/mcp/server/
├── index.ts           # MCP Server 主配置
├── start-server.ts    # 启动脚本
├── http-server.ts     # HTTP 服务器集成示例
└── README.md          # 本文档
```

## 功能特性

### 暴露的工具

- `browserTool` - 浏览器自动化工具，支持页面操作和截图

### 暴露的代理

- `browserAgent` - 浏览器自动化代理，可以理解自然语言指令并执行浏览器操作

## 启动方式

### 1. stdio 传输（命令行工具）

```bash
npm run mcp:server:stdio
```

### 2. HTTP 服务器（SSE 传输）

```bash
npm run mcp:server:http
```

服务器将在 `http://localhost:3001` 启动，提供以下端点：

- `/sse` - Server-Sent Events 端点
- `/mcp` - HTTP 端点
- `/health` - 健康检查
- `/info` - 服务器信息
- `/tools` - 可用工具列表

## 使用示例

### 作为 MCP 客户端连接

```typescript
import { MCPClient } from '@mastra/mcp';

const mcp = new MCPClient({
  servers: {
    midscene: {
      url: new URL('http://localhost:3001/sse'),
    },
  },
});

// 获取工具
const tools = await mcp.getTools();

// 使用工具
const result = await tools.midscene_browserTool.execute({
  action: 'screenshot',
  url: 'https://example.com'
});
```

### 在 Mastra 代理中使用

```typescript
import { Agent } from '@mastra/core/agent';
import { mcp } from './mcp/client';

const agent = new Agent({
  name: 'Browser Agent',
  instructions: '你是一个浏览器自动化助手',
  model: openai('gpt-4o'),
  tools: await mcp.getTools(),
});
```

## 配置说明

### MCPServer 配置参数

- `name`: 服务器名称
- `version`: 版本号
- `description`: 服务器描述
- `tools`: 要暴露的工具对象
- `agents`: 要暴露的代理对象（可选）
- `repository`: 仓库信息（可选）
- `releaseDate`: 发布日期（可选）
- `isLatest`: 是否为最新版本（可选）
- `packageCanonical`: 包格式（可选）
- `packages`: 包信息列表（可选）

### 环境变量

- `MCP_SERVER_PORT`: HTTP 服务器端口（默认：3001）

## 开发指南

### 添加新工具

1. 在 `src/mastra/tools/` 中创建新工具
2. 在 `src/mastra/mcp/server/index.ts` 中导入并添加到 `tools` 对象

### 添加新代理

1. 在 `src/mastra/agents/` 中创建新代理
2. 确保代理有 `description` 属性
3. 在 `src/mastra/mcp/server/index.ts` 中导入并添加到 `agents` 对象

### 自定义传输方式

参考 `http-server.ts` 示例，你可以将 MCP Server 集成到任何 HTTP 服务器框架中。

## 故障排除

### 常见问题

1. **端口冲突**: 修改 `MCP_SERVER_PORT` 环境变量
2. **工具未暴露**: 检查工具是否正确导入和配置
3. **代理未暴露**: 确保代理有 `description` 属性

### 调试

- 查看控制台日志
- 访问 `/health` 端点检查服务器状态
- 访问 `/tools` 端点查看可用工具列表

## 相关文档

- [Mastra MCP 文档](https://docs.mastra.ai/docs/tools-mcp/mcp-overview)
- [Model Context Protocol 规范](https://modelcontextprotocol.io/)
