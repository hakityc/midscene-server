# Monorepo 使用指南

本项目采用 Monorepo 架构，包含 Server 端和 Web 端两个独立应用。本文档将详细介绍两端的使用方法和开发流程。

## 📁 项目结构

```
midscene-server/
├── apps/
│   ├── server/          # 服务端应用
│   └── web/            # Web 调试工具
├── docs/               # 项目文档
├── package.json        # 根配置
└── pnpm-workspace.yaml # pnpm 工作区配置
```

---

## 🖥️ Server 端

### 概述

基于 Hono 和 Midscene 的 WebSocket 服务器，提供浏览器自动化和任务执行能力，支持 Web 端和 Windows 客户端。

### 技术栈

- **框架**: Hono
- **AI 能力**: Mastra, Midscene
- **数据库**: LibSQL
- **构建工具**: tsup
- **测试**: Vitest

### 快速开始

#### 安装依赖

```bash
# 在项目根目录
pnpm install
```

#### 开发模式

```bash
# 进入 server 目录
cd apps/server

# 启动开发服务器
pnpm dev
```

服务将运行在 `http://localhost:3000`

#### 构建

```bash
# 构建预发布版本
pnpm build:staging

# 构建生产版本
pnpm build:prod
```

#### 测试

```bash
# 运行所有测试
pnpm test

# 查看测试覆盖率
pnpm test:coverage

# 启动测试 UI
pnpm test:ui
```

### 目录结构

```
apps/server/
├── src/
│   ├── config/         # 配置文件
│   │   └── clientTypeActions.ts    # 客户端类型和支持的 Action 配置
│   ├── mastra/         # Mastra AI 集成
│   │   ├── agents/     # AI Agent 定义
│   │   ├── mcp/        # MCP 配置
│   │   └── tools/      # 工具集
│   ├── middleware/     # 中间件
│   ├── routes/         # HTTP 路由处理
│   ├── services/       # 业务服务
│   │   └── webOperateService.ts    # Web 操作服务
│   ├── types/          # 类型定义
│   │   ├── websocket.ts            # WebSocket 消息类型
│   │   └── windowsProtocol.ts      # Windows 客户端协议
│   ├── utils/          # 工具函数
│   ├── websocket/      # WebSocket 处理
│   │   ├── actions/    # Action 处理器
│   │   │   ├── web/    # Web 端 Actions
│   │   │   └── windows/# Windows 端 Actions
│   │   ├── builders/   # 消息构建器
│   │   └── handlers/   # 消息处理器
│   └── index.ts        # 入口文件
├── scripts/            # 脚本
├── data/              # 数据文件
└── midscene_run/      # Midscene 运行时文件
    ├── cache/         # 缓存
    ├── dump/          # 转储文件
    ├── log/           # 日志
    ├── output/        # 输出
    └── report/        # 报告
```

### 环境变量

创建 `.env` 文件配置以下环境变量：

```bash
# AI 配置
OPENAI_API_KEY=your_api_key
DASHSCOPE_API_KEY=your_dashscope_key

# 服务配置
PORT=3000
LOG_LEVEL=debug

# 数据库配置
DATABASE_URL=file:./data/memory.db
```

### 主要服务

#### WebSocket 服务

- **连接地址**: `ws://localhost:3000/ws`
- **管理接口**:
  - `GET /ws/stats` - 获取连接统计
  - `POST /ws/broadcast` - 广播消息

#### HTTP 路由

参考 `src/routes/` 目录下的路由定义。

### 客户端类型

Server 支持两种客户端类型，每种类型支持不同的 Action 集合：

#### Web 客户端

支持完整的浏览器自动化功能：

- `connectTab` - 连接浏览器标签页
- `ai` - 执行 AI 自然语言指令
- `aiScript` - 执行 AI YAML 脚本
- `downloadVideo` - 下载视频资源
- `siteScript` - 在网页中执行 JavaScript
- `command` - 控制服务生命周期

#### Windows 客户端

支持 Windows 桌面应用自动化：

- `ai` - 执行 Windows 桌面 AI 指令
- `aiScript` - 执行 Windows AI YAML 脚本
- `command` - 控制 Windows 服务
- `test` - 测试服务

