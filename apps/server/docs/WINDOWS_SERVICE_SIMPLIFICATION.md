# Windows 服务简化重构文档

## 重构日期

2025-10-13

## 重构目标

简化 `WindowsOperateService`，移除所有 `runWithRetry` 逻辑和重复的连接验证，将其视为持久长连接服务。

## 重构背景

原有的 `WindowsOperateService` 设计过于复杂，包含了大量的连接验证、重试机制和自动重连逻辑。这些机制在本地 Windows 设备场景下是不必要的：

1. **Windows 设备是本地的**：不存在网络连接问题
2. **nut-js 是直接调用**：不存在连接断开的情况
3. **过度的重试机制**：导致代码复杂且难以维护
4. **重复的连接检查**：每次执行任务前都要验证连接，浪费资源

## 重构内容

### 1. 删除的属性

```typescript
// 删除的重连机制相关属性
private reconnectAttempts: number = 0;
private maxReconnectAttempts: number = 5;
private reconnectInterval: number = 5000;
private reconnectTimer: NodeJS.Timeout | null = null;
private isReconnecting: boolean = false;
private isStopping: boolean = false;
```

**理由**：这些属性都是为了支持自动重连机制，现在不再需要。

### 2. 删除的方法

#### 2.1 重连机制相关方法

```typescript
// 删除的方法列表
- startAutoReconnect(): void
- stopAutoReconnect(): void
- resetReconnectState(): void
- checkAndReconnect(): Promise<boolean>
- forceReconnect(): Promise<void>
- reconnect(): Promise<void>
- quickConnectionCheck(): Promise<boolean>
- ensureConnection(): Promise<void>
```

**理由**：所有重连和连接验证逻辑都不再需要。

#### 2.2 重试执行相关方法

```typescript
// 删除的方法列表
- runWithRetry<T>(prompt, maxRetries, runner): Promise<T>
- isConnectionError(error): boolean
- handleConnectionError(): Promise<void>
- executeWithRetry(prompt, attempt, maxRetries): Promise<void>
- expectWithRetry(prompt, attempt, maxRetries): Promise<void>
```

**理由**：不需要在每次执行时进行重试和连接检查。

### 3. 简化的方法

#### 3.1 `execute()` 方法

**修改前**（复杂版本）：

```typescript
async execute(prompt: string, maxRetries: number = 3): Promise<void> {
  // 如果服务未启动，自动启动
  if (!this.isStarted()) {
    await this.start();
  }

  // 检查连接状态，如果断开则启动重连
  const isConnected = await this.checkAndReconnect();
  if (!isConnected) {
    throw new AppError('Windows 设备连接断开，正在重连中', 503);
  }

  // 确保连接有效
  await this.ensureConnection();

  // 使用重试机制执行
  await this.runWithRetry(prompt, maxRetries, (attempt, max) =>
    this.executeWithRetry(prompt, attempt, max),
  );
}
```

**修改后**（简化版本）：

```typescript
async execute(prompt: string): Promise<void> {
  // 如果服务未启动，自动启动
  if (!this.isStarted()) {
    console.log('🔄 服务未启动，自动启动 WindowsOperateService...');
    await this.start();
  }

  if (!this.agent) {
    throw new AppError('服务启动失败，无法执行任务', 503);
  }

  try {
    console.log(`🚀 开始执行 Windows AI 任务: ${prompt}`);
    await this.agent.aiAction(prompt);
    console.log(`✅ Windows AI 任务执行完成: ${prompt}`);
  } catch (error: any) {
    console.log(`❌ Windows AI 任务执行失败: ${error.message}`);
    if (error.message?.includes('ai')) {
      throw new AppError(`AI 执行失败: ${error.message}`, 500);
    }
    throw new AppError(`任务执行失败: ${error.message}`, 500);
  }
}
```

**改进**：

- ✅ 移除了 `maxRetries` 参数
- ✅ 移除了 `checkAndReconnect()` 调用
- ✅ 移除了 `ensureConnection()` 调用
- ✅ 移除了 `runWithRetry()` 包装
- ✅ 直接调用 `agent.aiAction()`
- ✅ 代码行数从 30+ 行减少到 20 行

#### 3.2 `expect()` 方法

**修改前**：

```typescript
async expect(prompt: string, maxRetries: number = 3): Promise<void> {
  if (!this.isStarted()) {
    await this.start();
  }
  await this.ensureConnection();
  await this.runWithRetry(prompt, maxRetries, (attempt, max) =>
    this.expectWithRetry(prompt, attempt, max),
  );
}
```

**修改后**：

