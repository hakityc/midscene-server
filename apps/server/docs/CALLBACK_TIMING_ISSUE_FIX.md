# Windows Agent 回调时机问题修复总结

## 🐛 问题现象

执行 Windows AI 任务时出现栈溢出错误：

```
🚀 开始执行 Windows AI 任务: 当前页面有哪些内容
RangeError: Maximum call stack size exceeded
```

## 🔍 根本原因

**回调函数设置的时机不正确**。

`AgentOverWindows` 在构造后才设置 `onTaskStartTip` 回调，而 Agent 基类在构造函数中就已经绑定了回调机制。这种"延迟设置"方式会导致回调机制冲突，在某些异步场景下形成循环调用。

## ✅ 解决方案

### 关键改动

参考 `AgentOverChromeBridge` 的正确实现，将回调设置移到构造函数中：

**修改前（错误）**：

```typescript
// AgentOverWindows.ts
constructor(opts) {
  super(windowsDevice, opts); // ❌ 没有设置 onTaskStartTip
}

// windowsOperateService.ts
this.agent = new AgentOverWindows(config);
this.agent.onTaskStartTip = callback; // ❌ 事后设置回调
```

**修改后（正确）**：

```typescript
// AgentOverWindows.ts
constructor(opts) {
  const originalOnTaskStartTip = opts?.onTaskStartTip;
  super(windowsDevice, {
    ...opts,
    onTaskStartTip: originalOnTaskStartTip
      ? (tip) => originalOnTaskStartTip.call(this, tip)
      : undefined,
  }); // ✅ 构造时设置回调
}

// windowsOperateService.ts
const config = {
  ...defaultConfig,
  onTaskStartTip: (tip) => this.handleTaskStartTip(tip), // ✅ 在配置中提供回调
};
this.agent = new AgentOverWindows(config);
```

### 修改的文件

1. **`agentOverWindows.ts`**
   - 修改构造函数，在调用 `super()` 时设置 `onTaskStartTip`
   - 保留用户提供的原始回调并正确调用

2. **`windowsOperateService.ts`**
   - 在 `defaultAgentConfig` 中添加 `onTaskStartTip` 配置
   - 删除 `setupTaskStartTipCallback()` 方法
   - 简化 `createAgent()` 逻辑

## 📚 核心教训

### 1. 在构造函数中设置回调

对于继承自 Agent 的类，所有回调都应该在构造时通过 opts 传入：

```typescript
// ✅ 正确
class MyAgent extends Agent {
  constructor(opts) {
    super(device, {
      ...opts,
      onTaskStartTip: (tip) => { /* 处理 */ }
    });
  }
}

// ❌ 错误
class MyAgent extends Agent {
  constructor(opts) {
    super(device, opts);
  }
  
  init() {
    this.onTaskStartTip = (tip) => { /* 处理 */ }; // 可能导致问题
  }
}
```

### 2. 参考已有的正确实现

`AgentOverChromeBridge` 提供了正确的实现模式，应该保持一致。

### 3. 理解基类的内部机制

Agent 基类在构造函数中会：

- 设置 `this.onTaskStartTip = opts.onTaskStartTip`
- 创建 TaskExecutor 并绑定 `this.callbackOnTaskStartTip`
- `callbackOnTaskStartTip` 会调用 `this.onTaskStartTip`

事后修改 `this.onTaskStartTip` 可能与这个机制产生冲突。

## 🎯 修复效果

- ✅ 消除了栈溢出错误
- ✅ 回调在正确的时机设置
- ✅ 与 `AgentOverChromeBridge` 保持一致的实现模式
- ✅ 代码更简洁，删除了不必要的 `setupTaskStartTipCallback()` 方法

## 📅 修复时间

- **问题发现**：2025-10-13
- **初次修复（表面）**：2025-10-13
- **问题复现**：2025-10-13
- **最终修复（根本）**：2025-10-13

---

**详细分析请参考**：`CALLBACK_RECURSION_FIX.md`
