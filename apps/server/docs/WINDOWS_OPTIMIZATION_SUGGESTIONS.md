# Windows 实现优化建议

对比 Android SDK 实现后，发现 Windows 这边可以优化的地方。

---

## 🎯 核心优化建议

### 1. 简化 AgentOverWindows 的构造函数

**当前代码**：

```typescript
constructor(opts?: AgentOverWindowsOpt) {
  const windowsDevice = new WindowsDevice(opts?.deviceOptions);
  const originalOnTaskStartTip = opts?.onTaskStartTip;
  
  // ❓ 这个包装是否必要？
  super(windowsDevice, {
    ...opts,
    onTaskStartTip: originalOnTaskStartTip
      ? (tip: string) => {
          if (originalOnTaskStartTip) {
            originalOnTaskStartTip.call(this, tip);
          }
        }
      : undefined,
  });
}
```

**问题**：

- 对 `onTaskStartTip` 做了额外包装
- `if (originalOnTaskStartTip)` 检查是重复的（外层已经检查过）
- 使用 `call(this, tip)` 不如直接调用

**优化建议**：

```typescript
constructor(opts?: AgentOverWindowsOpt) {
  const windowsDevice = new WindowsDevice(opts?.deviceOptions);
  
  // ✅ 直接传递 opts，不做额外处理
  // Agent 基类会正确处理 onTaskStartTip
  super(windowsDevice, opts);
  
  this.destroyAfterDisconnectFlag = opts?.closeAfterDisconnect;
}
```

**参考 Android**：

```typescript
// AndroidAgent 完全不处理回调
export class AndroidAgent extends PageAgent<AndroidDevice> {
  // 构造函数直接传递给基类
  // 没有任何额外的回调处理逻辑
}
```

---

### 2. 移除或简化 `isLaunched` 状态管理

**当前代码**：

```typescript
export class AgentOverWindows extends Agent<WindowsDevice> {
  private isLaunched = false;
  
  async launch(): Promise<void> {
    if (this.isLaunched) {
      console.log('⚠️ WindowsDevice already launched, skipping');
      return;
    }
    await this.interface.launch();
    this.isLaunched = true;
  }
  
  private assertLaunched(): void {
    if (!this.isLaunched) {
      throw new Error('WindowsDevice not launched...');
    }
    if (this.destroyed) {
      throw new Error('Agent has been destroyed...');
    }
  }
  
  // 每个方法都要调用
  async aiAction(prompt: string, options?: any) {
    this.assertLaunched();
    return await this.ai(prompt, options?.type);
  }
}
```

**问题**：

- `isLaunched` 状态与 `WindowsDevice` 内部状态重复
- `assertLaunched()` 需要在每个方法中手动调用
- `WindowsDevice` 本身已经有状态检查

**优化建议 1：委托给 WindowsDevice**

```typescript
export class AgentOverWindows extends Agent<WindowsDevice> {
  // ✅ 移除 isLaunched，让 WindowsDevice 管理自己的状态
  
  async launch(): Promise<void> {
    // WindowsDevice 内部会处理重复启动的情况
    await this.interface.launch();
  }
  
  // ✅ 移除 assertLaunched()
  // WindowsDevice 的方法会自己检查状态
  
  async aiAction(prompt: string, options?: any) {
    // WindowsDevice 的方法会检查是否已启动
    return await this.ai(prompt, options?.type);
  }
}
```

**优化建议 2：在 WindowsDevice 中统一处理**

```typescript
export class WindowsDevice implements AbstractInterface {
  private isLaunched = false;
  private destroyed = false;
  
  async launch(): Promise<void> {
    if (this.isLaunched) return;
    // 初始化逻辑
    this.isLaunched = true;
  }
  
  async screenshot(): Promise<string> {
    this.checkState(); // 统一检查点
    return await this.nativeImpl.screenshot();
  }
  
  private checkState(): void {
    if (this.destroyed) {
      throw new Error('WindowsDevice has been destroyed');
    }
    if (!this.isLaunched) {
      throw new Error('WindowsDevice not launched. Call launch() first.');
    }
  }
}
```

---

### 3. 简化便捷方法

**当前代码**：

```typescript
export class AgentOverWindows extends Agent<WindowsDevice> {
  // 这两个方法只是简单的别名
  async execute(prompt: string): Promise<void> {
    await this.aiAction(prompt);
  }
  
  async expect(assertion: string): Promise<void> {
    await this.aiAssert(assertion);
  }
}
```

**问题**：

- `execute` 和 `expect` 只是 `aiAction` 和 `aiAssert` 的别名
- 增加了 API 复杂度，没有实质性价值
- Android 没有这些别名方法

**优化建议**：