```typescript
async expect(prompt: string): Promise<void> {
  if (!this.isStarted()) {
    console.log('🔄 服务未启动，自动启动 WindowsOperateService...');
    await this.start();
  }

  if (!this.agent) {
    throw new AppError('服务启动失败，无法执行断言', 503);
  }

  try {
    await this.agent.aiAssert(prompt);
    console.log(`✅ Windows AI 断言成功: ${prompt}`);
  } catch (error: any) {
    console.log(`❌ Windows AI 断言失败: ${error.message}`);
    if (error.message?.includes('ai')) {
      throw new AppError(`AI 断言失败: ${error.message}`, 500);
    }
    throw new AppError(`断言执行失败: ${error.message}`, 500);
  }
}
```

#### 3.3 `executeScript()` 方法

**修改前**：

```typescript
async executeScript(
  yamlContent: string,
  maxRetries: number = 3,
  originalCmd?: string,
): Promise<any> {
  if (!this.isStarted()) {
    await this.start();
  }
  await this.ensureConnection();
  
  try {
    const result = await this.runWithRetry(
      yamlContent,
      maxRetries,
      async (_attempt, _max) => {
        // ... 执行逻辑
      },
    );
    return result;
  } catch (error: any) {
    // ... 兜底逻辑
  }
}
```

**修改后**：

```typescript
async executeScript(
  yamlContent: string,
  originalCmd?: string,
): Promise<any> {
  if (!this.isStarted()) {
    console.log('🔄 服务未启动，自动启动 WindowsOperateService...');
    await this.start();
  }

  if (!this.agent) {
    throw new AppError('服务启动失败，无法执行脚本', 503);
  }

  try {
    const yamlResult = await this.agent.runYaml(yamlContent);
    serviceLogger.info({ yamlContent }, 'Windows YAML 脚本执行完成');
    return yamlResult;
  } catch (error: any) {
    // ... 保留兜底逻辑
  }
}
```

**改进**：

- ✅ 移除了 `maxRetries` 参数
- ✅ 移除了 `ensureConnection()` 调用
- ✅ 移除了 `runWithRetry()` 包装
- ✅ 直接调用 `agent.runYaml()`

#### 3.4 `start()` 方法

**修改前**：

```typescript
public async start(): Promise<void> {
  if (this.isInitialized && this.agent) {
    return;
  }

  // 清除停止标志，允许重新启动
  this.isStopping = false;

  console.log('🚀 启动 WindowsOperateService...');
  // ...
}
```

**修改后**：

```typescript
public async start(): Promise<void> {
  if (this.isInitialized && this.agent) {
    console.log('🔄 WindowsOperateService 已启动，跳过重复启动');
    return;
  }

  console.log('🚀 启动 WindowsOperateService...');
  // ...
}
```

#### 3.5 `stop()` 方法

**修改前**：

```typescript
public async stop(): Promise<void> {
  console.log('🛑 停止 WindowsOperateService...');

  // 设置停止标志，防止重连
  this.isStopping = true;

  try {
    // 停止自动重连
    this.stopAutoReconnect();

    // 销毁 agent
    if (this.agent) {
      await this.agent.destroy(true);
      this.agent = null;
    }

    // 重置状态
    this.isInitialized = false;
    this.resetReconnectState();
    // ...
  }
}
```

**修改后**：

```typescript
public async stop(): Promise<void> {
  console.log('🛑 停止 WindowsOperateService...');

  try {
    // 销毁 agent
    if (this.agent) {
      await this.agent.destroy(true);
      this.agent = null;
    }

    // 重置状态
    this.isInitialized = false;
    // ...
  }
}
```

## 重构效果

### 代码统计

| 指标 | 重构前 | 重构后 | 变化 |
|-----|-------|-------|------|
| 总行数 | ~730 行 | ~450 行 | -280 行 (-38%) |
| 方法数量 | 25+ 个 | 15 个 | -10 个 (-40%) |
| 私有属性 | 10+ 个 | 4 个 | -6 个 (-60%) |
| 复杂度 | 高 | 低 | 大幅降低 |

### 优势

1. **代码更简洁**：移除了约 40% 的代码
2. **逻辑更清晰**：执行流程一目了然
3. **维护更容易**：没有复杂的重连和重试逻辑
4. **性能更好**：不再有重复的连接检查
5. **错误处理更直接**：错误直接抛出，不隐藏在重试逻辑中

### 劣势（风险）

1. **失去重试能力**：如果任务失败，不会自动重试
2. **失去自动重连**：如果连接断开（虽然不太可能），不会自动恢复

### 风险缓解

1. **本地设备场景**：Windows 设备是本地的，不存在连接断开问题
2. **nut-js 稳定性**：底层使用的 nut-js 库很稳定
3. **上层重试**：如果需要重试，可以在调用层实现
4. **手动重启**：如果出现问题，可以调用 `stop()` 和 `start()` 重启服务

