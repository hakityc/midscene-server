# Windows Midscene 点击位置偏差问题分析

## 问题描述

Windows Midscene 在使用过程中，点击位置经常不准确，怀疑是分辨率或 DPI 缩放问题导致截图分辨率和实际分辨率不一致。

## 问题根源

### 1. DPI 缩放未正确处理

**当前实现问题**（`windowsNativeImpl.ts` 第 74-76 行）：

```typescript
// TODO: 获取真实的 DPI 缩放比例
// Windows 上可以通过 Windows API 获取，这里暂时默认为 1
const dpr = 1;
```

**问题影响**：
- DPR（Device Pixel Ratio）被硬编码为 1
- 在 Windows 缩放设置不是 100% 的情况下（例如 125%、150%、200%），会导致坐标计算错误

### 2. 物理像素 vs 逻辑像素

根据 `WINDOWS_IMPLEMENTATION_API.md` 第 49 行定义：

> 所有鼠标操作的坐标系统：
> - 单位：物理像素

**两种像素系统**：

| 类型 | 说明 | 例子（150% 缩放）|
|------|------|------------------|
| **逻辑像素** | 系统报告的分辨率 | 1920x1080 |
| **物理像素** | 实际屏幕像素 | 2880x1620 |
| **DPR** | 物理像素 ÷ 逻辑像素 | 1.5 |

### 3. 坐标不匹配的场景

**场景 A：截图是物理分辨率，坐标按逻辑分辨率点击**

```
Windows 缩放：150% (DPR = 1.5)
逻辑分辨率：1920x1080
截图分辨率：2880x1620（物理像素）

AI 分析截图返回坐标：(1440, 810) ← 基于 2880x1620
实际点击位置：(1440, 810) ← 按物理像素点击
期望点击位置：(1440, 810) ← 正确 ✓
```

**场景 B：截图是逻辑分辨率，坐标按逻辑分辨率点击（当前可能情况）**

```
Windows 缩放：150% (DPR = 1.5)
逻辑分辨率：1920x1080
截图分辨率：1920x1080（逻辑像素，被系统缩放处理）

AI 分析截图返回坐标：(960, 540) ← 基于 1920x1080
实际点击位置：(960, 540) ← 按物理像素点击
期望点击位置：(960 * 1.5, 540 * 1.5) = (1440, 810) ← 错误 ✗
```

## Chrome 扩展的解决方案

### Chrome 的坐标处理

在 Chrome 扩展中（`recorder.ts` 第 243-244 行）：

```typescript
const elementRect: ChromeRecordedEvent['elementRect'] = {
  x: Number(event.clientX.toFixed(2)),
  y: Number(event.clientY.toFixed(2)),
};
```

**Chrome 的优势**：
1. `event.clientX/clientY` 是浏览器视口的 **CSS 像素**（逻辑像素）
2. `getBoundingClientRect()` 返回的也是 **CSS 像素**
3. Chrome 内部自动处理 `devicePixelRatio`
4. 浏览器负责将逻辑坐标转换为屏幕物理坐标

### Chrome 截图处理

Chrome 使用 `chrome.tabs.captureVisibleTab()` API：
- 默认捕获的是 **CSS 像素**（逻辑分辨率）
- 不受系统 DPI 缩放影响
- 截图分辨率与 `window.innerWidth/innerHeight` 一致

**关键点**：Chrome 的截图分辨率和坐标系统是一致的（都是 CSS 像素）。

## 问题诊断步骤

### 1. 确认 nut-js 截图分辨率

需要验证 `@nut-tree/nut-js` 的 `screen.capture()` 返回的图片分辨率：

```javascript
// 测试代码
const { screen } = require('@nut-tree/nut-js');

async function testScreenshot() {
  const width = await screen.width();
  const height = await screen.height();
  console.log(`screen.width: ${width}, screen.height: ${height}`);
  
  // 捕获截图并检查实际图片尺寸
  const screenshot = await screen.grab();
  console.log(`screenshot.width: ${screenshot.width}, screenshot.height: ${screenshot.height}`);
}
```

### 2. 检查系统 DPI 设置

在 Windows 上检查当前 DPI 缩放：
- 设置 → 系统 → 显示 → 缩放与布局
- 常见值：100%、125%、150%、175%、200%

### 3. 验证坐标计算

测试用例：
```
1. 设置 Windows 缩放为 150%
2. 获取屏幕尺寸和截图
3. 点击屏幕中心点
4. 验证鼠标是否正确移动到中心
```

## 解决方案

### 方案 1：正确获取和使用 DPR（推荐）

#### 步骤 1：获取真实的 Windows DPI

使用 Windows API 或第三方库获取真实 DPI：

```javascript
// 使用 ffi-napi 或其他 Windows API 包装器
const dpi = 获取系统DPI();
const dpr = dpi / 96; // Windows 标准 DPI 是 96

// 或者通过比较截图和逻辑分辨率
const logicalWidth = await screen.width();
const screenshot = await screen.grab();
const physicalWidth = screenshot.width;
const dpr = physicalWidth / logicalWidth;
```

#### 步骤 2：修正坐标转换

如果截图是物理分辨率，点击坐标也用物理像素：
```typescript
// 不需要转换，直接使用 AI 返回的坐标
mouseClick(aiX, aiY);
```

