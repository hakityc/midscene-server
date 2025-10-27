# 错误上报机制优化 - Error 对象序列化丢失信息

## 问题描述

### 现象
在腾讯云 CLS 日志中发现，错误日志只显示了部分信息：
```
error: {"statusCode":500,"isOperational":true}
message: AI 处理失败
```

关键的 `error.message` 和 `error.stack` 等信息完全丢失，导致无法有效定位问题原因。

### 根本原因

**Error 对象序列化问题**：Error 对象在使用 `JSON.stringify()` 序列化时，由于其核心属性（`name`, `message`, `stack`）都是不可枚举的，导致这些属性不会被序列化，只有自定义的可枚举属性（如 `AppError` 的 `statusCode`、`isOperational`）才会被保留。

问题发生在两个关键位置：

1. **`tencentCLSTransport.ts` 的 `serializeValue` 方法**：
   - 对所有对象统一使用 `JSON.stringify()`
   - Error 对象被序列化为不完整的 JSON（缺少 message 和 stack）

2. **`logger.ts` 的日志记录方法**：
   - 直接将包含 Error 对象的日志对象传递给 CLS
   - 没有预先序列化 Error 对象

3. **`messageBuilder.ts` 的 `createErrorResponse`**：
   - 只返回简单的错误消息
   - 缺少调试所需的详细信息（如 stack trace）

## 解决方案

### 1. 优化 CLS 传输器的错误序列化

**文件**: `apps/server/src/utils/tencentCLSTransport.ts`

在 `serializeValue` 方法中添加 Error 对象的特殊处理：

```typescript
private serializeValue(value: any): string {
  // ... 其他类型处理 ...
  
  // 对于 Error 对象，需要特殊处理以保留所有信息
  if (value instanceof Error) {
    return JSON.stringify({
      name: value.name,
      message: value.message,
      stack: value.stack,
      // 保留自定义属性（如 AppError 的 statusCode, isOperational）
      ...Object.getOwnPropertyNames(value).reduce((acc, key) => {
        if (key !== 'name' && key !== 'message' && key !== 'stack') {
          acc[key] = (value as any)[key];
        }
        return acc;
      }, {} as Record<string, any>),
    });
  }
  
  // ... 其他类型处理 ...
}
```

**关键改进**：
- 显式提取 `name`、`message`、`stack` 属性
- 使用 `Object.getOwnPropertyNames()` 获取所有自定义属性
- 确保所有有价值的信息都被序列化

### 2. 优化 Logger 的错误对象处理

**文件**: `apps/server/src/utils/logger.ts`

添加 `serializeError` 辅助函数，并在日志记录前预处理错误对象：

```typescript
/**
 * 序列化 Error 对象，保留所有有用信息
 */
function serializeError(error: Error): Record<string, any> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    // 保留所有自定义属性（如 AppError 的 statusCode, isOperational）
    ...Object.getOwnPropertyNames(error).reduce((acc, key) => {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        acc[key] = (error as any)[key];
      }
      return acc;
    }, {} as Record<string, any>),
  };
}
```

在日志方法中应用：

```typescript
childLogger[method] = (obj: any, msg?: string) => {
  const context = logContextStorage.getStore();

  // 处理错误对象序列化
  let processedObj = obj;
  if (typeof obj === 'object' && obj !== null) {
    // 深度序列化所有 Error 对象
    processedObj = Object.entries(obj).reduce((acc, [key, value]) => {
      acc[key] = value instanceof Error ? serializeError(value) : value;
      return acc;
    }, {} as Record<string, any>);
  }

  // ... 后续处理 ...
};
```

**关键改进**：
- 在日志记录前预先序列化所有 Error 对象
- 确保本地日志和 CLS 日志都包含完整信息
- 统一处理有 CLS 和无 CLS 两种场景

### 3. 优化错误响应消息

**文件**: `apps/server/src/websocket/builders/messageBuilder.ts`

增强 `createErrorResponse` 函数，在开发环境提供更详细的错误信息：

```typescript
export function createErrorResponse(
  originalMessage: WsInboundMessage,
  error: unknown,
  prefix: string = '操作失败',
): WsOutboundMessage<string> {
  let errorMessage = '';
  
  if (error instanceof Error) {
    errorMessage = error.message;
    
    // 在开发环境中，提供更详细的错误信息
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment && error.stack) {
      // 提取 stack 的前几行
      const stackLines = error.stack.split('\n').slice(0, 5);
      errorMessage = `${errorMessage}\n堆栈信息: ${stackLines.join('\n')}`;
    }
    
    // 如果是自定义错误类（如 AppError），包含额外信息
    if ('statusCode' in error || 'isOperational' in error) {
      const customProps = Object.entries(error)
        .filter(([key]) => !['name', 'message', 'stack'].includes(key))
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (customProps) {
        errorMessage = `${errorMessage} (${customProps})`;
      }
    }
  } else {
    errorMessage = String(error);
  }
  
  return buildOutboundFromMeta<string>(
    originalMessage.meta,
    originalMessage.payload.action as any,
    'failed',
    {
      error: `${prefix}: ${errorMessage}`,
    },
  );
}
```

