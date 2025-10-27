# Windows 自定义 Interface 实现审查报告

## 审查日期

2025-10-13

## 审查范围

- `agentOverWindows.ts` - Agent 层实现
- `windowsDevice.ts` - Device 层（AbstractInterface 实现）

## 总体评价

✅ **整体实现质量良好**，符合 Midscene 自定义 interface 的基本要求。代码结构清晰，注释完善，参考了 Android/iOS 的实现模式。

---

## ✅ 符合最佳实践的部分

### 1. 核心接口实现 ✅

**windowsDevice.ts** 正确实现了 `AbstractInterface` 接口的所有必需方法：

```typescript
// ✅ 正确实现
export default class WindowsDevice implements AbstractInterface {
  interfaceType: InterfaceType = 'windows';  // ✅ 定义了接口类型

  async screenshotBase64(): Promise<string> { ... }  // ✅ 截图方法
  async size(): Promise<Size> { ... }                // ✅ 尺寸方法
  actionSpace(): DeviceAction<any>[] { ... }         // ✅ 动作空间
  async destroy(): Promise<void> { ... }             // ✅ 销毁方法
}
```

### 2. 动作空间定义 ✅

使用了 Midscene 提供的预定义动作函数，代码清晰易维护：

```typescript
// ✅ 使用预定义动作
defineActionTap(...)           // 点击
defineActionDoubleClick(...)   // 双击
defineActionRightClick(...)    // 右键
defineActionHover(...)         // 悬停
defineActionKeyboardPress(...) // 键盘按键
defineActionScroll(...)        // 滚动
```

### 3. 自定义动作支持 ✅

支持通过配置注入自定义动作：

```typescript
// ✅ 合并自定义动作
return this.customActions
  ? [...defaultActions, ...this.customActions]
  : defaultActions;
```

### 4. 生命周期管理 ✅

正确实现了设备的生命周期管理：

```typescript
// ✅ 完善的生命周期
async launch(): Promise<void> { ... }
async destroy(): Promise<void> { ... }
private assertNotDestroyed(): void { ... }
```

### 5. Agent 层设计 ✅

**agentOverWindows.ts** 正确继承了 `Agent` 基类，提供了完整的 AI 能力：

```typescript
// ✅ 正确的 Agent 实现
export default class AgentOverWindows extends Agent<WindowsDevice> {
  async aiAction(prompt: string, options?: any) { ... }
  async aiTap(...) { ... }
  async aiInput(...) { ... }
  // ... 其他 AI 方法
}
```

---

## ⚠️ 需要改进的问题

### 问题 1: Input 动作应使用预定义函数 🔴 **重要**

**当前实现：**

```typescript
// ❌ 使用自定义 defineAction
defineAction({
  name: 'Input',
  description: 'Type text into an element',
  paramSchema: z.object({
    value: z.string(),
    locate: getMidsceneLocationSchema(),
  }),
  call: async ({ value, locate }) => {
    await this.mouseClick(locate.center[0], locate.center[1]);
    await this.sleep(100);
    await this.typeText(value);
  },
})
```

**推荐实现：**

```typescript
// ✅ 使用预定义的 defineActionInput
import { defineActionInput, type ActionInputParam } from '@midscene/core/device';

defineActionInput(async (param: ActionInputParam) => {
  const element = param.locate;
  assert(element, 'Element not found, cannot input');

  // 先点击元素获取焦点
  await this.mouseClick(element.center[0], element.center[1]);
  await this.sleep(100);
  // 输入文本
  await this.typeText(param.value);
})
```

**理由：**

1. 保持与 Midscene 预定义动作的一致性
2. `defineActionInput` 是 `aiInput` 方法的调用函数
3. 参数类型更规范（`ActionInputParam`）

---

### 问题 2: InterfaceType 类型定义不明确 ⚠️ **中等**

**当前实现：**

```typescript
interfaceType: InterfaceType = 'windows';
```

**问题：**

- 需要确认 `'windows'` 是否在 `InterfaceType` 枚举/联合类型中定义
- 如果 `InterfaceType` 中没有 `'windows'`，TypeScript 可能会报错

**推荐检查：**

```typescript
// 检查 @midscene/core 中的 InterfaceType 定义
// 如果没有 'windows'，可能需要：
interfaceType = 'windows' as const;  // 或者
interfaceType: string = 'windows';   // 更灵活的方式
```

**建议：**
查看 `@midscene/core` 的类型定义，确认 `InterfaceType` 是否包含 `'windows'`。如果不包含，建议向 Midscene 团队提 PR 添加此类型。