配置文件：`src/config/clientTypeActions.ts`

---

## 🌐 Web 端

### 概述

Midscene Debug Tool - 可视化调试工具，用于调试 Midscene Server 的 WebSocket 指令，提供友好的界面构建和测试 WebSocket 消息。

### 技术栈

- **框架**: React 19 + TypeScript
- **UI**: Radix UI + Tailwind CSS
- **表单**: React Hook Form
- **状态**: React Hooks
- **工具**: uuid, date-fns
- **构建**: Vite

### 快速开始

#### 安装依赖

```bash
# 进入 web 目录
cd apps/web
pnpm install
```

#### 启动开发

```bash
# 启动 Web 开发服务器
pnpm dev
```

访问 `http://localhost:5173`

**注意**: 必须同时启动 Server 端才能正常使用！

```bash
# 在另一个终端启动 Server
cd apps/server
pnpm dev
```

#### 构建

```bash
# 生产构建
pnpm build

# 预览构建结果
pnpm preview
```

### 目录结构

```
apps/web/
├── src/
│   ├── components/
│   │   ├── ui/                    # 基础 UI 组件 (shadcn/ui)
│   │   └── debug/                 # 调试工具组件
│   │       ├── ActionSelector.tsx # Action 选择器
│   │       ├── AiScriptForm.tsx   # AI Script 表单
│   │       ├── TaskItem.tsx       # 任务项
│   │       ├── FlowActionItem.tsx # 流程动作项
│   │       ├── MessageMonitor.tsx # 消息监控
│   │       ├── HistoryPanel.tsx   # 历史记录面板
│   │       ├── TemplatePanel.tsx  # 模板面板
│   │       └── MetaForm.tsx       # 元数据表单
│   ├── hooks/
│   │   ├── useWebSocket.ts        # WebSocket 管理
│   │   └── useMessageHistory.ts   # 历史记录管理
│   ├── types/
│   │   └── debug.ts               # 类型定义
│   ├── utils/
│   │   ├── messageBuilder.ts      # 消息构建器
│   │   └── templates.ts           # 模板定义
│   ├── pages/
│   │   └── midsceneDebugPage.tsx  # 主页面
│   └── main.tsx                   # 入口文件
└── dist/                          # 构建输出
```

### 核心功能

#### 1. 可视化构建器

- 支持 7 种 Action 类型
- AI Script 流程可视化构建
- 拖拽式界面，无需手写 JSON

#### 2. 实时预览

- 表单模式 + JSON 模式双视图
- 自动生成标准格式消息
- 实时验证 JSON 格式

#### 3. 消息监控

- 实时显示 WebSocket 收发消息
- 消息分类（发送/接收/成功/错误）
- 点击展开查看详细 JSON
- 导出消息记录

#### 4. 历史记录

- 自动保存最近 10 条消息
- 一键加载历史配置
- LocalStorage 持久化

#### 5. 快速模板

- 5 个预设模板
- 一键使用模板

### 使用流程

#### 第 1 步：连接 WebSocket

- 页面加载时自动连接到 `ws://localhost:3000/ws`
- 右上角显示连接状态（绿色 = 已连接）

#### 第 2 步：选择 Action 类型

从下拉框选择要执行的 Action：

- **AI Script** - 复杂的多步骤任务流程（推荐）
- **AI (简单)** - 单一 AI 指令
- **Site Script** - 执行 JavaScript 代码
- **Download Video** - 下载视频

#### 第 3 步：构建任务

以 AI Script 为例：

1. 点击「添加任务」
2. 输入任务名称
3. 添加动作（aiTap, aiInput, sleep, aiAssert 等）
4. 配置动作参数

#### 第 4 步：发送消息

点击「发送消息」，右侧消息监控面板会显示：

- 🟢 绿色：成功
- 🔴 红色：失败
- 🔵 蓝色：信息

---

## 🔄 工作流程

### 开发流程

1. **启动 Server**

```bash
cd apps/server
pnpm dev
```

2. **启动 Web 调试工具**（可选）

```bash
cd apps/web
pnpm dev
```

3. **使用 Web 调试工具测试 WebSocket 消息**
4. **在 Server 中实现或修改 Action Handler**
5. **运行测试确保功能正常**

