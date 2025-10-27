# WebSocket 客户端类型区分功能 - 变更日志

## 变更概述

本次更新为 WebSocket 消息系统添加了客户端类型区分功能，支持 Web 端和 Windows 端使用不同的处理逻辑。

**更新日期：** 2025-10-13

## 主要变更

### 1. 类型系统更新

**文件：** `src/types/websocket.ts`

**变更内容：**

- 新增 `ClientType` 类型定义：`'web' | 'windows'`
- 在 `WsInboundMeta` 接口中添加 `clientType?: ClientType` 字段
- 默认值为 `'web'`，保持向后兼容

```typescript
export type ClientType = 'web' | 'windows';

export interface WsInboundMeta {
  messageId: string;
  conversationId: string;
  timestamp: number;
  clientType?: ClientType; // 新增字段
}
```

### 2. Actions 架构重构

**目录结构变更：**

```
src/websocket/actions/
├── web/                    # 新增：Web 端 actions 模块
│   └── index.ts
├── windows/               # 新增：Windows 端 actions 模块
│   ├── command.ts
│   ├── execute.ts
│   ├── executeScript.ts
│   └── index.ts
├── README.md              # 新增：Actions 使用指南
└── [现有文件保持不变]
```

**新增文件：**

1. **`actions/web/index.ts`**
   - Web 端 actions 统一导出模块
   - 重新导出现有的 Web 处理器

2. **`actions/windows/command.ts`**
   - Windows 端命令处理器
   - 预留 Windows 服务接口

3. **`actions/windows/execute.ts`**
   - Windows 端 AI 执行处理器
   - 支持进度回调机制

4. **`actions/windows/executeScript.ts`**
   - Windows 端脚本执行处理器
   - 支持 JSON/YAML 格式解析

5. **`actions/windows/index.ts`**
   - Windows 端 actions 统一导出模块

### 3. 消息处理器更新

**文件：** `src/websocket/handlers/messageHandlers.ts`

**变更内容：**

1. **导入更新**

   ```typescript
   // 新增 Web 端导入
   import {
     createCommandHandler as createWebCommandHandler,
     createAiHandler as createWebAiHandler,
     // ... 其他 Web 处理器
   } from '../actions/web';

   // 新增 Windows 端导入
   import {
     createWindowsCommandHandler,
     createWindowsAiHandler,
     executeWindowsScriptHandler,
   } from '../actions/windows';
   ```

2. **处理器工厂更新**
   - `createWebMessageHandlers()` - 使用 Web actions
   - `createWindowsMessageHandlers()` - 使用 Windows actions
   - `createMessageHandlers()` - 统一处理器工厂（使用 Proxy）

3. **动态选择机制**

   ```typescript
   export function createMessageHandlers() {
     const webHandlers = createWebMessageHandlers();
     const windowsHandlers = createWindowsMessageHandlers();

     return new Proxy({}, {
       get(_target, action) {
         return async (ctx, message) => {
           const clientType = message?.meta?.clientType || 'web';
           const handlers = clientType === 'windows' ? windowsHandlers : webHandlers;
           const handler = handlers[action];
           if (handler) {
             await handler(ctx, message);
           }
         };
       },
     });
   }
   ```

### 4. WebSocket 连接处理更新

**文件：** `src/websocket/index.ts`

**变更内容：**

- 更新导入语句，使用新的 `createMessageHandlers()` 函数
- 处理器创建逻辑保持不变，自动支持客户端类型区分

```typescript
import { createMessageHandlers } from './handlers/messageHandlers';

export const setupWebSocket = (app: Hono) => {
  const handlers = createMessageHandlers(); // 自动支持 clientType
  // ... 其余代码保持不变
};
```

## 新增文档

### 1. CLIENT_TYPE_FEATURE.md

- 客户端类型功能详细说明
- 使用示例
- 技术实现细节
- 测试建议

### 2. ACTIONS_ARCHITECTURE.md

- Actions 架构设计文档
- 目录结构说明
- 实现指南
- 最佳实践
- 未来规划

### 3. actions/README.md