```typescript
// ✅ 选项 1：完全移除这些别名
// 用户直接使用 aiAction 和 aiAssert

// ✅ 选项 2：如果确实需要，在文档中说明
/**
 * @deprecated 使用 aiAction() 代替
 */
async execute(prompt: string): Promise<void> {
  return this.aiAction(prompt);
}
```

---

### 4. WindowsOperateService 的优化（保留但简化）

**当前架构**：

```
WebSocket Handler
    ↓
WindowsOperateService (单例)
    ↓
AgentOverWindows
    ↓
WindowsDevice
```

**为什么需要 Service 层**：

- ✅ **解耦**：node 服务处理多种类型（chromeExt、windows 等）
- ✅ **统一接口**：为 WebSocket handlers 提供一致的 API
- ✅ **未来拆分**：后续可能把 windows 模块独立部署
- ✅ **状态管理**：统一管理 agent 实例和生命周期

**当前问题**：

- Service 中的 `createAgent()` 方法过于复杂
- 回调处理逻辑重复
- 初始化流程不够清晰

**优化建议**：

```typescript
export class WindowsOperateService extends EventEmitter {
  private agent: AgentOverWindows | null = null;
  private isInitialized: boolean = false;
  
  // ✅ 简化配置，回调在 createAgent 中动态创建
  private readonly defaultAgentConfig: Omit<AgentOverWindowsOpt, 'onTaskStartTip'> = {
    closeAfterDisconnect: false,
    generateReport: true,
    autoPrintReportMsg: true,
    deviceOptions: {
      deviceName: 'Windows Desktop',
      debug: true,
    },
  };
  
  // ✅ 简化 agent 创建逻辑
  private async createAgent(): Promise<void> {
    if (this.agent) {
      console.log('🔄 AgentOverWindows 已存在，先销毁旧实例');
      await this.agent.destroy(true);
    }
    
    // ✅ 直接创建，回调在这里定义一次
    this.agent = new AgentOverWindows({
      ...this.defaultAgentConfig,
      onTaskStartTip: (tip: string) => {
        this.handleTaskStartTip(tip);
      },
    });
    
    // ✅ 立即启动
    await this.agent.launch();
    this.isInitialized = true;
  }
  
  // ✅ 简化 start 方法
  public async start(): Promise<void> {
    if (this.isInitialized && this.agent) {
      return;
    }
    
    await this.createAgent();
  }
  
  // ✅ 简化业务方法
  async execute(prompt: string): Promise<void> {
    await this.ensureStarted();
    await this.agent!.aiAction(prompt);
  }
  
  private async ensureStarted(): Promise<void> {
    if (!this.agent || !this.isInitialized) {
      await this.start();
    }
  }
}
```

---

### 5. 移除冗余的包装方法

**当前代码**：

```typescript
export class AgentOverWindows extends Agent<WindowsDevice> {
  // 这些方法只是简单转发
  async getWindowList(): Promise<Array<{...}>> {
    this.assertLaunched();
    return await this.interface.getWindowList();
  }
  
  async activateWindow(windowHandle: string): Promise<void> {
    this.assertLaunched();
    await this.interface.activateWindow(windowHandle);
  }
  
  async getClipboard(): Promise<string> {
    this.assertLaunched();
    return await this.interface.getClipboard();
  }
  
  async setClipboard(text: string): Promise<void> {
    this.assertLaunched();
    await this.interface.setClipboard(text);
  }
  
  async getDeviceInfo(): Promise<{...}> {
    this.assertLaunched();
    return await this.interface.size();
  }
  
  async screenshot(): Promise<string> {
    this.assertLaunched();
    return await this.interface.screenshotBase64();
  }
}
```

**问题**：

- 这些方法只是简单转发给 `this.interface`
- 唯一的作用是调用 `assertLaunched()`
- 如果 `WindowsDevice` 自己做状态检查，这些方法就没必要了

**优化建议**：

```typescript
export class AgentOverWindows extends Agent<WindowsDevice> {
  // ✅ 直接暴露 device 的方法，不做包装
  // 用户可以通过 this.interface 访问
  
  // 或者使用 getter
  get device(): WindowsDevice {
    return this.interface;
  }
}

// 使用
await agent.device.getWindowList();
await agent.device.activateWindow(handle);
```

**或者保留关键方法，移除不必要的**：

```typescript
export class AgentOverWindows extends Agent<WindowsDevice> {
  // ✅ 只保留有实际价值的方法
  
  // 保留：因为是高频操作
  async screenshot(): Promise<string> {
    return await this.interface.screenshotBase64();
  }
  
  // 移除：直接用 this.interface.getWindowList() 即可
  // getWindowList()
  // activateWindow()
  // getClipboard()
  // setClipboard()
}
```

---

### 6. 改进 WindowsDevice 的状态管理

**当前问题**：

