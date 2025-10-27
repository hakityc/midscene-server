# Windows Agent 功能对比和扩展分析

## 📊 Midscene 官方 API 完整清单

### 1. 自动规划类 (Auto Planning)

| 方法 | 说明 | Windows 支持 | 备注 |
|------|------|-------------|------|
| `agent.aiAction(prompt)` | 执行自然语言描述的任务，AI 自动规划步骤 | ✅ 完全支持 | 继承自 Agent 基类 |
| `agent.ai(prompt, type)` | 通用 AI 方法，根据 type 路由到不同方法 | ✅ 完全支持 | 继承自 Agent 基类 |
| `agent.runYaml(yamlContent)` | 执行 YAML 脚本 | ✅ 完全支持 | 继承自 Agent 基类 |

### 2. 即时动作类 (Instant Actions)

| 方法 | 说明 | Windows 支持 | 实现状态 |
|------|------|-------------|---------|
| `agent.aiTap(locator, opt?)` | 点击指定元素 | ✅ 完全支持 | WindowsDevice.actionSpace() → Tap |
| `agent.aiDoubleClick(locator, opt?)` | 双击指定元素 | ✅ 完全支持 | WindowsDevice.actionSpace() → DoubleClick |
| `agent.aiRightClick(locator, opt?)` | 右键点击指定元素 | ✅ 完全支持 | WindowsDevice.actionSpace() → RightClick |
| `agent.aiHover(locator, opt?)` | 鼠标悬停在指定元素 | ✅ 完全支持 | WindowsDevice.actionSpace() → Hover |
| `agent.aiInput(value, locator, opt?)` | 在指定元素输入文本 | ✅ 完全支持 | WindowsDevice.actionSpace() → Input |
| `agent.aiKeyboardPress(keyName, locator?, opt?)` | 按下键盘按键 | ✅ 完全支持 | WindowsDevice.actionSpace() → KeyboardPress |
| `agent.aiScroll(param, locator?, opt?)` | 滚动操作 | ✅ 完全支持 | WindowsDevice.actionSpace() → Scroll |

### 3. 查询类 (Query)

| 方法 | 说明 | Windows 支持 | 备注 |
|------|------|-------------|------|
| `agent.aiQuery(demand, opt?)` | AI 查询，返回任意类型数据 | ✅ 完全支持 | 继承自 Agent 基类 |
| `agent.aiString(prompt, opt?)` | AI 查询，返回字符串 | ✅ 完全支持 | 继承自 Agent 基类 |
| `agent.aiNumber(prompt, opt?)` | AI 查询，返回数字 | ✅ 完全支持 | 继承自 Agent 基类 |
| `agent.aiBoolean(prompt, opt?)` | AI 查询，返回布尔值 | ✅ 完全支持 | 继承自 Agent 基类 |
| `agent.aiAsk(prompt, opt?)` | AI 询问（等同于 aiString） | ✅ 完全支持 | 继承自 Agent 基类 |

### 4. 断言和等待类 (Assert & Wait)

| 方法 | 说明 | Windows 支持 | 备注 |
|------|------|-------------|------|
| `agent.aiAssert(assertion, msg?, opt?)` | AI 断言，验证条件是否满足 | ✅ 完全支持 | 继承自 Agent 基类 |
| `agent.aiWaitFor(assertion, opt?)` | 等待条件满足 | ✅ 完全支持 | 继承自 Agent 基类 |

### 5. 定位类 (Locate)

| 方法 | 说明 | Windows 支持 | 备注 |
|------|------|-------------|------|
| `agent.aiLocate(prompt, opt?)` | 定位元素 | ✅ 完全支持 | 继承自 Agent 基类 |

### 6. 其他工具方法

| 方法 | 说明 | Windows 支持 | 备注 |
|------|------|-------------|------|
| `agent.logScreenshot(name, content?)` | 记录截图到报告 | ✅ 完全支持 | 继承自 Agent 基类 |
| `agent.logText(text)` | 记录文本到报告 | ✅ 完全支持 | 继承自 Agent 基类 |

---

## 🎯 WindowsDevice 已实现的操作

### 1. 标准 Midscene 动作 (已实现)

| 动作名称 | 实现方法 | 底层实现 | 备注 |
|---------|---------|---------|------|
| **Tap** | `defineActionTap()` | `windowsNative.mouseClick()` | ✅ 完整实现 |
| **DoubleClick** | `defineActionDoubleClick()` | `windowsNative.mouseDoubleClick()` | ✅ 完整实现 |
| **RightClick** | `defineActionRightClick()` | `windowsNative.mouseRightClick()` | ✅ 完整实现 |
| **Hover** | `defineActionHover()` | `windowsNative.mouseHover()` | ✅ 完整实现 |
| **Input** | `defineActionInput()` | `windowsNative.typeText()` | ✅ 完整实现 |
| **KeyboardPress** | `defineActionKeyboardPress()` | `windowsNative.keyPress()` | ✅ 完整实现 |
| **Scroll** | `defineActionScroll()` | `windowsNative.scrollAt()` / `scrollGlobal()` | ✅ 完整实现 |