---

### 问题 3: 缺少动作钩子函数（可选） 🟡 **低优先级**

根据文档，`AbstractInterface` 支持可选的动作钩子：

```typescript
beforeInvokeAction?(actionName: string, param: any): Promise<void>
afterInvokeAction?(actionName: string, param: any): Promise<void>
```

**推荐实现（可选）：**

```typescript
export default class WindowsDevice implements AbstractInterface {
  // ... 其他代码

  /**
   * 动作执行前的钩子
   */
  async beforeInvokeAction(actionName: string, param: any): Promise<void> {
    if (this.options.debug) {
      console.log(`🔵 Before action: ${actionName}`, param);
    }

    // 可以添加前置检查、日志记录等
    // 例如：确保窗口处于激活状态
    if (this.options.windowHandle) {
      await this.activateWindow(this.options.windowHandle);
    }
  }

  /**
   * 动作执行后的钩子
   */
  async afterInvokeAction(actionName: string, param: any): Promise<void> {
    if (this.options.debug) {
      console.log(`🟢 After action: ${actionName}`);
    }

    // 可以添加后置处理、截图保存等
    // 例如：等待 UI 更新
    await this.sleep(50);
  }
}
```

**用途：**

- 统一的日志记录
- 动作前后的状态检查
- 性能监控
- 调试信息收集

---

### 问题 4: 文档示例中的模式建议 🟡 **低优先级**

根据文档示例，建议将底层操作方法设为 `private`，这一点你已经做得很好：

```typescript
// ✅ 正确的封装
private async mouseClick(x: number, y: number): Promise<void> { ... }
private async typeText(text: string): Promise<void> { ... }
```

但是，有一些高级功能方法可以考虑是否需要公开：

```typescript
// 当前是 public 方法
async getWindowList(): Promise<...> { ... }    // ✅ 应该是 public
async activateWindow(windowHandle: string): Promise<void> { ... }  // ✅ 应该是 public
async getClipboard(): Promise<string> { ... }  // ✅ 应该是 public
async setClipboard(text: string): Promise<void> { ... }  // ✅ 应该是 public
```

这些方法作为 public 是合理的，因为它们暴露给 `AgentOverWindows` 使用。

---

### 问题 5: 错误处理可以更完善 🟡 **低优先级**

**当前实现：**

```typescript
async screenshotBase64(): Promise<string> {
  try {
    this.assertNotDestroyed();
    this.cachedScreenshot = await windowsNative.captureScreenAsync();
    if (this.options.debug) {
      console.log('📸 Screenshot captured');
    }
    return this.cachedScreenshot;
  } catch (error) {
    console.error('截图失败:', error);
    throw error;  // ❌ 直接抛出原始错误
  }
}
```

**推荐改进：**

```typescript
async screenshotBase64(): Promise<string> {
  try {
    this.assertNotDestroyed();
    this.cachedScreenshot = await windowsNative.captureScreenAsync();

    if (this.options.debug) {
      console.log('📸 Screenshot captured');
    }

    return this.cachedScreenshot;
  } catch (error) {
    // ✅ 提供更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to capture screenshot for ${this.options.deviceName}:`, errorMessage);

    // ✅ 抛出自定义错误，便于上层处理
    throw new Error(
      `WindowsDevice screenshot failed: ${errorMessage}`,
      { cause: error }
    );
  }
}
```

---

## 📋 改进建议优先级

### 🔴 高优先级（建议立即修复）

1. **修改 Input 动作实现**：使用 `defineActionInput()` 替代自定义实现

### ⚠️ 中优先级（建议近期修复）

2. **确认 InterfaceType 类型**：检查并修正类型定义

### 🟡 低优先级（可选改进）

3. **添加动作钩子函数**：提供更好的调试和扩展能力
4. **改进错误处理**：提供更详细的错误信息
5. **添加单元测试**：参考文档建议

---

## 🎯 具体修改建议

### 修改 1: 使用 defineActionInput

**文件：** `windowsDevice.ts`

**位置：** 第 178-194 行

**修改前：**

```typescript
// 输入文本
defineAction({
  name: 'Input',
  description: 'Type text into an element',
  paramSchema: z.object({
    value: z.string(),
    locate: getMidsceneLocationSchema(),
  }),
  call: async ({ value, locate }: { value: string; locate: any }) => {
    assert(locate, 'Element not found, cannot input');
    await this.mouseClick(locate.center[0], locate.center[1]);
    await this.sleep(100);
    await this.typeText(value);
  },
}),
```

**修改后：**

```typescript
// 输入文本
defineActionInput(async (param) => {
  const element = param.locate;
  assert(element, 'Element not found, cannot input');
  // 先点击元素获取焦点
  await this.mouseClick(element.center[0], element.center[1]);
  // 等待焦点切换
  await this.sleep(100);
  // 输入文本
  await this.typeText(param.value);
}),
```

同时确保导入了正确的类型：

```typescript
import {
  type AbstractInterface,
  type ActionInputParam,  // ✅ 添加这个导入
  type ActionKeyboardPressParam,
  type ActionTapParam,
  defineAction,
  defineActionDoubleClick,
  defineActionHover,
  defineActionInput,  // ✅ 确保导入了这个
  defineActionKeyboardPress,
  defineActionRightClick,
  defineActionScroll,
  defineActionTap,
} from '@midscene/core/device';
```

---

### 修改 2: 添加动作钩子（可选）

**文件：** `windowsDevice.ts`

**位置：** 在类的末尾，`setClipboard` 方法之后添加

```typescript
// ==================== 动作钩子（可选实现） ====================