- Actions 使用快速指南
- 添加新处理器的步骤
- 代码模式和示例
- 常见问题

### 4. CHANGELOG_CLIENT_TYPE.md

- 本文档，变更日志

## 功能对比

### Web 端支持的操作（7 个）

| 操作 | Action | 实现状态 |
|------|--------|---------|
| 连接标签页 | `CONNECT_TAB` | ✅ 完全实现 |
| AI 执行 | `AI` | ✅ 完全实现 |
| AI 脚本 | `AI_SCRIPT` | ✅ 完全实现 |
| 下载视频 | `DOWNLOAD_VIDEO` | ✅ 完全实现 |
| 下载回调 | `DOWNLOAD_VIDEO_CALLBACK` | ✅ 完全实现 |
| 站点脚本 | `SITE_SCRIPT` | ✅ 完全实现 |
| 命令 | `COMMAND` | ✅ 完全实现 |

### Windows 端支持的操作（3 个）

| 操作 | Action | 实现状态 |
|------|--------|---------|
| AI 执行 | `AI` | ✅ 完全实现 |
| AI 脚本 | `AI_SCRIPT` | ✅ 完全实现 |
| 命令 | `COMMAND` | ✅ 完全实现 |

**注意：** Windows 端处理器已完全接入 `WindowsOperateService`，支持完整的 Windows 桌面自动化。

## 向后兼容性

✅ **完全向后兼容**

- 所有现有的 Web 客户端无需修改
- 未指定 `clientType` 的消息自动使用 Web 处理器
- 现有的 action 文件位置和接口保持不变
- 不会影响任何现有功能

## 使用示例

### Web 端消息（向后兼容）

```json
{
  "meta": {
    "messageId": "msg_123",
    "conversationId": "conv_456",
    "timestamp": 1234567890
  },
  "payload": {
    "action": "AI",
    "params": "打开百度"
  }
}
```

**处理：** 自动使用 Web 处理器

### Web 端消息（显式指定）

```json
{
  "meta": {
    "messageId": "msg_123",
    "conversationId": "conv_456",
    "timestamp": 1234567890,
    "clientType": "web"
  },
  "payload": {
    "action": "AI",
    "params": "打开百度"
  }
}
```

**处理：** 使用 Web 处理器

### Windows 端消息

```json
{
  "meta": {
    "messageId": "msg_456",
    "conversationId": "conv_789",
    "timestamp": 1234567890,
    "clientType": "windows"
  },
  "payload": {
    "action": "AI",
    "params": "打开记事本"
  }
}
```

**处理：** 使用 Windows 处理器

## 技术亮点

### 1. Proxy 模式

使用 JavaScript Proxy 实现动态处理器选择，避免在每个处理器中重复判断逻辑。

**优势：**

- 代码简洁
- 易于扩展
- 性能优化（处理器实例复用）

### 2. 模块化设计

通过 `web/` 和 `windows/` 子目录组织代码，职责清晰。

**优势：**

- 便于维护
- 易于测试
- 支持独立开发

### 3. 类型安全

完整的 TypeScript 类型定义，编译时检查。

**优势：**

- 减少运行时错误
- 更好的 IDE 支持
- 代码自文档化

## 测试建议

### 单元测试

```typescript
describe('createMessageHandlers', () => {
  it('should use web handler for web client', async () => {
    const handlers = createMessageHandlers();
    const mockMessage = {
      meta: { clientType: 'web', messageId: 'test', conversationId: 'test', timestamp: Date.now() },
      payload: { action: 'AI', params: 'test' },
    };
    // 测试逻辑
  });

  it('should use windows handler for windows client', async () => {
    const handlers = createMessageHandlers();
    const mockMessage = {
      meta: { clientType: 'windows', messageId: 'test', conversationId: 'test', timestamp: Date.now() },
      payload: { action: 'AI', params: 'test' },
    };
    // 测试逻辑
  });
});
```

### 集成测试

