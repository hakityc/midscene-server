# stepIndex 传递检查分析

## 问题描述

检查 `agent` 的 `stepIndex` 是否能够正常传递到 server 端的 `onTaskStartTip` 回调中。

## Midscene 内部 stepIndex 传递流程

### 1. stepIndex 的设置

**位置**: `midscene/packages/core/src/yaml/player.ts`

在 `ScriptPlayer.playTask()` 方法中：

```typescript
async playTask(taskStatus: ScriptPlayerTaskStatus, agent: Agent) {
  for (const flowItemIndex in flow) {
    const currentStep = Number.parseInt(flowItemIndex, 10);
    const flowItem = flow[flowItemIndex];

    // 设置当前 stepIndex（全局步骤索引，跨 task 累计）
    const globalStepIndex = this.calculateGlobalStepIndex(
      taskStatus,
      currentStep,
    );
    agent.setCurrentStepIndex(globalStepIndex);  // ✅ 在循环开始时设置

    try {
      // ... 执行各种操作
      await agent.callActionInActionSpace(matchedAction.name, flowParams);
    } finally {
      // 清除 stepIndex，确保下一个 flowItem 不受影响
      agent.setCurrentStepIndex(undefined);  // ✅ 在 finally 中清除
    }
  }
}
```

**关键点**:

- stepIndex 在循环开始时设置
- stepIndex 在 finally 块中清除
- 确保每个 flowItem 都有正确的 stepIndex

### 2. stepIndex 的存储

**位置**: `midscene/packages/core/src/agent/agent.ts`

```typescript
export class Agent {
  /**
   * Current step index for custom tip support (used by ScriptPlayer)
   */
  private _currentStepIndex?: number;

  /**
   * Set current step index for custom tip support
   * Called by ScriptPlayer to pass step index to onTaskStartTip callback
   */
  setCurrentStepIndex(stepIndex: number | undefined): void {
    this._currentStepIndex = stepIndex;
  }
}
```

### 3. stepIndex 的传递

**位置**: `midscene/packages/core/src/agent/agent.ts`

```typescript
private async callbackOnTaskStartTip(task: ExecutionTask) {
  const param = paramStr(task);
  const tip = param ? `${typeStr(task)} - ${param}` : typeStr(task);

  if (this.onTaskStartTip) {
    await this.onTaskStartTip(tip, this._currentStepIndex);  // ✅ 传递 stepIndex
  }
}
```

**触发路径**:

1. `Agent.callActionInActionSpace()` → `TaskExecutor.runPlans()` → 创建 `Executor`
2. `Executor.flush()` → 遍历 tasks → 调用 `this.onTaskStart(task)`
3. `onTaskStart` 在 Agent 构造函数中被绑定到 `this.callbackOnTaskStartTip.bind(this)`
4. `callbackOnTaskStartTip()` → 调用 `this.onTaskStartTip(tip, this._currentStepIndex)`

### 4. 回调类型定义

**位置**: `midscene/packages/core/src/types.ts`

```typescript
export type OnTaskStartTip = (
  tip: string,
  stepIndex?: number,  // ✅ stepIndex 是可选参数
) => Promise<void> | void;
```

## Server 端接收 stepIndex

### 1. WebOperateServiceRefactored 中的回调设置

**位置**: `apps/server/src/services/base/WebOperateServiceRefactored.ts`

```typescript
this.agent.onTaskStartTip = (tip: string, stepIndex?: number) => {
  const finalTip = this.resolveCustomTip(stepIndex, tip);

  const safeCall = async () => {
    // ... 错误处理逻辑

    try {
      this.handleTaskStartTip(finalTip, bridgeError, stepIndex);  // ✅ 传递 stepIndex
    } catch (handlerError: any) {
      // 错误处理
    }
  };

  safeCall().catch((error: any) => {
    // 错误处理
  });
};
```

**关键点**:

- 回调接收 `stepIndex?: number` 参数
- 调用 `handleTaskStartTip(finalTip, bridgeError, stepIndex)` 传递 stepIndex

### 2. BaseOperateService 中的处理

**位置**: `apps/server/src/services/base/BaseOperateService.ts`

```typescript
protected handleTaskStartTip(
  tip: string,
  bridgeError?: Error | null,
  stepIndex?: number,  // ✅ 接收 stepIndex
): void {
  // ... 处理逻辑

  // 触发注册的回调
  this.triggerTaskTipCallbacks(tip, bridgeError, stepIndex);  // ✅ 传递 stepIndex
}
```

### 3. createTaskTipCallback 中的使用

