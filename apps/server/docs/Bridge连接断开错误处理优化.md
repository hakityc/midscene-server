# Bridge 连接断开错误处理优化

## 问题描述

在使用 `@midscene/web` 的 `AgentOverChromeBridge` 时，当浏览器扩展连接断开后，如果任务仍在服务端执行，会出现未处理的 Promise 拒绝错误：

```
reason: Connection lost, reason: client namespace disconnect
stack: Error: Connection lost, reason: client namespace disconnect
    at BridgeServer.emitCall (file:///C:/webai/webaiserver/node_modules/@midscene/web/dist/es/bridge-mode/io-server.mjs:132:27)
```

### 错误触发链路

```
Agent 任务开始
  ↓
触发 onTaskStartTip 回调
  ↓
AgentOverChromeBridge.onTaskStartTip
  ↓
调用 showStatusMessage(tip) 向浏览器扩展发送状态
  ↓
BridgeServer.call() → BridgeServer.emitCall()
  ↓
检测到连接已断开 (connectionLost === true)
  ↓
立即 reject Promise: "Connection lost"
  ↓
❌ Promise rejection 未被处理 → unhandledRejection
```

### 根本原因

`@midscene/web` 的 `AgentOverChromeBridge` 构造函数中，`onTaskStartTip` 回调调用 `showStatusMessage` 时没有正确处理返回的 Promise，导致连接断开时产生未捕获的 Promise 拒绝。

## 解决方案

### 设计原则

1. **不修改第三方源码**：不修改 `@midscene/web` 包的代码，便于后续维护和升级
2. **完整错误捕获**：捕获所有可能的错误（同步、异步、延迟 rejection）
3. **智能错误分级**：区分内部错误和需要关注的错误
4. **保持功能正常**：错误不影响任务的正常执行

### 实现要点

#### 1. 三层错误捕获机制

```typescript
// 第一层：Promise.catch() 捕获异步错误
const callPromise = Promise.resolve(originalCallback.call(this.agent, tip));
callPromise.catch((error: any) => {
  // 处理错误
});

// 第二层：try-catch 捕获同步错误
try {
  // 调用逻辑
} catch (syncError: any) {
  // 处理同步错误
}

// 第三层：最外层 async/await catch
safeCall().catch((error: any) => {
  // 最后的安全网
});
```

#### 2. 智能错误分级

根据错误类型决定日志级别和是否上报：

```typescript
// 判断是否是连接断开错误
const isConnectionError =
  error?.message?.includes('Connection lost') ||
  error?.message?.includes('client namespace disconnect') ||
  error?.message?.includes('bridge client') ||
  error?.message?.includes('timeout');

if (isConnectionError) {
  // 内部错误，只记录 debug 级别，不上报
  serviceLogger.debug({...}, 'Bridge 连接已断开（不影响任务执行）');
} else {
  // 其他错误，记录 warn 级别，需要关注
  serviceLogger.warn({...}, '显示状态消息失败');
}
```

#### 3. 不返回 Promise

回调函数不返回 Promise，避免外部代码等待或依赖这个 Promise：

```typescript
this.agent.onTaskStartTip = (tip: string) => {
  // 内部处理所有逻辑
  safeCall().catch(...);

  // 不返回 Promise，所有错误都在内部处理
};
```

## 效果

### 优化前

- ❌ 出现未处理的 Promise 拒绝
- ❌ 日志级别为 `error`，引起不必要的警报
- ❌ 错误堆栈难以理解

### 优化后

- ✅ 所有错误都被捕获，不会出现 unhandledRejection
- ✅ 连接断开错误使用 `debug` 级别，其他错误使用 `warn` 级别
- ✅ 错误日志清晰，易于理解
- ✅ 任务继续正常执行，不受影响

## 日志示例

### 连接断开时（debug 级别）

```json
{
  "level": "debug",
  "tip": "正在分析页面元素...",
  "errorType": "bridge_connection_lost",
  "error": "Connection lost, reason: client namespace disconnect",
  "message": "Bridge 连接已断开，无法显示状态消息（不影响任务执行）"
}
```

### 其他错误时（warn 级别）

```json
{
  "level": "warn",
  "tip": "正在执行操作...",
  "error": "Unexpected error",
  "stack": "...",
  "message": "显示状态消息失败"
}
```

## 相关文件

- 修改文件：`apps/server/src/services/webOperateService.ts`
- 修改方法：`setupTaskStartTipCallback()`
- 影响范围：Web 操作服务的错误处理

## 维护建议

1. **监控 debug 日志**：虽然连接断开是预期的，但如果频繁出现可能说明连接稳定性有问题
2. **关注 warn 日志**：非连接错误需要及时处理
3. **定期更新 @midscene/web**：关注官方是否修复了这个问题
4. **保持错误分类逻辑**：如果发现新的内部错误类型，及时添加到 `isConnectionError` 判断中

## 测试场景

1. ✅ 浏览器扩展正常连接时：任务提示正常显示
2. ✅ 浏览器扩展断开后任务继续执行：错误被捕获，任务不受影响
3. ✅ 其他类型错误：正确记录并上报

## 相关问题

如果未来 `@midscene/web` 官方修复了这个问题，可以考虑：

1. 移除我们的错误处理包装
2. 或者保留作为防御性编程的一部分
