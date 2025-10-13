# WebSocket Actions

本目录包含所有 WebSocket 消息的处理器实现，按客户端类型组织。

## 目录结构

```text
actions/
├── web/              # Web 端 actions（基于浏览器）
│   └── index.ts     # Web actions 导出
├── windows/         # Windows 端 actions（基于桌面）
│   ├── command.ts
│   ├── execute.ts
│   ├── executeScript.ts
│   └── index.ts
├── command.ts       # Web 命令处理
├── connect.ts       # Web 标签页连接
├── downloadVideo.ts # Web 视频下载
├── execute.ts       # Web AI 执行
├── executeScript.ts # Web 脚本执行
├── siteScript.ts    # Web 站点脚本
└── agentExecute.ts  # Agent 执行（通用）
```

## 快速开始

### 使用现有处理器

处理器通过 `messageHandlers.ts` 自动根据 `clientType` 选择：

```typescript
// 在 handlers/messageHandlers.ts 中
import { createWebMessageHandlers, createWindowsMessageHandlers } from './messageHandlers';

// Web 端消息会自动使用 web actions
// Windows 端消息会自动使用 windows actions
```

### 添加新的 Web 处理器

创建处理器文件：

```typescript
// actions/myNewAction.ts
import type { MessageHandler } from '../../types/websocket';
import { createSuccessResponse, createErrorResponse } from '../builders/messageBuilder';

export function createMyNewActionHandler(): MessageHandler {
  return async ({ send }, message) => {
    try {
      // 实现逻辑
      const response = createSuccessResponse(message, '处理完成');
      send(response);
    } catch (error) {
      const response = createErrorResponse(message, error, '处理失败');
      send(response);
    }
  };
}
```

在 `web/index.ts` 中导出：

```typescript
export { createMyNewActionHandler } from '../myNewAction';
```

在 `handlers/messageHandlers.ts` 中注册：

```typescript
import { createMyNewActionHandler } from '../actions/web';

export function createWebMessageHandlers() {
  return {
    // ... 其他处理器
    [WebSocketAction.MY_NEW_ACTION]: createMyNewActionHandler(),
  };
}
```

### 添加新的 Windows 处理器

创建处理器文件：

```typescript
// actions/windows/myNewAction.ts
import type { MessageHandler } from '../../../types/websocket';

export function createWindowsMyNewActionHandler(): MessageHandler {
  return async ({ send }, message) => {
    // Windows 特定实现
  };
}
```

在 `windows/index.ts` 中导出：

```typescript
export { createWindowsMyNewActionHandler } from './myNewAction';
```

在 `handlers/messageHandlers.ts` 中注册：

```typescript
import { createWindowsMyNewActionHandler } from '../actions/windows';

export function createWindowsMessageHandlers() {
  return {
    // ... 其他处理器
    [WebSocketAction.MY_NEW_ACTION]: createWindowsMyNewActionHandler(),
  };
}
```

## 处理器模式

### 基本处理器

```typescript
export function createHandler(): MessageHandler {
  return async ({ connectionId, ws, send }, message) => {
    const { meta, payload } = message;
    
    try {
      // 处理逻辑
      const result = await doSomething(payload.params);
      
      const response = createSuccessResponse(message, result);
      send(response);
    } catch (error) {
      wsLogger.error({ error, messageId: meta.messageId }, '处理失败');
      const response = createErrorResponse(message, error, '处理失败');
      send(response);
    }
  };
}
```

### 带进度回调的处理器

```typescript
export function createHandler(): MessageHandler {
  return async ({ send }, message) => {
    try {
      // 发送进度
      const progressResponse = createSuccessResponseWithMeta(
        message,
        { stage: 'processing', tip: '正在处理...' },
        WebSocketAction.CALLBACK_AI_STEP,
      );
      send(progressResponse);
      
      // 执行操作
      const result = await doLongRunningTask();
      
      // 发送完成
      const response = createSuccessResponse(message, result);
      send(response);
    } catch (error) {
      const response = createErrorResponse(message, error, '处理失败');
      send(response);
    }
  };
}
```

