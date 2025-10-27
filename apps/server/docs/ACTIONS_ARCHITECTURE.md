# WebSocket Actions 架构设计

## 概述

本文档描述了 WebSocket actions 的架构设计，包括如何区分 Web 端和 Windows 端的处理逻辑。

## 目录结构

```
src/websocket/actions/
├── web/                    # Web 端 actions
│   └── index.ts           # Web actions 导出模块
├── windows/               # Windows 端 actions
│   ├── command.ts         # Windows 命令处理
│   ├── execute.ts         # Windows AI 执行
│   ├── executeScript.ts   # Windows 脚本执行
│   └── index.ts          # Windows actions 导出模块
├── command.ts            # Web 命令处理（原文件）
├── connect.ts            # Web 标签页连接（Web 独有）
├── downloadVideo.ts      # Web 视频下载（Web 独有）
├── execute.ts            # Web AI 执行（原文件）
├── executeScript.ts      # Web 脚本执行（原文件）
├── siteScript.ts         # Web 站点脚本（Web 独有）
└── agentExecute.ts       # Agent 执行（通用）
```

## 架构设计

### 1. 模块化组织

#### Web 端模块 (`web/index.ts`)

```typescript
export { createCommandHandler } from '../command';
export { createConnectTabHandler } from '../connect';
export { createDownloadVideoHandler } from '../downloadVideo';
export { createAiHandler } from '../execute';
export { executeScriptHandler } from '../executeScript';
export { handleSiteScriptHandler } from '../siteScript';
```

**特点：**

- 重新导出现有的 Web 端 actions
- 所有操作基于 `WebOperateService`
- 支持完整的浏览器操作功能

#### Windows 端模块 (`windows/index.ts`)

```typescript
export { createWindowsCommandHandler } from './command';
export { createWindowsAiHandler } from './execute';
export { executeWindowsScriptHandler } from './executeScript';
```

**特点：**

- 独立实现 Windows 特定的处理逻辑
- 预留接口供未来集成 Windows 操作服务
- 仅支持基本的 AI 和命令操作

### 2. 处理器区分

#### 消息处理器注册 (`handlers/messageHandlers.ts`)

```typescript
// Web 端处理器
export function createWebMessageHandlers(): Partial<Record<WebSocketAction, MessageHandler>> {
  return {
    [WebSocketAction.CONNECT_TAB]: createConnectTabHandler(),
    [WebSocketAction.AI]: createWebAiHandler(),
    [WebSocketAction.AI_SCRIPT]: executeWebScriptHandler(),
    [WebSocketAction.DOWNLOAD_VIDEO]: createDownloadVideoHandler(),
    [WebSocketAction.DOWNLOAD_VIDEO_CALLBACK]: async () => {},
    [WebSocketAction.SITE_SCRIPT]: handleSiteScriptHandler(),
    [WebSocketAction.COMMAND]: createWebCommandHandler(),
  };
}

// Windows 端处理器
export function createWindowsMessageHandlers(): Partial<Record<WebSocketAction, MessageHandler>> {
  return {
    [WebSocketAction.AI]: createWindowsAiHandler(),
    [WebSocketAction.AI_SCRIPT]: executeWindowsScriptHandler(),
    [WebSocketAction.COMMAND]: createWindowsCommandHandler(),
  };
}

// 统一消息处理器工厂（使用 Proxy 动态选择）
export function createMessageHandlers() {
  const webHandlers = createWebMessageHandlers();
  const windowsHandlers = createWindowsMessageHandlers();

  return new Proxy({} as Partial<Record<WebSocketAction, MessageHandler>>, {
    get(_target, action: string | symbol) {
      return async (ctx: any, message: any) => {
        const clientType: ClientType = message?.meta?.clientType || 'web';
        const handlers = clientType === 'windows' ? windowsHandlers : webHandlers;
        const handler = handlers[action as WebSocketAction];
        
        if (handler) {
          await handler(ctx, message);
        }
      };
    },
  });
}
```

## 功能对比

### Web 端支持的操作