/**
 * 动作执行前的钩子
 */
async beforeInvokeAction(actionName: string, param: any): Promise<void> {
  if (this.options.debug) {
    console.log(`🔵 Before action: ${actionName}`, JSON.stringify(param, null, 2));
  }

  // 如果指定了窗口句柄，确保窗口处于激活状态
  if (this.options.windowHandle) {
    await this.activateWindow(this.options.windowHandle);
  }
}

/**
 * 动作执行后的钩子
 */
async afterInvokeAction(actionName: string, param: any): Promise<void> {
  if (this.options.debug) {
    console.log(`🟢 After action: ${actionName} completed`);
  }

  // 等待 UI 更新
  await this.sleep(50);
}
```

---

## 📚 文档对照清单

| 要求项 | 文档要求 | 当前实现 | 状态 |
|--------|----------|----------|------|
| 实现 AbstractInterface | ✅ 必需 | ✅ 已实现 | ✅ 通过 |
| screenshotBase64() | ✅ 必需 | ✅ 已实现 | ✅ 通过 |
| size() | ✅ 必需 | ✅ 已实现 | ✅ 通过 |
| actionSpace() | ✅ 必需 | ✅ 已实现 | ✅ 通过 |
| destroy() | ✅ 必需 | ✅ 已实现 | ✅ 通过 |
| interfaceType | ✅ 必需 | ✅ 已实现 | ⚠️ 需确认类型 |
| 使用预定义动作 | ✅ 推荐 | ⚠️ Input 未使用 | ⚠️ 需修复 |
| 支持自定义动作 | 🟡 可选 | ✅ 已实现 | ✅ 通过 |
| beforeInvokeAction | 🟡 可选 | ❌ 未实现 | 🟡 建议添加 |
| afterInvokeAction | 🟡 可选 | ❌ 未实现 | 🟡 建议添加 |
| describe() | 🟡 可选 | ✅ 已实现 | ✅ 通过 |

---

## 🌟 优秀实践总结

你的实现中有很多值得称赞的地方：

1. **✅ 完善的注释和文档**：每个方法都有清晰的注释
2. **✅ 参考现有实现**：明确参考了 Android/iOS 的实现模式
3. **✅ 良好的代码组织**：使用注释分隔不同功能区域
4. **✅ 调试友好**：提供了 debug 选项和详细日志
5. **✅ 错误处理**：有基本的错误检查和断言
6. **✅ 生命周期管理**：正确管理设备的启动和销毁
7. **✅ 类型安全**：充分利用 TypeScript 类型系统

---

## 📝 总结

你的 Windows 自定义 interface 实现**整体质量很高**，基本符合 Midscene 的最佳实践。主要需要改进的是：

1. **Input 动作使用预定义函数**（重要）
2. **确认 interfaceType 类型定义**（重要）
3. **添加动作钩子函数**（可选，但推荐）

完成这些改进后，你的实现将完全符合 Midscene 的最佳实践，并且可以作为其他开发者的参考示例。

---

## 🔗 相关资源

- [Midscene 自定义 Interface 文档](https://midscenejs.com/zh/integrate-with-any-interface.html)
- [Android Agent 参考实现](https://github.com/web-infra-dev/midscene/tree/main/packages/android/src/agent.ts)
- [iOS Agent 参考实现](https://github.com/web-infra-dev/midscene/tree/main/packages/ios/src/agent.ts)