### 带资源清理的处理器

```typescript
export function createHandler(): MessageHandler {
  return async ({ send }, message) => {
    const callback = createCallback(send, message);
    
    try {
      service.onTaskTip(callback);
      
      await doSomething();
      
      const response = createSuccessResponse(message, '处理完成');
      send(response);
    } catch (error) {
      const response = createErrorResponse(message, error, '处理失败');
      send(response);
    } finally {
      // 清理资源
      service.offTaskTip(callback);
    }
  };
}
```

## 客户端类型区分

### Web 端特点

- 使用 `WebOperateService`
- 支持浏览器操作（标签页、脚本等）
- 支持完整的 AI 功能
- 支持视频下载等扩展功能

**支持的操作：**

- `CONNECT_TAB` - 连接浏览器标签页
- `AI` - AI 执行
- `AI_SCRIPT` - AI 脚本执行
- `DOWNLOAD_VIDEO` - 下载视频
- `SITE_SCRIPT` - 站点脚本
- `COMMAND` - 服务命令

### Windows 端特点

- 使用 Windows 特定服务（待实现）
- 支持桌面应用操作
- 支持基本的 AI 功能
- 预留接口供未来扩展

**支持的操作：**

- `AI` - AI 执行
- `AI_SCRIPT` - AI 脚本执行
- `COMMAND` - 服务命令

## 最佳实践

### 1. 错误处理

始终使用 try-catch 并返回统一格式的错误响应：

```typescript
try {
  // 业务逻辑
} catch (error) {
  wsLogger.error({ error, messageId: meta.messageId }, '处理失败');
  const response = createErrorResponse(message, error, '处理失败');
  send(response);
}
```

### 2. 日志记录

记录关键信息用于调试和监控：

```typescript
wsLogger.info({
  connectionId,
  messageId: meta.messageId,
  action: payload.action,
  clientType: meta.clientType || 'web',
}, '处理请求');
```

### 3. 资源清理

确保在 finally 块中清理资源：

```typescript
try {
  // 注册回调
  service.on('event', callback);
} finally {
  // 清理回调
  service.off('event', callback);
}
```

### 4. 类型安全

使用 TypeScript 类型确保类型安全：

```typescript
import type { MessageHandler } from '../../types/websocket';

export function createHandler(): MessageHandler {
  return async (ctx, message) => {
    // TypeScript 会检查类型
  };
}
```

## 测试

### 单元测试示例

```typescript
import { createHandler } from './myAction';

describe('createHandler', () => {
  it('should handle message successfully', async () => {
    const mockSend = vi.fn();
    const mockContext = {
      connectionId: 'test',
      ws: {},
      send: mockSend,
    };
    const mockMessage = {
      meta: { messageId: 'test', conversationId: 'test', timestamp: Date.now() },
      payload: { action: 'TEST', params: 'test' },
    };
    
    const handler = createHandler();
    await handler(mockContext, mockMessage);
    
    expect(mockSend).toHaveBeenCalled();
  });
});
```

## 文档

详细文档请参考：

- [ACTIONS_ARCHITECTURE.md](../../../docs/ACTIONS_ARCHITECTURE.md) - Actions 架构详细设计
- [CLIENT_TYPE_FEATURE.md](../../../docs/CLIENT_TYPE_FEATURE.md) - 客户端类型功能说明

## 常见问题

**Q: 如何确定应该创建 Web 还是 Windows 处理器？**

A: 如果操作涉及浏览器（标签页、DOM、脚本等），创建 Web 处理器。如果操作涉及桌面应用或系统级操作，创建 Windows 处理器。

**Q: 可以共享处理器吗？**

A: 可以。如果逻辑完全相同，可以创建通用处理器并在两端都导入。

**Q: Windows 处理器何时会完全实现？**

A: Windows 处理器当前是占位实现，需要等待 Windows 操作服务开发完成后才能完整实现。

**Q: 如何添加进度回调？**

A: 使用 `createSuccessResponseWithMeta` 发送进度信息，action 使用 `CALLBACK_AI_STEP`。
