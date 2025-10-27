# WebOperateService 任务提示回调机制使用示例

## 概述

现在 `WebOperateService` 提供了统一的回调机制来处理任务提示，所有使用 agent 能力的地方都可以通过注册回调来接收任务提示。

## 新的 API

### 注册回调

```typescript
// 注册任务提示回调
webOperateService.onTaskTip((tip: string) => {
  console.log('收到任务提示:', tip);
  // 处理任务提示逻辑
});
```

### 移除回调

```typescript
// 移除特定回调
webOperateService.offTaskTip(callback);

// 清空所有回调
webOperateService.clearTaskTipCallbacks();
```

## 使用示例

### 1. WebSocket 处理器中使用

```typescript
export function createAiHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    // 注册任务提示回调
    const taskTipCallback = (tip: string) => {
      const { formatted, icon, category } = formatTaskTip(tip);
      const timestamp = new Date().toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const response = createSuccessResponseWithMeta(
        message as WebSocketMessage,
        formatted,
        {
          originalTip: tip,
          category,
          icon,
          timestamp,
          stage: getTaskStageDescription(category)
        },
        WebSocketAction.CALLBACK_AI_STEP
      );
      send(response);
    };

    try {
      const webOperateService = WebOperateService.getInstance();
      
      // 注册回调
      webOperateService.onTaskTip(taskTipCallback);
      
      // 执行任务
      await webOperateService.execute(params);
      
    } finally {
      // 清理回调，避免内存泄漏
      webOperateService.offTaskTip(taskTipCallback);
    }
  };
}
```

### 2. 多个处理器同时使用

```typescript
// 处理器 A
const callbackA = (tip: string) => {
  console.log('处理器 A 收到:', tip);
};

// 处理器 B  
const callbackB = (tip: string) => {
  console.log('处理器 B 收到:', tip);
};

webOperateService.onTaskTip(callbackA);
webOperateService.onTaskTip(callbackB);

// 当任务提示触发时，两个回调都会被调用
```

## 优势

1. **统一管理**: 所有任务提示逻辑都在 `WebOperateService` 内部统一处理
2. **自动触发**: 无论是 `execute()`, `executeScript()` 还是 `expect()` 方法，都会自动触发回调
3. **内存安全**: 提供了完整的回调生命周期管理，避免内存泄漏
4. **易于扩展**: 新的处理器只需要注册回调即可获得任务提示功能

## 迁移指南

### 从旧的事件监听方式迁移

**旧方式:**

```typescript
webOperateService.on("taskStartTip", (tip: string) => {
  // 处理逻辑
});
```

**新方式:**

```typescript
const callback = (tip: string) => {
  // 处理逻辑
};

webOperateService.onTaskTip(callback);

// 记得在适当时机清理
webOperateService.offTaskTip(callback);
```

## 注意事项

1. **及时清理**: 使用完毕后务必调用 `offTaskTip()` 移除回调，避免内存泄漏
2. **错误处理**: 回调中的错误会被自动捕获，不会影响其他回调的执行
3. **执行顺序**: 回调按照注册顺序执行
4. **线程安全**: 回调机制是线程安全的，可以在多个地方同时使用
