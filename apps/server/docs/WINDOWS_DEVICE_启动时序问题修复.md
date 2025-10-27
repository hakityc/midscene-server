# WindowsDevice 启动时序问题修复

## 问题描述

在 `WindowsDevice` 的 `launch()` 方法中存在一个状态检查时序问题，导致设备启动失败。

### 错误信息

```
WindowsDevice "Windows Desktop" not launched. Call launch() first.
    at WindowsDevice.checkState (/path/to/windowsDevice.ts:164:13)
    at WindowsDevice.assertNotDestroyed (/path/to/windowsDevice.ts:471:10)
    at WindowsDevice.size (/path/to/windowsDevice.ts:280:10)
    at WindowsDevice.initializeDeviceInfo (/path/to/windowsDevice.ts:120:29)
    at WindowsDevice.launch (/path/to/windowsDevice.ts:112:16)
```

### 错误调用链

1. `WindowsDevice.launch()` 被调用
2. 在 launch 中调用 `initializeDeviceInfo()`
3. `initializeDeviceInfo()` 调用 `size()` 获取屏幕尺寸
4. `size()` 调用 `assertNotDestroyed()` 检查设备状态
5. `assertNotDestroyed()` 调用 `checkState()` 检查 `isLaunched` 状态
6. 由于此时 `isLaunched` 仍为 `false`，抛出"设备未启动"错误

## 根本原因

在原始代码中，`launch()` 方法的执行顺序存在问题：

```typescript
async launch(): Promise<void> {
  // ...
  
  // 初始化设备信息
  await this.initializeDeviceInfo();  // ← 这里会调用需要 isLaunched=true 的方法
  this.isLaunched = true;             // ← 但 isLaunched 在这里才设置为 true
}
```

**问题所在：**

- `this.isLaunched = true` 的赋值在 `initializeDeviceInfo()` 调用**之后**
- 但 `initializeDeviceInfo()` 内部调用的 `size()` 等方法需要通过 `checkState()` 检查 `isLaunched` 状态
- 形成了一个"先有鸡还是先有蛋"的循环依赖问题

## 解决方案

### 修复方法

将 `this.isLaunched = true` 的赋值移到 `initializeDeviceInfo()` 调用**之前**：

```typescript
async launch(): Promise<void> {
  if (this.isLaunched) {
    if (this.options.debug) {
      console.log('⚠️ WindowsDevice already launched, skipping');
    }
    return;
  }

  if (this.options.debug) {
    console.log(`🚀 Windows device launched: ${this.options.deviceName}`);
  }

  // 设置启动状态，必须在 initializeDeviceInfo 之前
  // 因为 initializeDeviceInfo 会调用 size() 等方法，这些方法需要检查 isLaunched 状态
  this.isLaunched = true;

  // 初始化设备信息
  await this.initializeDeviceInfo();
}
```

### 修复位置

- 文件：`apps/server/src/services/customMidsceneDevice/windowsDevice.ts`
- 方法：`launch()`
- 行号：107-116

## 影响范围

### 受影响的组件

1. **WindowsOperateService**
   - `createAgent()` 方法中创建 `AgentOverWindows` 时会调用 `launch()`
   - 启动失败会导致整个 Windows 操作服务无法正常工作

2. **AgentOverWindows**
   - `launch()` 方法中调用 `WindowsDevice.launch()`
   - 依赖设备正确启动才能继续后续操作

3. **WebSocket 测试接口**
   - `windows_test` action 会触发服务启动
   - 设备启动失败会导致测试无法执行

### 修复效果

修复后，设备启动流程能够正常执行：

1. ✅ 设置 `isLaunched = true`
2. ✅ 调用 `initializeDeviceInfo()`
3. ✅ `initializeDeviceInfo()` 调用 `size()` 成功（通过状态检查）
4. ✅ 获取屏幕尺寸并初始化设备描述
5. ✅ 设备启动完成

## 相关设计模式

### 状态检查机制

`WindowsDevice` 实现了统一的状态检查机制：

```typescript
private checkState(): void {
  if (this.destroyed) {
    throw new Error(
      `WindowsDevice "${this.options.deviceName}" has been destroyed and cannot execute operations`,
    );
  }
  if (!this.isLaunched) {
    throw new Error(
      `WindowsDevice "${this.options.deviceName}" not launched. Call launch() first.`,
    );
  }
}
```

这个机制在所有操作方法（`size()`, `screenshotBase64()`, `mouseClick()` 等）执行前都会被调用，确保设备处于可用状态。

### 最佳实践建议

1. **状态设置时机**：在需要该状态的操作执行前就应该设置好状态标志
2. **初始化顺序**：初始化方法应该在状态标志设置之后调用
3. **错误处理**：提供清晰的错误信息，帮助快速定位问题

## 测试验证

修复后应验证以下场景：

1. ✅ 设备首次启动成功
2. ✅ 设备重复启动时正确跳过（已启动检查）
3. ✅ 截图功能正常工作
4. ✅ 鼠标操作正常工作
5. ✅ 设备销毁后无法操作（状态检查生效）

## 相关文档

- [WINDOWS_DEVICE_IMPLEMENTATION.md](./customMidsceneDevice/WINDOWS_DEVICE_IMPLEMENTATION.md) - WindowsDevice 实现文档
- [WINDOWS_SERVICE_INTEGRATION.md](./WINDOWS_SERVICE_INTEGRATION.md) - Windows 服务集成文档
- [WINDOWS_ARCHITECTURE_REFACTORING.md](./WINDOWS_ARCHITECTURE_REFACTORING.md) - Windows 架构重构文档

## 版本信息

- **修复日期**：2025-10-13
- **影响版本**：所有包含 WindowsDevice 的版本
- **修复提交**：待提交
