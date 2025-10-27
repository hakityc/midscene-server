# WebSocket 客户端类型区分功能

## 概述

本文档介绍了 WebSocket 消息中新增的 `clientType` 字段，用于区分消息来源是 web 端还是 windows 端，并根据不同的客户端类型使用相应的消息处理器。

## 主要变更

### 1. 类型定义更新

在 `src/types/websocket.ts` 中新增了客户端类型定义：

```typescript
export type ClientType = 'web' | 'windows';

export interface WsInboundMeta {
  messageId: string;
  conversationId: string;
  timestamp: number;
  clientType?: ClientType; // 客户端类型：web 或 windows，不传默认为 web
}
```

**特性：**

- `clientType` 字段为可选字段
- 不传该字段时，默认值为 `'web'`
- 支持的值：`'web'` | `'windows'`

### 2. 消息处理器工厂函数

在 `src/websocket/handlers/messageHandlers.ts` 中新增了统一的消息处理器创建函数：

```typescript
export function createMessageHandlers() {
  const webHandlers = createWebMessageHandlers();
  const windowsHandlers = createWindowsMessageHandlers();

  // 返回一个代理对象，根据 clientType 动态选择处理器
  return new Proxy({} as Partial<Record<WebSocketAction, MessageHandler>>, {
    get(_target, action: string | symbol) {
      return async (ctx: any, message: any) => {
        // 获取客户端类型，默认为 web
        const clientType: ClientType = message?.meta?.clientType || 'web';

        // 根据客户端类型选择对应的 handlers
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

**工作原理：**

1. 使用 `Proxy` 实现动态处理器选择
2. 每次处理消息时，从消息的 `meta.clientType` 字段获取客户端类型
3. 根据客户端类型选择对应的处理器集合（web 或 windows）
4. 执行相应的处理器函数

### 3. WebSocket 连接处理

在 `src/websocket/index.ts` 中使用新的消息处理器工厂：

```typescript
import { createMessageHandlers } from './handlers/messageHandlers';

export const setupWebSocket = (app: Hono) => {
  // ...
  const handlers = createMessageHandlers();
  // ...
}
```

## 使用示例

### Web 端消息（默认）

```json
{
  "meta": {
    "messageId": "msg_123",
    "conversationId": "conv_456",
    "timestamp": 1234567890
  },
  "payload": {
    "action": "AI",
    "params": "..."
  }
}
```

或明确指定：

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
    "params": "..."
  }
}
```

### Windows 端消息

```json
{
  "meta": {
    "messageId": "msg_123",
    "conversationId": "conv_456",
    "timestamp": 1234567890,
    "clientType": "windows"
  },
  "payload": {
    "action": "AI",
    "params": "..."
  }
}
```

## 处理器差异

### Web 端处理器（createWebMessageHandlers）

支持的操作：

- `CONNECT_TAB` - 连接浏览器标签页
- `AI` - AI 执行
- `AI_SCRIPT` - AI 脚本执行
- `DOWNLOAD_VIDEO` - 下载视频
- `DOWNLOAD_VIDEO_CALLBACK` - 下载视频回调
- `SITE_SCRIPT` - 站点脚本
- `COMMAND` - 命令执行

### Windows 端处理器（createWindowsMessageHandlers）

支持的操作：

- `AI` - AI 执行
- `AI_SCRIPT` - AI 脚本执行
- `COMMAND` - 命令执行

## 向后兼容性

- ✅ 完全向后兼容：所有未指定 `clientType` 的现有消息将自动使用 web 端处理器
- ✅ 无需修改现有客户端代码
- ✅ 新客户端可以通过添加 `clientType` 字段来启用 windows 端处理

## 技术实现细节

### Proxy 模式的优势

1. **延迟执行**：处理器的选择在消息到达时动态决定，而不是在初始化时
2. **代码简洁**：避免了在每个处理器中重复判断逻辑
3. **易于扩展**：未来可以轻松添加更多客户端类型（如 mobile、desktop 等）
4. **性能优化**：处理器实例在初始化时创建一次，后续重复使用

### 默认值处理

```typescript
const clientType: ClientType = message?.meta?.clientType || 'web';
```

这种实现方式确保：

- `undefined` → 'web'
- `null` → 'web'
- 空字符串 → 'web'
- 其他任何 falsy 值 → 'web'

## 测试建议

### 单元测试

1. 测试未指定 `clientType` 时使用 web 处理器
2. 测试明确指定 `clientType: 'web'` 时使用 web 处理器
3. 测试指定 `clientType: 'windows'` 时使用 windows 处理器
4. 测试无效的 `clientType` 值的处理

### 集成测试

1. 从 web 客户端发送消息，验证使用正确的处理器
2. 从 windows 客户端发送消息，验证使用正确的处理器
3. 验证处理器差异（如 web 端独有的 CONNECT_TAB 操作）

## 未来扩展

可以轻松添加更多客户端类型：

```typescript
export type ClientType = 'web' | 'windows' | 'mobile' | 'desktop';

export function createMessageHandlers() {
  const webHandlers = createWebMessageHandlers();
  const windowsHandlers = createWindowsMessageHandlers();
  const mobileHandlers = createMobileMessageHandlers(); // 新增
  const desktopHandlers = createDesktopMessageHandlers(); // 新增

  return new Proxy({} as Partial<Record<WebSocketAction, MessageHandler>>, {
    get(_target, action: string | symbol) {
      return async (ctx: any, message: any) => {
        const clientType: ClientType = message?.meta?.clientType || 'web';

        let handlers;
        switch (clientType) {
          case 'windows':
            handlers = windowsHandlers;
            break;
          case 'mobile':
            handlers = mobileHandlers;
            break;
          case 'desktop':
            handlers = desktopHandlers;
            break;
          default:
            handlers = webHandlers;
        }

        const handler = handlers[action as WebSocketAction];
        if (handler) {
          await handler(ctx, message);
        }
      };
    },
  });
}
```

## 相关文件

- `src/types/websocket.ts` - 类型定义
- `src/websocket/handlers/messageHandlers.ts` - 消息处理器工厂
- `src/websocket/index.ts` - WebSocket 连接处理
- `src/websocket/actions/web/` - Web 端 actions
- `src/websocket/actions/windows/` - Windows 端 actions

## 相关文档

- [ACTIONS_ARCHITECTURE.md](./ACTIONS_ARCHITECTURE.md) - Actions 架构详细设计
- [WebSocket 协议文档](./WEBSOCKET_PROTOCOL.md) - WebSocket 消息格式（如果存在）