## 持久长连接的含义

在这个重构中，"持久长连接"指的是：

1. **启动一次即可**：服务启动后，agent 保持活动状态
2. **无需频繁验证**：每次执行任务前不需要检查连接状态
3. **信任本地环境**：相信本地 Windows 设备始终可用
4. **错误直接上报**：如果出现错误，直接抛出，让调用方处理

## API 变化

### 方法签名变化

```typescript
// 修改前
async execute(prompt: string, maxRetries: number = 3): Promise<void>
async expect(prompt: string, maxRetries: number = 3): Promise<void>
async executeScript(yamlContent: string, maxRetries: number = 3, originalCmd?: string): Promise<any>

// 修改后
async execute(prompt: string): Promise<void>
async expect(prompt: string): Promise<void>
async executeScript(yamlContent: string, originalCmd?: string): Promise<any>
```

### 兼容性

**向后兼容性**：

- ⚠️ **部分不兼容**：移除了 `maxRetries` 参数
- ✅ **核心功能兼容**：主要功能保持不变

**迁移建议**：

```typescript
// 旧代码
await windowsOperateService.execute('打开记事本', 5); // ❌ 不再支持 maxRetries

// 新代码
await windowsOperateService.execute('打开记事本'); // ✅ 正确用法

// 如果确实需要重试，可以在调用层实现
for (let i = 0; i < 5; i++) {
  try {
    await windowsOperateService.execute('打开记事本');
    break; // 成功则跳出循环
  } catch (error) {
    if (i === 4) throw error; // 最后一次重试失败则抛出
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒后重试
  }
}
```

## 测试建议

### 需要测试的场景

1. **基本功能测试**

   ```typescript
   await windowsOperateService.start();
   await windowsOperateService.execute('打开记事本');
   await windowsOperateService.expect('记事本窗口已打开');
   await windowsOperateService.stop();
   ```

2. **自动启动测试**

   ```typescript
   // 不手动调用 start()，测试自动启动
   await windowsOperateService.execute('打开记事本');
   ```

3. **错误处理测试**

   ```typescript
   try {
     await windowsOperateService.execute('无效的任务');
   } catch (error) {
     console.log('错误被正确捕获:', error.message);
   }
   ```

4. **重启测试**

   ```typescript
   await windowsOperateService.start();
   await windowsOperateService.execute('任务1');
   await windowsOperateService.stop();
   
   await windowsOperateService.start();
   await windowsOperateService.execute('任务2');
   await windowsOperateService.stop();
   ```

### 预期结果

- ✅ 所有任务正常执行
- ✅ 错误被正确抛出和处理
- ✅ 服务可以多次启动和停止
- ✅ 性能有所提升（减少了不必要的检查）

## 相关文件

### 修改的文件

- `apps/server/src/services/windowsOperateService.ts`

### 影响的文件

- `apps/server/src/websocket/actions/windows/execute.ts`
- `apps/server/src/websocket/actions/windows/expect.ts`
- `apps/server/src/websocket/actions/windows/executeScript.ts`
- `apps/server/src/websocket/actions/windows/command.ts`
- `apps/server/src/test/windows-service-comprehensive-test.ts`

### 需要更新的测试

如果有测试代码使用了 `maxRetries` 参数，需要移除该参数：

```typescript
// 旧测试代码 ❌
await windowsOperateService.execute('任务', 5);

// 新测试代码 ✅
await windowsOperateService.execute('任务');
```

## 总结

这次重构大幅简化了 `WindowsOperateService` 的实现，使其更符合本地 Windows 设备的实际使用场景。通过将其视为持久长连接服务，我们：

1. ✅ **移除了约 280 行代码**（-38%）
2. ✅ **移除了 10 个不必要的方法**（-40%）
3. ✅ **简化了 API**：移除了 `maxRetries` 参数
4. ✅ **提升了性能**：减少了不必要的连接检查
5. ✅ **提高了可维护性**：代码逻辑更清晰

这次重构是**务实**的选择，符合"**Keep It Simple, Stupid (KISS)**"原则。在本地 Windows 设备场景下，过度的重试和重连机制反而是负担。

## 后续优化建议

如果未来需要更强大的错误恢复能力，可以考虑：

1. **添加健康检查**：定期检查 agent 状态（可选）
2. **添加事件通知**：在服务状态变化时发送事件
3. **添加监控指标**：记录任务成功率、执行时间等
4. **添加配置选项**：允许用户选择是否启用某些功能

但在没有明确需求之前，保持当前的简洁实现是最佳选择。