```bash
cd apps/server
pnpm test
```

### 添加新 Action

#### 1. 定义 Action 枚举

编辑 `apps/server/src/utils/enums.ts`：

```typescript
export enum WebSocketAction {
  // ... 现有 actions
  NEW_ACTION = 'newAction',
}
```

#### 2. 配置客户端类型支持

编辑 `apps/server/src/config/clientTypeActions.ts`：

```typescript
export const CLIENT_TYPE_ACTIONS: Record<ClientType, ActionConfig[]> = {
  web: [
    // ... 现有配置
    {
      action: WebSocketAction.NEW_ACTION,
      name: '新功能',
      description: '新功能描述',
      category: 'basic',
    },
  ],
};
```

#### 3. 创建 Action Handler

创建 `apps/server/src/websocket/actions/newAction.ts`：

```typescript
import type { MessageHandler } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { createSuccessResponse, createErrorResponse } from '../builders/messageBuilder';

export function createNewActionHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    try {
      const params = message.payload.params;
      
      // 你的业务逻辑
      const result = await processNewAction(params);
      
      const response = createSuccessResponse(
        message,
        result,
        WebSocketAction.NEW_ACTION,
      );
      send(response);
    } catch (error) {
      const response = createErrorResponse(message, error, '新功能执行失败');
      send(response);
    }
  };
}
```

#### 4. 注册 Handler

编辑 `apps/server/src/websocket/handlers/messageHandlers.ts`：

```typescript
import { createNewActionHandler } from '../actions/newAction';

export function createWebMessageHandlers() {
  return {
    // ... 现有 handlers
    [WebSocketAction.NEW_ACTION]: createNewActionHandler(),
  };
}
```

#### 5. 在 Web 端测试

使用 Web 调试工具测试新 Action。

---

## 🧪 测试

### Server 端测试

```bash
cd apps/server

# 运行所有测试
pnpm test

# 查看覆盖率
pnpm test:coverage

# 测试 UI
pnpm test:ui
```

测试文件位于 `apps/server/src/test/`

### Web 端测试

目前 Web 端主要通过手动测试，使用调试工具本身进行功能验证。

---

## 📝 常见问题

### Server 端

#### Q: WebSocket 连接失败？

A: 检查以下几点：

1. Server 是否已启动
2. 端口 3000 是否被占用
3. 防火墙设置

#### Q: AI 功能无响应？

A: 检查：

1. 环境变量中的 API Key 是否正确
2. 网络连接是否正常
3. 查看 Server 日志排查错误

#### Q: 如何查看日志？

A: 日志位于 `apps/server/midscene_run/log/` 目录

### Web 端

#### Q: 无法连接到 Server？

A: 确保：

1. Server 已启动（`cd apps/server && pnpm dev`）
2. Server 运行在 `http://localhost:3000`
3. 浏览器控制台无 CORS 错误

#### Q: 消息发送失败？

A: 检查：

1. WebSocket 连接状态（右上角指示器）
2. 消息格式是否正确（切换到 JSON 模式查看）
3. Server 日志中的错误信息

---

## 🎯 最佳实践

### Server 端

1. **错误处理**: 使用 `MessageBuilder` 构建统一的错误响应
2. **日志记录**: 使用 `wsLogger` 记录关键操作
3. **类型安全**: 充分利用 TypeScript 类型系统
4. **测试优先**: 为新功能编写测试用例

### Web 端

1. **使用模板**: 从模板开始，减少手动配置
2. **查看 JSON**: 遇到问题时切换到 JSON 模式调试
3. **导出记录**: 导出消息记录用于问题排查
4. **历史复用**: 使用历史记录快速重复测试

---

## 📚 相关文档

- [WebSocket 传值说明](./WebSocket传值说明.md)
- [Action 验证系统](./ACTION_VALIDATION_SYSTEM.md)
- [FlowAction 配置化快速参考](./FlowAction配置化快速参考.md)

---

## 🔗 资源链接

- [Hono 文档](https://hono.dev/)
- [Midscene 文档](https://midscenejs.com/)
- [React 文档](https://react.dev/)
- [Radix UI 文档](https://www.radix-ui.com/)

