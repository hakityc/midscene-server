# 回调递归问题修复文档

## 问题描述

在执行 Windows AI 任务时，出现 `RangeError: Maximum call stack size exceeded` 错误，导致任务无法执行。

## 错误日志

```
🚀 开始执行 Windows AI 任务: 打开记事本
🔍 当前 agent.onTaskStartTip 是否已设置: function
file:///Users/lebo/lebo/project/midscene-server/apps/server/src/services/customMidsceneDevice/agentOverWindows.ts:1
var __defProp=Object.defineProperty;var __name=(target,value)=>__defProp(target,"name",{value,configurable:true});...

RangeError: Maximum call stack size exceeded
```

## 问题分析

### 根本原因

在 `windowsOperateService.ts` 的 `setupTaskStartTipCallback()` 方法中，存在回调函数重复包装的问题，导致形成无限递归调用链。

### 问题代码

```typescript
private setupTaskStartTipCallback(): void {
  if (!this.agent) {
    throw new Error('Agent 未创建，无法设置回调');
  }

  // 保存原始回调
  const originalCallback = this.agent.onTaskStartTip;

  // 设置新的回调，同时保留原有功能
  this.agent.onTaskStartTip = async (tip: string) => {
    // 先调用原始的回调 ⚠️ 问题在这里！
    if (originalCallback) {
      await originalCallback(tip);  
    }
    // 再调用我们的回调
    this.handleTaskStartTip(tip);
  };
}
```

### 问题场景

1. **第一次调用 `setupTaskStartTipCallback()`**：
   - `originalCallback` = `undefined` 或初始回调
   - 创建新回调 `callback1`，内部可能调用 `originalCallback`
   - `agent.onTaskStartTip` = `callback1`

2. **第二次调用 `setupTaskStartTipCallback()`**（重连、重启等场景）：
   - `originalCallback` = `callback1`（上一次设置的回调）
   - 创建新回调 `callback2`，内部调用 `originalCallback`（即 `callback1`）
   - `agent.onTaskStartTip` = `callback2`

3. **第三次调用 `setupTaskStartTipCallback()`**：
   - `originalCallback` = `callback2`
   - 创建新回调 `callback3`，内部调用 `callback2`
   - 形成调用链：`callback3` → `callback2` → `callback1`

4. **执行 AI 任务时**：
   - 触发 `onTaskStartTip`
   - `callback3` 被调用
   - `callback3` 调用 `callback2`
   - `callback2` 调用 `callback1`
   - 如果链条足够长或存在循环引用，就会导致堆栈溢出

### 为什么会多次调用？

在以下场景中，`createAgent()` 会被多次调用，从而导致 `setupTaskStartTipCallback()` 被多次执行：

1. **服务重启**：`stop()` → `start()` → `createAgent()`
2. **重连机制**：连接断开后 → `reconnect()` → `createAgent()`
3. **强制重连**：`forceReconnect()` → `initialize()` → 可能触发多次初始化

## 解决方案

### 修复代码

移除回调包装逻辑，直接设置回调函数：

```typescript
private setupTaskStartTipCallback(): void {
  if (!this.agent) {
    throw new Error('Agent 未创建，无法设置回调');
  }

  // 直接设置回调，不要包装已有的回调
  // 避免形成递归调用链
  this.agent.onTaskStartTip = async (tip: string) => {
    this.handleTaskStartTip(tip);
  };
}
```

### 修复说明

1. **移除 `originalCallback` 保存**：不再尝试保留原有回调
2. **直接设置新回调**：每次都重新设置为新的回调函数
3. **单一职责**：回调函数只负责调用 `handleTaskStartTip`
4. **避免嵌套**：不会形成回调链或递归调用

## 影响范围

### 修改文件
- `apps/server/src/services/windowsOperateService.ts`

### 影响功能
- Windows AI 任务执行
- 任务开始提示回调
- 服务重启和重连机制

### 向后兼容性
- ✅ 完全向后兼容
- ✅ 不影响现有功能
- ✅ 只修复了递归问题

## 测试验证

### 测试场景

1. **基础任务执行**
   ```typescript
   await windowsOperateService.execute('打开记事本');
   // 应该正常执行，不再报堆栈溢出错误
   ```

2. **服务重启**
   ```typescript
   await windowsOperateService.stop();
   await windowsOperateService.start();
   await windowsOperateService.execute('点击开始菜单');
   // 应该正常执行
   ```

3. **重连机制**
   ```typescript
   await windowsOperateService.forceReconnect();
   await windowsOperateService.execute('输入文本');
   // 应该正常执行
   ```

4. **多次重启**
   ```typescript
   for (let i = 0; i < 5; i++) {
     await windowsOperateService.stop();
     await windowsOperateService.start();
   }
   await windowsOperateService.execute('执行任务');
   // 应该正常执行，不会因为多次重启而积累回调链
   ```

### 预期结果
- ✅ 任务正常执行，不再出现堆栈溢出错误
- ✅ `onTaskStartTip` 回调正常触发
- ✅ 任务提示正常输出到日志
- ✅ 服务可以多次重启而不影响功能

## 相关问题

### 为什么之前要包装回调？

原始代码试图保留 Agent 基类可能设置的回调函数，同时添加自己的处理逻辑。这在理论上是合理的，但在实际场景中：

1. `AgentOverWindows` 在构造函数中并不会设置 `onTaskStartTip`
2. 每次创建新的 Agent 实例时，`onTaskStartTip` 都是 `undefined` 或默认值
3. 服务层应该完全控制回调函数，不需要保留之前的回调

### 其他注意事项

如果未来需要支持回调链（多个监听器），应该使用事件发射器模式而不是函数包装：

```typescript
// 推荐方式：使用 EventEmitter
this.agent.on('taskStart', (tip) => {
  this.handleTaskStartTip(tip);
});

// 而不是包装回调函数
```

## 修复时间

- **发现时间**：2025-10-13
- **修复时间**：2025-10-13
- **修复版本**：当前开发版本

## 总结

这是一个经典的回调函数重复包装导致的递归问题。修复方法很简单：**直接设置回调，不要尝试保留和包装旧回调**。

这个问题提醒我们：
1. 在设置回调函数时要谨慎处理已有回调
2. 如果需要多个监听器，应该使用事件发射器模式
3. 在可能多次初始化的场景中，要特别注意状态累积问题