| 操作 | Action | 描述 | 依赖服务 |
|------|--------|------|----------|
| 连接标签页 | `CONNECT_TAB` | 连接到浏览器标签页 | WebOperateService |
| AI 执行 | `AI` | 执行 AI 指令 | WebOperateService |
| AI 脚本 | `AI_SCRIPT` | 执行 AI YAML 脚本 | WebOperateService |
| 下载视频 | `DOWNLOAD_VIDEO` | 下载视频资源 | API 调用 |
| 下载回调 | `DOWNLOAD_VIDEO_CALLBACK` | 视频下载回调 | - |
| 站点脚本 | `SITE_SCRIPT` | 执行站点 JavaScript | WebOperateService |
| 命令 | `COMMAND` | 服务控制命令 | WebOperateService |

### Windows 端支持的操作

| 操作 | Action | 描述 | 状态 |
|------|--------|------|------|
| AI 执行 | `AI` | 执行 AI 指令 | ✅ 已实现 |
| AI 脚本 | `AI_SCRIPT` | 执行 AI YAML 脚本 | ✅ 已实现 |
| 命令 | `COMMAND` | 服务控制命令 | ✅ 已实现 |

**注意：** Windows 端操作已接入 `WindowsOperateService`，支持完整的 Windows 桌面自动化功能。

## Windows 端实现指南

### 1. Windows 命令处理器 (`windows/command.ts`)

```typescript
export const createWindowsCommandHandler = (): MessageHandler => {
  return async ({ send }, message) => {
    const { meta, payload } = message;
    const command = payload.params as Command;
    const windowsOperateService = WindowsOperateService.getInstance();
    
    wsLogger.info({ ...meta, clientType: 'windows' }, '执行 Windows 服务命令');

    switch (command) {
      case Command.START:
        await windowsOperateService.start();
        wsLogger.info('Windows 服务已启动');
        break;
      case Command.STOP:
        await windowsOperateService.stop();
        wsLogger.info('Windows 服务已停止');
        break;
      case Command.RESTART:
        await windowsOperateService.stop();
        await windowsOperateService.start();
        wsLogger.info('Windows 服务已重启');
        break;
    }

    const response = createSuccessResponse(message, `Windows 服务命令执行成功: ${command}`);
    send(response);
  };
};
```

**实现要点：**

- ✅ 使用 `WindowsOperateService` 单例
- ✅ 支持 START、STOP、RESTART 命令
- ✅ 记录 `clientType: 'windows'` 用于日志跟踪
- ✅ 错误处理与 Web 端保持一致

### 2. Windows AI 处理器 (`windows/execute.ts`)

```typescript
export function createWindowsAiHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    const windowsOperateService = WindowsOperateService.getInstance();
    
    wsLogger.info({
      connectionId,
      messageId: meta.messageId,
      action: 'windows_ai_request',
      clientType: 'windows',
    }, '处理 Windows AI 请求');

    try {
      const params = payload.params;
      
      // 检查连接状态
      const isConnected = await windowsOperateService.checkAndReconnect();
      if (!isConnected) {
        const response = createErrorResponse(
          message,
          new Error('Windows 设备连接已断开，正在尝试重连中，请稍后重试'),
          'Windows 设备连接断开',
        );
        send(response);
        return;
      }

      // 监听重连事件
      const onReconnected = () => {
        const response = createSuccessResponse(
          message,
          'Windows 设备重连成功，可以继续操作',
          WebSocketAction.CALLBACK_AI_STEP,
        );
        send(response);
      };
      windowsOperateService.once('reconnected', onReconnected);

      try {
        // 执行 Windows AI 任务
        await windowsOperateService.execute(params);
        
        const response = createSuccessResponse(
          message,
          `Windows AI 处理完成`,
          WebSocketAction.AI,
        );
        send(response);
      } finally {
        // 清理事件监听器
        windowsOperateService.off('reconnected', onReconnected);
      }
    } catch (error) {
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('连接') || errorMessage.includes('connect')) {
        const response = createErrorResponse(message, error, '连接错误，正在尝试重连');
        send(response);
      } else {
        const response = createErrorResponse(message, error, 'Windows AI 处理失败');
        send(response);
      }
    }
  };
}
```

**实现要点：**

- ✅ 使用 `WindowsOperateService` 执行 AI 任务
- ✅ 支持连接状态检查和自动重连
- ✅ 监听重连事件并通知客户端
- ✅ 区分连接错误和业务错误
- ✅ 使用与 Web 端一致的消息格式

### 3. Windows 脚本处理器 (`windows/executeScript.ts`)

