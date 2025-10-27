# Windows Service 接入文档

## 概述

本文档详细说明了 Windows actions 如何接入 `WindowsOperateService`，以及如何使用 Windows 端的各项功能。

**更新时间：** 2025-10-13  
**状态：** ✅ 完全实现

## WindowsOperateService 简介

`WindowsOperateService` 是专门为 Windows 桌面应用设计的自动化操作服务，提供：

- 🖥️ Windows 桌面应用的 AI 自动化
- 🔌 自动连接管理和断线重连
- 📝 YAML 脚本执行
- 🎯 任务状态监控
- 📊 设备信息查询
- 📸 屏幕截图功能

### 核心特性

```typescript
class WindowsOperateService extends EventEmitter {
  // 单例模式
  public static getInstance(): WindowsOperateService;
  
  // 生命周期管理
  public async start(): Promise<void>;
  public async stop(): Promise<void>;
  public isStarted(): boolean;
  
  // AI 执行
  public async execute(prompt: string, maxRetries?: number): Promise<void>;
  public async expect(prompt: string, maxRetries?: number): Promise<void>;
  public async executeScript(yamlContent: string, maxRetries?: number, originalCmd?: string): Promise<any>;
  
  // 连接管理
  public async checkAndReconnect(): Promise<boolean>;
  public async forceReconnect(): Promise<void>;
  
  // 设备信息
  public async getDeviceInfo(): Promise<{ width: number; height: number; dpr?: number }>;
  public async screenshot(): Promise<string>;
  
  // 事件监听
  on(event: 'reconnected', listener: () => void): this;
  on(event: 'taskStartTip', listener: (tip: string) => void): this;
}
```

## Actions 接入详情

### 1. Command Handler

**文件：** `src/websocket/actions/windows/command.ts`

**功能：** 服务生命周期控制

```typescript
import { WindowsOperateService } from '../../../services/windowsOperateService';

export const createWindowsCommandHandler = (): MessageHandler => {
  return async ({ send }, message) => {
    const windowsOperateService = WindowsOperateService.getInstance();
    const command = message.payload.params as Command;
    
    switch (command) {
      case Command.START:
        await windowsOperateService.start();
        break;
      case Command.STOP:
        await windowsOperateService.stop();
        break;
      case Command.RESTART:
        await windowsOperateService.stop();
        await windowsOperateService.start();
        break;
    }
    
    send(createSuccessResponse(message, `Windows 服务命令执行成功: ${command}`));
  };
};
```

**支持的命令：**

- `START` - 启动 Windows 服务
- `STOP` - 停止 Windows 服务
- `RESTART` - 重启 Windows 服务

**使用示例：**

```json
{
  "meta": {
    "messageId": "msg_001",
    "conversationId": "conv_001",
    "timestamp": 1697184000000,
    "clientType": "windows"
  },
  "payload": {
    "action": "COMMAND",
    "params": "start"
  }
}
```

### 2. AI Execute Handler

**文件：** `src/websocket/actions/windows/execute.ts`

**功能：** 执行 AI 任务，支持自动重连

```typescript
import { WindowsOperateService } from '../../../services/windowsOperateService';

export function createWindowsAiHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const windowsOperateService = WindowsOperateService.getInstance();
    const params = message.payload.params;
    
    // 1. 检查连接状态
    const isConnected = await windowsOperateService.checkAndReconnect();
    if (!isConnected) {
      send(createErrorResponse(message, new Error('设备连接已断开'), '连接断开'));
      return;
    }
    
    // 2. 监听重连事件
    const onReconnected = () => {
      send(createSuccessResponse(message, '设备重连成功'));
    };
    windowsOperateService.once('reconnected', onReconnected);
    
    try {
      // 3. 执行 AI 任务
      await windowsOperateService.execute(params);
      send(createSuccessResponse(message, 'Windows AI 处理完成'));
    } finally {
      // 4. 清理监听器
      windowsOperateService.off('reconnected', onReconnected);
    }
  };
}
```

**关键特性：**

- ✅ 自动检查连接状态
- ✅ 支持断线重连通知
- ✅ 正确清理事件监听器
- ✅ 区分连接错误和业务错误

**使用示例：**

```json
{
  "meta": {
    "messageId": "msg_002",
    "conversationId": "conv_001",
    "timestamp": 1697184000000,
    "clientType": "windows"
  },
  "payload": {
    "action": "AI",
    "params": "打开记事本并输入 Hello World"
  }
}
```

### 3. Script Execute Handler

**文件：** `src/websocket/actions/windows/executeScript.ts`

**功能：** 执行 YAML 脚本，支持兜底命令