如果截图是逻辑分辨率，需要转换点击坐标：
```typescript
// 将逻辑像素转换为物理像素
const physicalX = aiX * dpr;
const physicalY = aiY * dpr;
mouseClick(physicalX, physicalY);
```

### 方案 2：统一使用逻辑分辨率

#### 修改 nut-js 配置

确保所有操作都使用逻辑坐标：

```typescript
// 1. 获取逻辑分辨率的截图（如果 nut-js 支持）
// 2. 使用逻辑坐标移动鼠标（如果 nut-js 支持）

// 或者在应用层进行转换
const logicalX = aiX / dpr;
const logicalY = aiY / dpr;
mouse.move([new Point(logicalX, logicalY)]);
```

### 方案 3：使用 robotjs（备选）

`robotjs` 可能对 Windows DPI 有更好的支持：

```javascript
const robot = require('robotjs');

// robotjs 可能自动处理 DPI 缩放
const size = robot.getScreenSize();
const screenshot = robot.screen.capture();
// 检查 screenshot 的尺寸是否与 size 一致
```

## 具体实现建议

### 修改 `windowsNativeImpl.ts`

```typescript
/**
 * 获取屏幕尺寸
 * 实现 API 文档 1.1
 */
getScreenSize(): ScreenInfo {
  return (
    this.runSync(async () => {
      const logicalWidth = await screen.width();
      const logicalHeight = await screen.height();

      // 方法 1: 通过截图分辨率推算 DPR
      const testScreenshot = await screen.grab();
      const physicalWidth = testScreenshot.width;
      const physicalHeight = testScreenshot.height;
      
      const dpr = physicalWidth / logicalWidth;

      console.log(`逻辑分辨率: ${logicalWidth}x${logicalHeight}`);
      console.log(`物理分辨率: ${physicalWidth}x${physicalHeight}`);
      console.log(`DPR: ${dpr}`);

      return {
        width: physicalWidth,   // 返回物理分辨率
        height: physicalHeight,
        dpr,
      };
    }) || { width: 1920, height: 1080, dpr: 1 }
  );
}

/**
 * 鼠标单击
 * 坐标应该是物理像素
 */
mouseClick(x: number, y: number): void {
  try {
    this.runSync(async () => {
      // 如果传入的是物理像素，不需要转换
      // 如果 nut-js 的 mouse.move 需要逻辑像素，则需要转换
      const screenInfo = this.getScreenSize();
      const dpr = screenInfo.dpr;
      
      // 根据 nut-js 的实际行为决定是否需要转换
      // 选项 A: nut-js 使用物理像素（不转换）
      await mouse.move([new Point(Math.round(x), Math.round(y))]);
      
      // 选项 B: nut-js 使用逻辑像素（需要转换）
      // const logicalX = Math.round(x / dpr);
      // const logicalY = Math.round(y / dpr);
      // await mouse.move([new Point(logicalX, logicalY)]);

      await mouse.click(Button.LEFT);
    });
  } catch (error) {
    console.error('鼠标单击失败:', error);
  }
}
```

### 测试验证

创建测试脚本验证修复：

```typescript
// test-dpi-fix.ts
import { WindowsNativeImpl } from './windowsNativeImpl';

async function testDPIFix() {
  const windows = WindowsNativeImpl.getInstance();
  
  // 1. 获取屏幕信息
  const screenInfo = windows.getScreenSize();
  console.log('屏幕信息:', screenInfo);
  
  // 2. 截图
  const screenshot = await windows.captureScreenAsync();
  // 保存并检查图片实际尺寸
  
  // 3. 测试点击屏幕中心
  const centerX = screenInfo.width / 2;
  const centerY = screenInfo.height / 2;
  console.log(`点击中心: (${centerX}, ${centerY})`);
  
  windows.mouseClick(centerX, centerY);
  
  // 观察鼠标是否移动到屏幕中心
}
```

## 进一步调查

### 需要确认的信息

1. **nut-js 的行为**：
   - `screen.width()` / `screen.height()` 返回逻辑分辨率还是物理分辨率？
   - `screen.capture()` / `screen.grab()` 返回的图片是什么分辨率？
   - `mouse.move()` 接受的坐标是逻辑像素还是物理像素？

2. **Windows API 文档**：
   - `SetCursorPos()` 使用的坐标系统
   - `mouse_event()` 使用的坐标系统

3. **实际测试结果**：
   - 在 100% 缩放下测试
   - 在 150% 缩放下测试
   - 比较两种情况下的坐标差异

## 参考资料

1. [Windows DPI Scaling](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-screenscaling)
2. [nut-js Documentation](https://nutjs.dev/docs/)
3. Chrome Extension API: `chrome.tabs.captureVisibleTab()`
4. [Device Pixel Ratio - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)

## 总结

问题的核心在于：
1. **DPR 未正确获取**：硬编码为 1
2. **坐标系统不一致**：截图分辨率和点击坐标系统可能不匹配
3. **需要验证 nut-js 的实际行为**：确认它使用的是物理像素还是逻辑像素

**修复优先级**：
1. 首先实现正确的 DPR 获取
2. 验证 nut-js 的截图和鼠标坐标系统
3. 根据验证结果实现正确的坐标转换
4. 添加日志和测试用例验证修复效果

