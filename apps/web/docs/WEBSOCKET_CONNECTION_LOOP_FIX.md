# WebSocket 连接循环问题修复总结

## 问题描述

用户反馈 web 客户端导致服务器不断循环连接和断开，从服务器日志可以看到：

```
21:44:30.350: conn_1760190270293_hnas9u5g8 已建立
21:44:30.363: conn_1760190270350_l4w0t4rmg 已关闭
21:44:30.377: conn_1760190270320_2eh4ni48d 已建立
21:44:30.401: conn_1760190270376_he31l34xs 已关闭
```

这种快速循环建立和关闭连接的行为表明客户端存在连接管理问题。

## 问题分析

通过分析代码发现以下问题：

### 1. 循环依赖问题

```typescript
// 问题代码结构
const scheduleReconnect = useCallback(() => {
  // ... 重连逻辑
  connect(); // 依赖 connect 函数
}, [connect]);

const connect = useCallback(() => {
  // ... 连接逻辑
  scheduleReconnect(); // 依赖 scheduleReconnect 函数
}, [scheduleReconnect]);
```

### 2. 重复连接逻辑

- `connect` 函数和 `scheduleReconnect` 函数都包含完整的 WebSocket 连接逻辑
- 代码重复导致维护困难，容易引入 bug

### 3. 类型定义不匹配

- `MonitorMessage` 的 `direction` 类型只支持 `'sent' | 'received'`
- 但代码中使用了 `'info'` 作为 direction，导致类型错误

### 4. 连接状态管理混乱

- 多个函数同时管理连接状态
- 没有统一的连接生命周期管理

## 修复方案

### 1. 重构连接逻辑，消除循环依赖

**修改前**：

```typescript
const scheduleReconnect = useCallback(() => {
  // 重复的连接逻辑
}, [connect]);

const connect = useCallback(() => {
  // 重复的连接逻辑
}, [scheduleReconnect]);
```

**修改后**：

```typescript
// 统一的连接创建函数
const createWebSocketConnection = useCallback(() => {
  // 完整的连接逻辑
  ws.onclose = (event) => {
    // 直接在 onclose 中处理重连，避免循环依赖
    if (event.code !== 1000 && event.code !== 1001) {
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        // 直接递归调用，避免函数间依赖
        setTimeout(() => {
          reconnectAttemptsRef.current++;
          createWebSocketConnection();
        }, delay);
      }
    }
  };
}, [endpoint, addMessage]);

// 简化的连接函数
const connect = useCallback(() => {
  clearReconnectTimeout();
  // 关闭已存在的连接
  if (socketRef.current && /* 连接状态检查 */) {
    socketRef.current.close(1000, 'reconnect');
  }
  // 使用统一连接函数
  createWebSocketConnection();
}, [clearReconnectTimeout, createWebSocketConnection]);
```

### 2. 修复类型定义

**修改前**：

```typescript
export interface MonitorMessage {
  direction: 'sent' | 'received';
  type: 'success' | 'error' | 'info';
}

const addMessage = useCallback((
  direction: 'sent' | 'received', // 类型不匹配
  type: 'success' | 'error' | 'info',
  // ...
) => {
```

**修改后**：

```typescript
export interface MonitorMessage {
  direction: 'sent' | 'received' | 'info'; // 添加 'info' 支持
  type: 'success' | 'error' | 'info';
}

const addMessage = useCallback((
  direction: 'sent' | 'received' | 'info', // 匹配类型定义
  type: 'success' | 'error' | 'info',
  // ...
) => {
```

### 3. 优化连接状态管理

**改进内容**：

- 使用单一函数管理所有连接逻辑
- 在 `onclose` 事件中直接处理重连，避免函数间依赖
- 使用 `useRef` 管理重连计数器和定时器
- 确保连接关闭时正确清理资源

### 4. 改进错误处理

**改进内容**：

- 添加详细的控制台错误日志
- 区分不同类型的连接关闭代码
- 提供更友好的错误提示信息

## 修复效果

修复后的连接管理具备以下特点：

### ✅ **消除循环依赖**

- 不再存在函数间的循环依赖
- 连接逻辑统一管理，避免重复代码

### ✅ **稳定的连接管理**

- 连接建立后不会立即断开
- 重连逻辑只在必要时触发
- 避免频繁的连接/断开循环

### ✅ **正确的类型安全**

- 修复所有 TypeScript 类型错误
- 类型定义与实际使用保持一致

### ✅ **优化的资源管理**

- 正确清理定时器和连接
- 避免内存泄漏
- 组件卸载时正确清理资源

## 技术细节

### 连接生命周期管理

```typescript
// 1. 初始连接
connect() → createWebSocketConnection()

// 2. 连接成功
ws.onopen() → 重置重连计数器

// 3. 连接关闭
ws.onclose() → 检查关闭代码 → 决定是否重连

// 4. 重连逻辑
setTimeout() → 增加重连计数 → createWebSocketConnection()

// 5. 资源清理
组件卸载 → clearReconnectTimeout() → 关闭连接
```

### 重连策略

- **最大重试次数**：5 次
- **退避策略**：指数退避（1s → 2s → 4s → 8s → 10s）
- **重连条件**：只有非正常关闭才重连（code !== 1000 && code !== 1001）

### 错误处理

- **连接错误**：记录到控制台，显示用户友好的错误信息
- **重连失败**：达到最大重试次数后停止重连
- **资源清理**：确保定时器和连接正确清理

## 验证方法

1. **刷新页面**：应该看到连接建立，不再循环断开
2. **网络断开**：应该看到重连尝试，而不是立即循环
3. **服务器重启**：客户端应该自动重连
4. **控制台检查**：应该看到清晰的连接日志，没有错误循环

修复后的客户端应该能够稳定连接到服务器，不再导致服务器端的连接循环问题。