```typescript
export function executeWindowsScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    const windowsOperateService = WindowsOperateService.getInstance();

    try {
      // 解析参数
      const rawParams = payload?.params as unknown;
      let parsedParams: unknown = rawParams;

      if (typeof rawParams === 'string') {
        try {
          parsedParams = JSON.parse(rawParams);
        } catch {
          parsedParams = rawParams;
        }
      }

      const script = yaml.stringify(parsedParams);

      // 执行 Windows 脚本
      const scriptResult = await windowsOperateService.executeScript(
        script,
        3,
        payload.originalCmd,
      );

      // 处理执行结果
      const hasErrors = scriptResult?._hasErrors || false;
      const taskErrors = scriptResult?._taskErrors || [];

      let responseMessage = `${payload.action} 处理完成`;
      if (hasErrors && taskErrors.length > 0) {
        const errorSummary = taskErrors
          .map((err: any) => `${err.taskName}: ${err.error.message}`)
          .join('; ');
        responseMessage += ` (⚠️ 部分任务执行失败: ${errorSummary})`;
      }

      const response = createSuccessResponse(message, {
        message: responseMessage,
        result: scriptResult?.result,
        hasErrors,
        taskErrors: hasErrors ? taskErrors : undefined,
      });
      send(response);
    } catch (error) {
      const response = createErrorResponse(message, error, 'Windows 脚本执行失败');
      send(response);
    }
  };
}
```

**实现要点：**

- ✅ 使用 `WindowsOperateService.executeScript()` 执行脚本
- ✅ 支持 JSON 和 YAML 格式的脚本
- ✅ 支持兜底命令 (`originalCmd`)
- ✅ 处理部分任务失败的情况
- ✅ 返回结构化的执行结果（包含错误信息）
- ✅ 解析逻辑与 Web 端保持一致

## 使用示例

### Web 端请求

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
    "params": "打开百度并搜索 AI"
  }
}
```

**处理流程：**

1. 消息到达 → 解析 `clientType: 'web'`
2. 选择 `webHandlers` 中的 `AI` 处理器
3. 调用 `createWebAiHandler()` 创建的处理器
4. 使用 `WebOperateService` 执行操作

### Windows 端请求

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

**处理流程：**

1. 消息到达 → 解析 `clientType: 'windows'`
2. 选择 `windowsHandlers` 中的 `AI` 处理器
3. 调用 `createWindowsAiHandler()` 创建的处理器
4. 使用 Windows 特定服务执行操作（待实现）

## 扩展指南

### 添加新的 Web 端操作

1. 在 `actions/` 目录下创建新的处理器文件
2. 在 `actions/web/index.ts` 中导出
3. 在 `createWebMessageHandlers()` 中注册

```typescript
// actions/newAction.ts
export function createNewActionHandler(): MessageHandler {
  return async ({ send }, message) => {
    // 实现逻辑
  };
}

// actions/web/index.ts
export { createNewActionHandler } from '../newAction';

// handlers/messageHandlers.ts
import { createNewActionHandler } from '../actions/web';

export function createWebMessageHandlers() {
  return {
    // ... 其他处理器
    [WebSocketAction.NEW_ACTION]: createNewActionHandler(),
  };
}
```

### 添加新的 Windows 端操作

1. 在 `actions/windows/` 目录下创建新的处理器文件
2. 在 `actions/windows/index.ts` 中导出
3. 在 `createWindowsMessageHandlers()` 中注册

```typescript
// actions/windows/newAction.ts
export function createWindowsNewActionHandler(): MessageHandler {
  return async ({ send }, message) => {
    // Windows 特定实现
  };
}

// actions/windows/index.ts
export { createWindowsNewActionHandler } from './newAction';

// handlers/messageHandlers.ts
import { createWindowsNewActionHandler } from '../actions/windows';