**位置**: `apps/server/src/services/base/BaseOperateService.ts`

```typescript
public createTaskTipCallback<T>(
  config: TaskTipCallbackConfig<T>,
): TaskTipCallback {
  return (tip: string, bridgeError?: Error | null, stepIndex?: number) => {
    // ... 处理逻辑

    const response = createSuccessResponseWithMeta(
      message,
      formatted,
      {
        // ...
        stepIndex,  // ✅ 包含在响应中
        // ...
      },
      WebSocketAction.CALLBACK_AI_STEP,
    );
    send(response);
  };
}
```

## 潜在问题分析

### 问题 1: 非 ScriptPlayer 调用场景

**场景**: 直接调用 `agent.execute()` 或 `agent.aiAction()` 时

**分析**:

- 这些方法不会设置 `_currentStepIndex`
- 当 `callbackOnTaskStartTip()` 被调用时，`this._currentStepIndex` 可能是 `undefined`
- 这是**预期行为**，因为非 ScriptPlayer 场景不需要 stepIndex

**结论**: ✅ **正常** - stepIndex 是可选的，undefined 是允许的

### 问题 2: 异步执行时序问题

**场景**: `setCurrentStepIndex()` 和 `callActionInActionSpace()` 之间的时序

**分析**:

- `setCurrentStepIndex()` 是同步的，立即设置 `_currentStepIndex`
- `callActionInActionSpace()` 是异步的，但会在同一个事件循环中执行
- `callbackOnTaskStartTip()` 在任务执行时被调用，此时 `_currentStepIndex` 应该已经被设置

**结论**: ✅ **正常** - 同步设置，异步使用，时序正确

### 问题 3: 并发执行问题

**场景**: 多个任务并发执行时

**分析**:

- `_currentStepIndex` 是 Agent 实例的属性，不是任务级别的
- 如果多个任务并发执行，可能会互相覆盖 stepIndex
- 但是，从代码来看，任务通常是串行执行的（在 ScriptPlayer 的循环中）

**结论**: ⚠️ **需要注意** - 如果未来支持并发执行，可能需要任务级别的 stepIndex 管理

## 验证建议

### 1. 添加日志验证

在 `callbackOnTaskStartTip()` 中添加日志：

```typescript
private async callbackOnTaskStartTip(task: ExecutionTask) {
  const param = paramStr(task);
  const tip = param ? `${typeStr(task)} - ${param}` : typeStr(task);

  console.log('[DEBUG] callbackOnTaskStartTip:', {
    tip,
    stepIndex: this._currentStepIndex,  // 验证 stepIndex 值
  });

  if (this.onTaskStartTip) {
    await this.onTaskStartTip(tip, this._currentStepIndex);
  }
}
```

### 2. 在 Server 端验证

在 `WebOperateServiceRefactored` 的回调中添加日志：

```typescript
this.agent.onTaskStartTip = (tip: string, stepIndex?: number) => {
  console.log('[DEBUG] onTaskStartTip received:', {
    tip,
    stepIndex,  // 验证 stepIndex 是否传递过来
  });

  const finalTip = this.resolveCustomTip(stepIndex, tip);
  // ... 后续处理
};
```

### 3. 测试场景

1. **ScriptPlayer 场景**: 验证 stepIndex 是否正确传递
2. **直接调用场景**: 验证 stepIndex 为 undefined 时是否正常处理
3. **多步骤场景**: 验证每个步骤的 stepIndex 是否正确

## 总结

### ✅ 正常情况

1. **ScriptPlayer 调用**: stepIndex 能够正常传递
   - 在循环开始时设置 `agent.setCurrentStepIndex(globalStepIndex)`
   - 在 `callbackOnTaskStartTip()` 中读取 `this._currentStepIndex`
   - 传递给 `onTaskStartTip(tip, this._currentStepIndex)`
   - Server 端正确接收并处理

2. **时序正确**:
   - `setCurrentStepIndex()` 是同步的
   - `callActionInActionSpace()` 是异步的，但会在设置之后执行
   - `callbackOnTaskStartTip()` 在任务执行时被调用，此时 stepIndex 已设置

### ⚠️ 需要注意

1. **非 ScriptPlayer 场景**: stepIndex 为 undefined 是正常的
2. **并发执行**: 如果未来支持并发，可能需要任务级别的 stepIndex 管理

### 🔍 建议

1. 添加日志验证 stepIndex 的传递
2. 在 Server 端添加对 stepIndex 的验证和处理
3. 确保 `resolveCustomTip()` 能够正确处理 undefined 的 stepIndex