```typescript
import yaml from 'yaml';
import { WindowsOperateService } from '../../../services/windowsOperateService';

export function executeWindowsScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const windowsOperateService = WindowsOperateService.getInstance();
    
    // 1. 解析参数（支持 JSON 和原始字符串）
    let parsedParams = message.payload.params;
    if (typeof parsedParams === 'string') {
      try {
        parsedParams = JSON.parse(parsedParams);
      } catch {
        // 保持原始字符串
      }
    }
    
    // 2. 转换为 YAML
    const script = yaml.stringify(parsedParams);
    
    // 3. 执行脚本（支持重试和兜底命令）
    const scriptResult = await windowsOperateService.executeScript(
      script,
      3,  // 最大重试次数
      message.payload.originalCmd  // 兜底命令
    );
    
    // 4. 处理执行结果
    const hasErrors = scriptResult?._hasErrors || false;
    const taskErrors = scriptResult?._taskErrors || [];
    
    let responseMessage = '脚本执行完成';
    if (hasErrors) {
      const errorSummary = taskErrors
        .map(err => `${err.taskName}: ${err.error.message}`)
        .join('; ');
      responseMessage += ` (⚠️ 部分失败: ${errorSummary})`;
    }
    
    send(createSuccessResponse(message, {
      message: responseMessage,
      result: scriptResult?.result,
      hasErrors,
      taskErrors: hasErrors ? taskErrors : undefined,
    }));
  };
}
```

**关键特性：**

- ✅ 支持 JSON 和字符串格式
- ✅ 自动转换为 YAML
- ✅ 支持最大重试次数
- ✅ 支持兜底命令
- ✅ 处理部分任务失败

**使用示例：**

```json
{
  "meta": {
    "messageId": "msg_003",
    "conversationId": "conv_001",
    "timestamp": 1697184000000,
    "clientType": "windows"
  },
  "payload": {
    "action": "AI_SCRIPT",
    "params": {
      "tasks": [
        {
          "name": "打开应用",
          "flow": [
            { "aiAction": "点击开始菜单" },
            { "aiAction": "搜索记事本" },
            { "aiAction": "打开记事本" }
          ]
        }
      ]
    },
    "originalCmd": "打开记事本"
  }
}
```

## 连接管理机制

### 自动重连流程

```
┌─────────────────┐
│   客户端请求    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ checkAndReconnect │
└────────┬────────┘
         │
    ┌────┴────┐
    │ 已连接？ │
    └────┬────┘
         │
    ┌────┴────────────┐
    │                 │
   YES               NO
    │                 │
    ▼                 ▼
┌────────┐      ┌──────────┐
│ 执行任务│      │启动重连  │
└────────┘      └─────┬────┘
                      │
                      ▼
                ┌──────────┐
                │重连尝试  │
                │(最多5次) │
                └─────┬────┘
                      │
                 ┌────┴────┐
                 │ 重连成功？│
                 └────┬────┘
                      │
                 ┌────┴──────┐
                 │           │
                YES         NO
                 │           │
                 ▼           ▼
            ┌────────┐  ┌──────┐
            │发送通知│  │返回错误│
            └────────┘  └──────┘
                 │
                 ▼
            ┌────────┐
            │执行任务│
            └────────┘
```

### 重连事件通知

Windows 端会在重连成功时通过 `reconnected` 事件通知客户端：

```typescript
// 服务端
windowsOperateService.on('reconnected', () => {
  console.log('Windows 设备已重连');
});

// 客户端会收到通知消息
{
  "meta": { ... },
  "payload": {
    "action": "CALLBACK_AI_STEP",
    "status": "success",
    "result": "Windows 设备重连成功，可以继续操作"
  }
}
```

## 错误处理

### 连接错误

```typescript
// 检测到连接错误
if (errorMessage.includes('连接') || errorMessage.includes('connect')) {
  send(createErrorResponse(message, error, '连接错误，正在尝试重连'));
} else {
  send(createErrorResponse(message, error, '处理失败'));
}
```

### 业务错误

```typescript
try {
  await windowsOperateService.execute(params);
} catch (error) {
  // 记录详细错误信息
  wsLogger.error({
    connectionId,
    error,
    messageId: meta.messageId,
  }, 'Windows AI 处理失败');
  
  // 返回友好的错误信息
  send(createErrorResponse(message, error, 'Windows AI 处理失败'));
}
```

## 使用指南

### 1. 启动 Windows 服务

```typescript
// 方式 1: 通过 WebSocket 命令
{
  "meta": { ..., "clientType": "windows" },
  "payload": {
    "action": "COMMAND",
    "params": "start"
  }
}

// 方式 2: 直接调用
const windowsOperateService = WindowsOperateService.getInstance();
await windowsOperateService.start();
```

### 2. 执行 AI 任务

```typescript
// 发送消息
{
  "meta": { ..., "clientType": "windows" },
  "payload": {
    "action": "AI",
    "params": "打开计算器并输入 123+456="
  }
}

// 服务端处理
const windowsOperateService = WindowsOperateService.getInstance();
await windowsOperateService.execute("打开计算器并输入 123+456=");
```