- 状态分散在 `AgentOverWindows` 和 `WindowsDevice` 中
- 没有统一的状态检查机制

**优化建议**：

```typescript
export class WindowsDevice implements AbstractInterface {
  private state: 'not-launched' | 'launching' | 'ready' | 'destroyed' = 'not-launched';
  
  async launch(): Promise<void> {
    if (this.state === 'ready') return;
    if (this.state === 'destroyed') {
      throw new Error('Device has been destroyed');
    }
    
    this.state = 'launching';
    try {
      // 初始化逻辑
      this.state = 'ready';
    } catch (error) {
      this.state = 'not-launched';
      throw error;
    }
  }
  
  async screenshot(): Promise<string> {
    this.assertReady();
    return await this.nativeImpl.screenshot();
  }
  
  private assertReady(): void {
    if (this.state === 'not-launched') {
      throw new Error('Device not launched. Call launch() first.');
    }
    if (this.state === 'launching') {
      throw new Error('Device is still launching. Please wait.');
    }
    if (this.state === 'destroyed') {
      throw new Error('Device has been destroyed');
    }
  }
  
  async destroy(): Promise<void> {
    if (this.state === 'destroyed') return;
    // 清理逻辑
    this.state = 'destroyed';
  }
}
```

---

## 📊 优化对比总结

| 优化点 | 当前实现 | 优化后 | 收益 |
|--------|---------|--------|------|
| **构造函数回调处理** | 额外包装 | 直接传递 | 简化代码，减少 bug |
| **状态管理** | Agent + Device 双重管理 | Device 统一管理 | 单一职责，减少冗余 |
| **便捷方法** | execute/expect 别名 | 移除或标记废弃 | 减少 API 复杂度 |
| **Service 层** | 单例 Service | 工厂函数或简化 | 灵活性更高 |
| **转发方法** | 多个简单转发方法 | 暴露 device 或移除 | 减少代码量 |
| **状态检查** | 手动 assertLaunched() | 自动检查 | 减少遗漏风险 |

---

## 🚀 最小化改动建议（渐进式优化）

如果不想大改架构，可以先做这些最小改动：

### 改动 1：简化构造函数

```typescript
constructor(opts?: AgentOverWindowsOpt) {
  const windowsDevice = new WindowsDevice(opts?.deviceOptions);
  super(windowsDevice, opts); // 直接传递，不包装
  this.destroyAfterDisconnectFlag = opts?.closeAfterDisconnect;
}
```

### 改动 2：在 WindowsDevice 中添加统一检查

```typescript
export class WindowsDevice {
  private checkState() {
    if (this.destroyed) throw new Error('Device destroyed');
    if (!this.isLaunched) throw new Error('Device not launched');
  }
  
  // 在每个方法开头调用
  async screenshot() {
    this.checkState();
    // ...
  }
}
```

### 改动 3：移除 AgentOverWindows 中的 isLaunched

```typescript
// 删除 isLaunched 属性
// 删除 assertLaunched() 方法
// launch() 直接调用 this.interface.launch()
async launch() {
  await this.interface.launch();
}
```

### 改动 4：标记废弃便捷方法

```typescript
/** @deprecated 请使用 aiAction() */
async execute(prompt: string) {
  return this.aiAction(prompt);
}

/** @deprecated 请使用 aiAssert() */
async expect(assertion: string) {
  return this.aiAssert(assertion);
}
```

---

## 💡 长期优化建议

1. **保持 Service 层的清晰职责**
   - ✅ Service 层负责：生命周期管理、统一接口、解耦
   - ✅ Agent 层负责：AI 任务执行、高级操作
   - ✅ Device 层负责：底层设备操作、状态管理

2. **统一状态管理**
   - 只在 WindowsDevice 管理底层状态（launched/destroyed）
   - AgentOverWindows 不维护重复的状态
   - Service 只管理 agent 实例的生命周期

3. **减少包装层**
   - 移除 AgentOverWindows 中不必要的转发方法
   - 保留有实际价值的高级方法

4. **参考 Android，但保持 Service 层**
   - AndroidAgent 简洁（无 Service 是因为使用场景不同）
   - Windows 需要 Service 是因为：
     - node 服务统一处理多种客户端类型
     - 未来模块化拆分的需要
     - WebSocket 集成的统一接口

5. **清晰的职责划分**

   ```
   Service 层：
   - 管理 agent 生命周期
   - 提供统一的业务接口
   - 处理跨模块的回调和事件
   
   Agent 层：
   - 执行 AI 任务
   - 提供高级自动化方法
   - 继承 Midscene 基础能力
   
   Device 层：
   - 底层设备操作
   - 状态管理
   - 错误处理
   ```

这样可以让代码更简洁、职责更清晰、更易维护。