### 2. Windows 特有动作 (自定义)

| 动作名称 | 实现方法 | 底层实现 | 备注 |
|---------|---------|---------|------|
| **DragAndDrop** | `defineAction()` 自定义 | `windowsNative.dragAndDrop()` | ✅ Windows 特有，已实现 |

---

## 🚀 Windows 特有功能 (已扩展)

### 1. 窗口管理

| 功能 | Agent 方法 | Device 方法 | 实现状态 | 备注 |
|------|-----------|------------|---------|------|
| **获取窗口列表** | `agent.getWindowList()` | `device.getWindowList()` | ⚠️ 未完全实现 | 需要 node-window-manager |
| **激活窗口** | `agent.activateWindow(handle)` | `device.activateWindow(handle)` | ⚠️ 未完全实现 | 需要 node-window-manager |

### 2. 剪贴板操作

| 功能 | Agent 方法 | Device 方法 | 实现状态 | 备注 |
|------|-----------|------------|---------|------|
| **获取剪贴板** | `agent.getClipboard()` | `device.getClipboard()` | ✅ 已实现 | 使用 nut-js |
| **设置剪贴板** | `agent.setClipboard(text)` | `device.setClipboard(text)` | ✅ 已实现 | 使用 nut-js |

### 3. 设备信息

| 功能 | Agent 方法 | Device 方法 | 实现状态 | 备注 |
|------|-----------|------------|---------|------|
| **获取设备信息** | `agent.getDeviceInfo()` | `device.size()` | ✅ 已实现 | 返回屏幕尺寸和 DPR |
| **截图** | `agent.screenshot()` | `device.screenshotBase64()` | ✅ 已实现 | 使用 nut-js |

---

## 💡 可以扩展的 Windows 特有功能

### 1. 高优先级 - 实用性强

#### 1.1 进程管理

```typescript
// 建议扩展
class AgentOverWindows extends Agent<WindowsDevice> {
  /**
   * 启动应用程序
   * @param path - 应用程序路径或命令
   * @param args - 启动参数
   */
  async launchApp(path: string, args?: string[]): Promise<number> {
    return await this.interface.launchApp(path, args);
  }

  /**
   * 关闭应用程序
   * @param processId - 进程 ID
   */
  async closeApp(processId: number): Promise<void> {
    return await this.interface.closeApp(processId);
  }

  /**
   * 获取正在运行的应用列表
   */
  async getRunningApps(): Promise<Array<{
    name: string;
    processId: number;
    path: string;
  }>> {
    return await this.interface.getRunningApps();
  }
}
```

**实现方式**:

- 使用 Node.js `child_process` 模块
- 或使用 `node-windows` 库

#### 1.2 文件对话框处理

```typescript
/**
 * 处理文件选择对话框
 * @param filePath - 要选择的文件路径
 */
async selectFile(filePath: string): Promise<void> {
  // 1. 等待文件对话框出现
  await this.aiWaitFor('文件选择对话框出现');
  
  // 2. 使用剪贴板+快捷键快速输入路径
  await this.setClipboard(filePath);
  await this.aiKeyboardPress('Control+L'); // 焦点到地址栏
  await this.aiKeyboardPress('Control+V'); // 粘贴路径
  await this.aiKeyboardPress('Enter');     // 确认
}

/**
 * 处理另存为对话框
 */
async saveFileAs(filePath: string): Promise<void> {
  await this.aiWaitFor('另存为对话框出现');
  await this.setClipboard(filePath);
  await this.aiKeyboardPress('Control+L');
  await this.aiKeyboardPress('Control+V');
  await this.aiKeyboardPress('Enter');
}
```

#### 1.3 系统托盘操作

```typescript
/**
 * 点击系统托盘图标
 * @param appName - 应用名称
 */
async clickTrayIcon(appName: string): Promise<void> {
  // 1. 显示隐藏的图标
  await this.aiTap('显示隐藏的图标按钮');
  
  // 2. 点击指定图标
  await this.aiTap(`系统托盘中的 ${appName} 图标`);
}
```

#### 1.4 快捷键组合增强

```typescript
/**
 * 按下组合键
 * @param modifiers - 修饰键 (Control, Shift, Alt, Win)
 * @param key - 主键
 */
async pressHotkey(modifiers: string[], key: string): Promise<void> {
  return await this.interface.pressHotkey(modifiers, key);
}

// 使用示例
await agent.pressHotkey(['Control', 'Shift'], 'Escape'); // 打开任务管理器
await agent.pressHotkey(['Win'], 'D');                    // 显示桌面
await agent.pressHotkey(['Alt'], 'Tab');                  // 切换窗口
```