```typescript
describe('WebSocket Integration', () => {
  it('should route messages based on clientType', async () => {
    const ws = await connectWebSocket();
    
    // 发送 Web 消息
    await ws.send(JSON.stringify({ 
      meta: { clientType: 'web', ...meta },
      payload: { action: 'AI', params: 'test' }
    }));
    
    // 验证响应
    const response1 = await ws.waitForResponse();
    expect(response1).toBeDefined();
    
    // 发送 Windows 消息
    await ws.send(JSON.stringify({ 
      meta: { clientType: 'windows', ...meta },
      payload: { action: 'AI', params: 'test' }
    }));
    
    // 验证响应
    const response2 = await ws.waitForResponse();
    expect(response2).toBeDefined();
  });
});
```

## 最新更新（2025-10-13）

### ✅ Windows Service 接入完成

所有 Windows actions 已成功接入 `WindowsOperateService`：

1. **`windows/command.ts`**
   - ✅ 接入 WindowsOperateService
   - ✅ 支持 START、STOP、RESTART 命令
   - ✅ 完整的错误处理

2. **`windows/execute.ts`**
   - ✅ 接入 WindowsOperateService.execute()
   - ✅ 支持连接状态检查和自动重连
   - ✅ 监听重连事件并通知客户端
   - ✅ 区分连接错误和业务错误

3. **`windows/executeScript.ts`**
   - ✅ 接入 WindowsOperateService.executeScript()
   - ✅ 支持 YAML 脚本执行
   - ✅ 支持兜底命令
   - ✅ 处理部分任务失败情况
   - ✅ 返回结构化执行结果

### Windows 端功能特性

- ✅ **连接管理**：自动检测连接状态，支持断线重连
- ✅ **事件通知**：通过 EventEmitter 通知重连状态
- ✅ **错误处理**：区分连接错误和业务错误，提供友好的错误提示
- ✅ **资源清理**：正确清理事件监听器，避免内存泄漏
- ✅ **兜底机制**：脚本执行失败时支持兜底命令

## 未来计划

### 短期（1-2 周）

- [ ] 添加单元测试覆盖
- [ ] 添加集成测试
- [ ] 优化重连机制
- [ ] 性能监控和优化

### 中期（1-2 月）

- [ ] 添加更多 Windows 操作
- [ ] 实现操作录制功能
- [ ] 性能监控和优化
- [ ] 添加集成测试

### 长期（3-6 月）

- [ ] 支持更多客户端类型（mobile、desktop）
- [ ] 实现跨平台抽象层
- [ ] 添加操作编排引擎
- [ ] 分布式任务调度

## 迁移指南

### 对于现有 Web 客户端

**无需任何修改**，现有客户端继续正常工作。

### 对于新 Windows 客户端

在消息的 `meta` 字段中添加 `clientType: 'windows'`：

```typescript
const message = {
  meta: {
    messageId: generateId(),
    conversationId: conversationId,
    timestamp: Date.now(),
    clientType: 'windows', // 添加这一行
  },
  payload: {
    action: 'AI',
    params: '你的指令',
  },
};
```

### 对于服务端开发者

1. **添加新的 Web 操作**
   - 在 `actions/` 目录创建处理器
   - 在 `actions/web/index.ts` 导出
   - 在 `createWebMessageHandlers()` 注册

2. **添加新的 Windows 操作**
   - 在 `actions/windows/` 目录创建处理器
   - 在 `actions/windows/index.ts` 导出
   - 在 `createWindowsMessageHandlers()` 注册

详细步骤参考 [actions/README.md](../src/websocket/actions/README.md)

## 相关链接

- [CLIENT_TYPE_FEATURE.md](./CLIENT_TYPE_FEATURE.md) - 功能详细说明
- [ACTIONS_ARCHITECTURE.md](./ACTIONS_ARCHITECTURE.md) - 架构设计文档
- [actions/README.md](../src/websocket/actions/README.md) - Actions 使用指南

## 问题反馈

如有问题或建议，请通过以下方式反馈：

- 创建 Issue
- 联系开发团队
- 查阅相关文档

---

**维护者：** 开发团队  
**最后更新：** 2025-10-13
