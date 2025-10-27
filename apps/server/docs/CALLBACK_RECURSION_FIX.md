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

- **初次发现**：2025-10-13
- **初次修复**：2025-10-13
- **问题复现**：2025-10-13（同日复现）
- **最终修复**：2025-10-13
- **修复版本**：当前开发版本

---

## 第二次修复（2025-10-13）

### 问题复现

即使在第一次修复后（移除了回调包装），问题仍然出现。经过深入分析发现，**根本原因不是回调包装，而是回调设置的时机不正确**。

### 真正的根本原因

对比 `AgentOverChromeBridge` 和 `AgentOverWindows` 的实现，发现关键差异：

**AgentOverChromeBridge（正确的实现）**:

```typescript
constructor(opts?) {
  const originalOnTaskStartTip = opts?.onTaskStartTip;
  super(
    page,
    Object.assign(opts || {}, {
      onTaskStartTip: (tip: string) => {
        this.page.showStatusMessage(tip);
        if (originalOnTaskStartTip) {
          originalOnTaskStartTip?.call(this, tip);
        }
      },
    }),
  );
}
```

**AgentOverWindows（问题实现）**:

```typescript
constructor(opts?: AgentOverWindowsOpt) {
  const windowsDevice = new WindowsDevice(opts?.deviceOptions);
  super(windowsDevice, opts); // ⚠️ 没有设置 onTaskStartTip
}
```

然后在 `windowsOperateService.ts` 中：

```typescript
this.agent = new AgentOverWindows({ ...this.defaultAgentConfig });
// 之后再调用 setupTaskStartTipCallback() 设置回调
```

**这种"延迟设置回调"的方式会导致以下问题**：

1. Agent 基类在构造函数中创建 `TaskExecutor` 时，会绑定 `this.callbackOnTaskStartTip`
2. `callbackOnTaskStartTip` 内部会检查 `this.onTaskStartTip` 并调用它
3. 如果在构造后再设置 `this.onTaskStartTip`，可能会与内部机制产生冲突
4. 在某些异步场景下，可能导致回调被多次触发或形成循环调用

### 最终修复方案

**1. 修改 `AgentOverWindows` 构造函数**，在构造时就设置 `onTaskStartTip`：

```typescript
constructor(opts?: AgentOverWindowsOpt) {
  const windowsDevice = new WindowsDevice(opts?.deviceOptions);
  const originalOnTaskStartTip = opts?.onTaskStartTip;

  super(
    windowsDevice,
    Object.assign({}, opts || {}, {
      onTaskStartTip: originalOnTaskStartTip
        ? (tip: string) => {
            if (originalOnTaskStartTip) {
              originalOnTaskStartTip.call(this, tip);
            }
          }
        : undefined,
    }),
  );

  this.destroyAfterDisconnectFlag = opts?.closeAfterDisconnect;
}
```

**2. 修改 `windowsOperateService.ts`**，在 `defaultAgentConfig` 中直接配置回调：

```typescript
private readonly defaultAgentConfig: AgentOverWindowsOpt = {
  closeAfterDisconnect: false,
  generateReport: true,
  autoPrintReportMsg: true,
  deviceOptions: {
    deviceName: 'Windows Desktop',
    debug: true,
  },
  // 在构造函数中直接设置 onTaskStartTip 回调
  onTaskStartTip: (tip: string) => {
    this.handleTaskStartTip(tip);
  },
};
```

**3. 删除 `setupTaskStartTipCallback()` 方法**，因为不再需要后置设置回调。

### 修复效果

- ✅ 回调在 Agent 构造时就正确设置，与内部机制保持一致
- ✅ 避免了后置设置导致的时序问题
- ✅ 代码结构与 `AgentOverChromeBridge` 保持一致
- ✅ 消除了栈溢出错误的根源

### 修改文件

1. `apps/server/src/services/customMidsceneDevice/agentOverWindows.ts`
   - 修改构造函数，在调用 `super()` 时设置 `onTaskStartTip`

2. `apps/server/src/services/windowsOperateService.ts`
   - 在 `defaultAgentConfig` 中添加 `onTaskStartTip` 配置
   - 删除 `setupTaskStartTipCallback()` 方法
   - 更新 `createAgent()` 方法的注释

---

## 总结

这是一个**回调设置时机不正确**导致的栈溢出问题。初次修复只解决了表面问题（回调包装），但没有解决根本问题（设置时机）。

### 核心教训

1. **在构造函数中设置回调**：对于 Agent 基类，所有回调都应该在构造时通过 opts 传入，而不是事后设置
2. **参考正确实现**：`AgentOverChromeBridge` 提供了正确的实现模式
3. **理解内部机制**：Agent 基类会在构造函数中绑定回调，事后修改可能导致问题
4. **彻底修复而非打补丁**：第一次修复只是移除了症状（回调包装），第二次才找到病根（设置时机）

### 最佳实践

```typescript
// ✅ 正确：在构造函数中设置回调
class MyAgent extends Agent {
  constructor(opts) {
    super(device, {
      ...opts,
      onTaskStartTip: (tip) => { /* 处理逻辑 */ }
    });
  }
}

// ❌ 错误：构造后再设置回调
class MyAgent extends Agent {
  constructor(opts) {
    super(device, opts);
  }
  
  setup() {
    this.onTaskStartTip = (tip) => { /* 处理逻辑 */ }; // 可能导致问题！
  }
}
```