export function createWindowsMessageHandlers() {
  return {
    // ... 其他处理器
    [WebSocketAction.NEW_ACTION]: createWindowsNewActionHandler(),
  };
}
```

## 最佳实践

### 1. 命名约定

- **Web 端：** 保持原有命名，如 `createAiHandler`
- **Windows 端：** 添加 `Windows` 前缀，如 `createWindowsAiHandler`
- **通用处理器：** 不添加前缀，可以被两端共享

### 2. 日志记录

所有处理器都应该：

- 记录 `clientType` 字段
- 记录 `messageId` 用于追踪
- 使用结构化日志格式

```typescript
wsLogger.info({
  connectionId,
  messageId: meta.messageId,
  action: payload.action,
  clientType: meta.clientType || 'web',
}, '处理请求');
```

### 3. 错误处理

- 使用统一的错误响应格式
- 记录详细的错误信息
- 区分连接错误和业务错误

```typescript
try {
  // 业务逻辑
} catch (error) {
  wsLogger.error({
    connectionId,
    error,
    messageId: meta.messageId,
  }, '处理失败');
  
  const response = createErrorResponse(message, error, '处理失败');
  send(response);
}
```

### 4. 进度回调

对于长时间运行的操作，应该发送进度回调：

```typescript
// 发送进度
const progressResponse = createSuccessResponseWithMeta(
  message,
  { stage: 'processing', tip: '正在处理...' },
  WebSocketAction.CALLBACK_AI_STEP,
);
send(progressResponse);

// 执行操作
await doLongRunningTask();

// 发送完成
const response = createSuccessResponse(message, '处理完成');
send(response);
```

### 5. 资源清理

确保在处理完成或错误时清理资源：

```typescript
const callback = createCallback();
try {
  service.on('event', callback);
  await doSomething();
} finally {
  service.off('event', callback);
}
```

## 未来规划

### 短期（1-2 周）

- [ ] 实现 Windows 操作服务 (`WindowsOperateService`)
- [ ] 完善 Windows 端的 AI 处理逻辑
- [ ] 添加 Windows 端的单元测试
- [ ] 优化错误处理和重试机制

### 中期（1-2 月）

- [ ] 添加更多 Windows 特有操作
  - 文件系统操作
  - 窗口管理
  - 键盘鼠标控制
- [ ] 实现操作录制和回放
- [ ] 添加性能监控和优化

### 长期（3-6 月）

- [ ] 支持更多客户端类型（mobile、desktop）
- [ ] 实现跨平台操作抽象层
- [ ] 添加操作编排和流程引擎
- [ ] 实现分布式任务调度

## 测试建议

### 单元测试

```typescript
describe('createWindowsAiHandler', () => {
  it('should handle windows AI request', async () => {
    const handler = createWindowsAiHandler();
    const mockContext = createMockContext();
    const mockMessage = createMockMessage('windows');
    
    await handler(mockContext, mockMessage);
    
    expect(mockContext.send).toHaveBeenCalled();
  });
});
```

### 集成测试

```typescript
describe('WebSocket Integration', () => {
  it('should route to windows handler for windows client', async () => {
    const ws = await connectWebSocket();
    
    await ws.send(JSON.stringify({
      meta: { clientType: 'windows', messageId: 'test', conversationId: 'test', timestamp: Date.now() },
      payload: { action: 'AI', params: 'test' }
    }));
    
    const response = await ws.waitForResponse();
    expect(response.meta.clientType).toBe('windows');
  });
});
```

## 相关文档

- [CLIENT_TYPE_FEATURE.md](./CLIENT_TYPE_FEATURE.md) - 客户端类型功能说明
- [WebSocket 协议文档](./WEBSOCKET_PROTOCOL.md) - WebSocket 消息格式
- [服务架构文档](./SERVICE_ARCHITECTURE.md) - 整体服务架构

## 常见问题

### Q: 为什么不直接修改现有的处理器？

A: 保持现有处理器不变有以下好处：

- 不影响现有 Web 端功能
- 便于独立测试和调试
- 代码职责更清晰
- 更容易回滚和维护

### Q: Windows 端何时会完全实现？

A: Windows 端的实现取决于 Windows 操作服务的开发进度。当前提供的是接口占位，可以根据实际需求逐步实现。

### Q: 如何添加新的客户端类型？

A: 参考 Windows 端的实现方式：

1. 在 `types/websocket.ts` 中添加新的 `ClientType`
2. 创建新的 actions 子目录
3. 在 `messageHandlers.ts` 中添加相应的处理器工厂
4. 更新 Proxy 逻辑以支持新类型

### Q: 如果某个操作 Web 和 Windows 都支持且逻辑相同怎么办？

A: 可以将共同逻辑提取为通用处理器，然后在两端都导入使用。参考 `agentExecute.ts`。