### 3. 执行 YAML 脚本

```typescript
// 发送消息
{
  "meta": { ..., "clientType": "windows" },
  "payload": {
    "action": "AI_SCRIPT",
    "params": {
      "tasks": [
        {
          "name": "计算器任务",
          "flow": [
            { "aiAction": "打开计算器" },
            { "aiAction": "输入 123" },
            { "aiAction": "点击加号" },
            { "aiAction": "输入 456" },
            { "aiAction": "点击等号" }
          ]
        }
      ]
    }
  }
}

// 服务端处理
const script = yaml.stringify(params);
const result = await windowsOperateService.executeScript(script);
```

### 4. 监听服务事件

```typescript
const windowsOperateService = WindowsOperateService.getInstance();

// 监听重连事件
windowsOperateService.on('reconnected', () => {
  console.log('设备已重连');
});

// 监听任务开始提示
windowsOperateService.on('taskStartTip', (tip) => {
  console.log('任务提示:', tip);
});
```

## 性能优化

### 1. 单例模式

所有 actions 共享同一个 `WindowsOperateService` 实例，避免重复初始化：

```typescript
// ✅ 正确：使用单例
const windowsOperateService = WindowsOperateService.getInstance();

// ❌ 错误：不要创建新实例
const windowsOperateService = new WindowsOperateService();
```

### 2. 事件清理

始终在 `finally` 块中清理事件监听器：

```typescript
const onReconnected = () => { /* ... */ };
windowsOperateService.once('reconnected', onReconnected);

try {
  await windowsOperateService.execute(params);
} finally {
  windowsOperateService.off('reconnected', onReconnected);
}
```

### 3. 连接检查

在执行任务前检查连接状态，避免无效请求：

```typescript
const isConnected = await windowsOperateService.checkAndReconnect();
if (!isConnected) {
  // 提前返回错误，不执行后续操作
  return;
}
```

## 调试技巧

### 1. 启用详细日志

```typescript
// 设置日志级别
serviceLogger.level = 'debug';

// 查看连接状态
console.log('服务状态:', windowsOperateService.isStarted());
console.log('Agent 状态:', windowsOperateService.agent);
```

### 2. 监控重连尝试

```typescript
windowsOperateService.on('reconnected', () => {
  console.log('重连成功，时间:', new Date().toISOString());
});
```

### 3. 追踪任务执行

```typescript
windowsOperateService.on('taskStartTip', (tip) => {
  console.log(`[${new Date().toISOString()}] 任务提示:`, tip);
});
```

## 常见问题

### Q1: Windows 服务启动失败怎么办？

**A:** 检查以下几点：

1. Windows 客户端是否已连接
2. WindowsClientConnectionManager 是否正常运行
3. 查看日志中的详细错误信息
4. 尝试强制重连：`await windowsOperateService.forceReconnect()`

### Q2: 如何处理长时间运行的任务？

**A:** 使用脚本模式，可以监控每个步骤的执行状态：

```typescript
const result = await windowsOperateService.executeScript(script);
if (result._hasErrors) {
  // 处理部分失败的情况
  console.log('失败的任务:', result._taskErrors);
}
```

### Q3: 如何确保连接稳定性？

**A:** 系统已内置自动重连机制：

- 最多自动重连 5 次
- 重连间隔 5 秒
- 每次请求前自动检查连接状态

### Q4: 可以同时处理多个请求吗？

**A:** 建议串行处理，因为 Windows 设备通常一次只能执行一个任务。如果需要并发，考虑使用队列机制。

### Q5: 如何获取设备信息？

**A:** 使用内置方法：

```typescript
const deviceInfo = await windowsOperateService.getDeviceInfo();
console.log('屏幕尺寸:', deviceInfo.width, 'x', deviceInfo.height);

const screenshot = await windowsOperateService.screenshot();
console.log('截图 Base64:', screenshot);
```

## 相关文档

- [ACTIONS_ARCHITECTURE.md](./ACTIONS_ARCHITECTURE.md) - Actions 架构设计
- [CLIENT_TYPE_FEATURE.md](./CLIENT_TYPE_FEATURE.md) - 客户端类型功能
- [CHANGELOG_CLIENT_TYPE.md](./CHANGELOG_CLIENT_TYPE.md) - 变更日志
- [windowsOperateService.ts](../src/services/windowsOperateService.ts) - 服务源码

## 总结

Windows Service 接入已完成，主要特性包括：

- ✅ 完整的生命周期管理
- ✅ 自动连接检查和重连
- ✅ 事件通知机制
- ✅ 错误处理和日志记录
- ✅ YAML 脚本执行
- ✅ 兜底命令支持
- ✅ 资源清理机制

所有功能已测试验证，可以投入生产使用。

---

**维护者：** 开发团队  
**最后更新：** 2025-10-13  
**状态：** ✅ 生产就绪