### 2. 中优先级 - 提升体验

#### 2.1 窗口尺寸和位置管理

```typescript
/**
 * 移动窗口
 */
async moveWindow(windowHandle: string, x: number, y: number): Promise<void>;

/**
 * 调整窗口大小
 */
async resizeWindow(windowHandle: string, width: number, height: number): Promise<void>;

/**
 * 最大化窗口
 */
async maximizeWindow(windowHandle: string): Promise<void>;

/**
 * 最小化窗口
 */
async minimizeWindow(windowHandle: string): Promise<void>;

/**
 * 恢复窗口
 */
async restoreWindow(windowHandle: string): Promise<void>;
```

**实现方式**: `node-window-manager`

#### 2.2 虚拟桌面管理 (Windows 10+)

```typescript
/**
 * 切换虚拟桌面
 */
async switchVirtualDesktop(desktopIndex: number): Promise<void> {
  // 使用快捷键: Win + Ctrl + 左/右箭头
  const direction = desktopIndex > currentIndex ? 'Right' : 'Left';
  const times = Math.abs(desktopIndex - currentIndex);
  
  for (let i = 0; i < times; i++) {
    await this.pressHotkey(['Win', 'Control'], direction);
    await this.sleep(500);
  }
}

/**
 * 创建新的虚拟桌面
 */
async createVirtualDesktop(): Promise<void> {
  await this.pressHotkey(['Win', 'Control'], 'D');
}
```

#### 2.3 OCR 文本识别

```typescript
/**
 * 从屏幕区域识别文本
 * @param region - 区域坐标 {x, y, width, height}
 */
async recognizeText(region?: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Promise<string> {
  return await this.interface.recognizeText(region);
}
```

**实现方式**:

- 使用 `tesseract.js` (本地 OCR)
- 或集成云 OCR API (Azure, Google Vision, 阿里云等)

#### 2.4 屏幕录制

```typescript
/**
 * 开始录屏
 */
async startRecording(outputPath: string): Promise<void>;

/**
 * 停止录屏
 */
async stopRecording(): Promise<string>;
```

**实现方式**: `@ffmpeg-installer/ffmpeg` + `fluent-ffmpeg`

### 3. 低优先级 - 特殊场景

#### 3.1 注册表操作

```typescript
/**
 * 读取注册表
 */
async readRegistry(key: string, valueName: string): Promise<string>;

/**
 * 写入注册表
 */
async writeRegistry(key: string, valueName: string, value: string, type: string): Promise<void>;
```

**实现方式**: `regedit` npm 包

#### 3.2 性能监控

```typescript
/**
 * 获取系统性能信息
 */
async getSystemInfo(): Promise<{
  cpu: number;      // CPU 使用率
  memory: number;   // 内存使用率
  disk: number;     // 磁盘使用率
}>;
```

**实现方式**: `systeminformation` npm 包

#### 3.3 网络管理

```typescript
/**
 * 获取网络连接状态
 */
async getNetworkStatus(): Promise<{
  connected: boolean;
  type: 'wifi' | 'ethernet' | 'offline';
}>;
```

---

## 📋 对比 Android Agent

### Android 特有但 Windows 也适用的功能

| 功能 | Android | Windows | 实现难度 | 备注 |
|------|---------|---------|---------|------|
| **应用启动** | ✅ `launch(uri)` | ⚠️ 可扩展 | 简单 | 使用 child_process |
| **输入法管理** | ✅ `autoDismissKeyboard` | ❌ 不适用 | - | Windows 无需特殊处理 |
| **屏幕方向** | ✅ rotation | ❌ 不适用 | - | Windows 桌面不需要 |
| **设备连接** | ✅ ADB | ✅ 已实现 | - | Windows 是本地连接 |
| **多设备管理** | ✅ deviceId | ⚠️ 可扩展 | 中等 | 可以支持远程桌面 |

### Windows 独有优势

| 功能 | 说明 | 适用场景 |
|------|------|---------|
| **窗口管理** | 多窗口并行操作 | 桌面应用测试 |
| **文件系统访问** | 直接访问本地文件 | 文件上传/下载 |
| **系统级操作** | 注册表、服务等 | 系统管理任务 |
| **剪贴板** | 高效的数据交换 | 复制粘贴操作 |
| **快捷键** | 丰富的快捷键支持 | 提升操作效率 |

---

## 🎨 推荐的扩展优先级

### Phase 1: 立即实现 (高价值 + 低成本)