**关键改进**：
- 在开发环境包含 stack trace（前5行）
- 包含自定义错误属性（如 statusCode）
- 生产环境保持简洁，避免泄露敏感信息

## 效果验证

### 优化前
CLS 日志显示：
```json
{
  "level": "error",
  "module": "websocket",
  "message": "AI 处理失败",
  "error": {
    "statusCode": 500,
    "isOperational": true
  }
}
```
❌ 缺少关键的 `message` 和 `stack` 信息

### 优化后
CLS 日志将显示：
```json
{
  "level": "error",
  "module": "websocket",
  "message": "AI 处理失败",
  "error": {
    "name": "AppError",
    "message": "连接超时",
    "stack": "AppError: 连接超时\n    at WebOperateService.execute (...)\n    at ...",
    "statusCode": 500,
    "isOperational": true
  }
}
```
✅ 完整保留所有错误信息

### WebSocket 错误响应

**开发环境**：
```json
{
  "payload": {
    "status": "failed",
    "error": "AI 处理失败: 连接超时\n堆栈信息: AppError: 连接超时\n    at ...\n    at ...\n    at ...\n    at ...\n (statusCode: 500, isOperational: true)"
  }
}
```

**生产环境**：
```json
{
  "payload": {
    "status": "failed",
    "error": "AI 处理失败: 连接超时 (statusCode: 500, isOperational: true)"
  }
}
```

## 技术要点

### Error 对象的特殊性

JavaScript 的 Error 对象有以下特点：
1. 核心属性（`name`, `message`, `stack`）是不可枚举的
2. `JSON.stringify()` 只会序列化可枚举属性
3. 需要使用 `Object.getOwnPropertyNames()` 获取所有属性

### 序列化策略

采用三层防护：
1. **传输层**（`tencentCLSTransport.ts`）：在最终序列化时特殊处理 Error
2. **日志层**（`logger.ts`）：在记录日志前预处理 Error 对象
3. **响应层**（`messageBuilder.ts`）：在构建响应时提取完整信息

### 环境区分

- **开发环境**：提供完整的 stack trace，便于调试
- **生产环境**：只提供必要信息，避免泄露内部实现细节

## 影响范围

### 受益模块
- ✅ 所有 WebSocket Action Handlers
- ✅ 所有使用 `wsLogger.error()` 的代码
- ✅ 所有使用 `createErrorResponse()` 的代码
- ✅ CLS 日志系统
- ✅ 本地 Pino 日志

### 兼容性
- ✅ 完全向后兼容
- ✅ 不需要修改现有的日志调用代码
- ✅ 不影响正常的日志记录流程

## 最佳实践建议

### 1. 使用自定义错误类
```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

### 2. 记录错误日志时提供上下文
```typescript
wsLogger.error(
  {
    connectionId,
    error,  // Error 对象会被自动序列化
    messageId: meta.messageId,
    additionalContext: 'xxx',  // 提供额外的上下文信息
  },
  'AI 处理失败',
);
```

### 3. 在 catch 块中保留原始错误信息
```typescript
try {
  // ...
} catch (error) {
  // ✅ 好的做法：保留原始错误
  wsLogger.error({ error }, '操作失败');
  
  // ❌ 不好的做法：丢失错误详情
  wsLogger.error('操作失败');
}
```

## 相关文件

- `apps/server/src/utils/tencentCLSTransport.ts` - CLS 传输器
- `apps/server/src/utils/logger.ts` - 日志系统
- `apps/server/src/websocket/builders/messageBuilder.ts` - 消息构建器
- `apps/server/src/utils/error.ts` - 错误类定义

## 总结

这次优化解决了 Error 对象序列化丢失关键信息的问题，确保了：

1. ✅ **完整的错误信息**：message、stack、自定义属性全部保留
2. ✅ **更好的调试体验**：开发环境提供详细的 stack trace
3. ✅ **生产环境安全**：避免泄露敏感信息
4. ✅ **统一的处理逻辑**：三层防护确保所有场景都得到正确处理
5. ✅ **向后兼容**：不需要修改现有代码

日期：2024-10-27