1. ✅ **完善窗口管理**
   - 安装 `node-window-manager`
   - 完整实现 `getWindowList()` 和 `activateWindow()`

2. ✅ **快捷键组合增强**
   - 实现 `pressHotkey()` 方法
   - 支持常用组合键

3. ✅ **应用启动和关闭**
   - 实现 `launchApp()` 和 `closeApp()`
   - 使用 Node.js 内置模块

### Phase 2: 近期实现 (提升体验)

1. **文件对话框处理**
   - 封装文件选择对话框操作
   - 支持多文件选择

2. **窗口尺寸管理**
   - 移动、调整大小、最大化等

3. **系统托盘操作**
   - 点击托盘图标
   - 处理托盘菜单

### Phase 3: 长期规划 (高级功能)

1. **OCR 文本识别**
   - 集成 tesseract.js
   - 支持屏幕文字识别

2. **屏幕录制**
   - 录制测试过程
   - 生成视频报告

3. **虚拟桌面管理**
   - 多桌面切换
   - 提高测试并行度

---

## 🔍 与 Web Agent (Playwright/Puppeteer) 对比

| 功能类别 | Web Agent | Windows Agent | 差异说明 |
|---------|-----------|---------------|---------|
| **元素定位** | DOM 选择器 | 视觉 AI 定位 | Windows 更灵活但更耗时 |
| **执行速度** | 快 (直接 DOM 操作) | 中等 (需要视觉识别) | Web 有优势 |
| **适用范围** | 仅网页 | 所有桌面应用 | Windows 更广泛 |
| **稳定性** | 高 (DOM 稳定) | 中等 (UI 变化敏感) | Web 更稳定 |
| **截图** | ✅ | ✅ | 都支持 |
| **网络监控** | ✅ 强大 | ❌ 不适用 | Web 独有 |
| **窗口管理** | ❌ 单页面 | ✅ 多窗口 | Windows 独有 |
| **文件操作** | ⚠️ 受限 | ✅ 完全访问 | Windows 更自由 |

---

## 📊 功能支持矩阵

| 功能 | Web | Android | iOS | Windows | 备注 |
|------|-----|---------|-----|---------|------|
| **基础 AI 操作** | ✅ | ✅ | ✅ | ✅ | 全平台支持 |
| **截图** | ✅ | ✅ | ✅ | ✅ | 全平台支持 |
| **点击** | ✅ | ✅ | ✅ | ✅ | 全平台支持 |
| **输入** | ✅ | ✅ | ✅ | ✅ | 全平台支持 |
| **滚动** | ✅ | ✅ | ✅ | ✅ | 全平台支持 |
| **悬停** | ✅ | ❌ | ❌ | ✅ | 仅 Web/Windows |
| **右键** | ✅ | ❌ | ❌ | ✅ | 仅 Web/Windows |
| **拖放** | ✅ | ✅ | ✅ | ✅ | 全平台支持 |
| **剪贴板** | ⚠️ | ⚠️ | ⚠️ | ✅ | Windows 最完善 |
| **窗口管理** | ❌ | ❌ | ❌ | ✅ | Windows 独有 |
| **应用启动** | ❌ | ✅ | ✅ | ⚠️ | 可扩展 |
| **网络监控** | ✅ | ❌ | ❌ | ❌ | Web 独有 |

---

## 💡 建议

### 1. 保持与官方 API 一致

- ✅ 不要重写 Agent 基类的核心方法（已修复）
- ✅ 只扩展 Windows 特有的功能
- ✅ 方法命名遵循 Midscene 规范

### 2. 优先实现高价值功能

- **窗口管理**: 桌面应用的核心需求
- **快捷键**: 提升操作效率
- **应用启动**: 完整的测试流程

### 3. 文档和示例

- 为每个扩展功能提供清晰的文档
- 提供实际使用示例
- 说明与其他平台的差异

### 4. 性能优化

- 缓存窗口列表
- 减少不必要的截图
- 使用异步操作

### 5. 错误处理

- 完善的错误提示
- 自动重试机制
- 降级方案

---

## 📅 下一步行动

1. **立即行动**:
   - [ ] 安装 `node-window-manager`
   - [ ] 完整实现窗口管理功能
   - [ ] 实现 `pressHotkey()` 方法
   - [ ] 实现应用启动和关闭

2. **本周完成**:
   - [ ] 文件对话框处理封装
   - [ ] 窗口尺寸管理
   - [ ] 系统托盘操作

3. **本月规划**:
   - [ ] OCR 文本识别集成
   - [ ] 屏幕录制功能
   - [ ] 性能监控工具

---

**总结**: Windows Agent 已经完整支持所有 Midscene 官方 API，接下来应该专注于 **Windows 特有功能的扩展**，特别是窗口管理、快捷键和应用管理这些高价值功能。
