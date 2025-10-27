# Windows 设备底层实现 API 文档

本文档定义了 Windows 设备操作所需的底层实现接口。实现方可以使用任何技术栈（如 robotjs、@nut-tree/nut-js、Windows API 等）来实现这些功能。

---

## 1. 屏幕信息获取

### 1.1 获取屏幕尺寸

**功能**：获取主显示器的屏幕分辨率和 DPI 缩放比例

**返回值**：

```typescript
{
  width: number,   // 屏幕宽度（像素）
  height: number,  // 屏幕高度（像素）
  dpr: number      // 设备像素比（Device Pixel Ratio）
}
```

**实现建议**：

- Windows API: `GetSystemMetrics(SM_CXSCREEN)` / `GetSystemMetrics(SM_CYSCREEN)`
- robotjs: `getScreenSize()`
- 获取 DPI 缩放：`GetDpiForMonitor()` 或 `GetDeviceCaps()`

---

### 1.2 获取屏幕截图

**功能**：捕获整个屏幕的截图

**返回值**：

- 格式：Base64 编码的 PNG 图片
- 示例：`data:image/png;base64,iVBORw0KGgo...`

**实现建议**：

- Windows API: `BitBlt()` + GDI+
- robotjs: `captureScreen()`
- screenshot-desktop npm 包
- 确保截图质量，避免压缩损失

---

## 2. 鼠标操作

所有鼠标操作的坐标系统：

- 原点 (0, 0) 位于屏幕左上角
- X 轴向右递增
- Y 轴向下递增
- 单位：物理像素

### 2.1 移动鼠标

**功能**：将鼠标光标移动到指定位置

**参数**：

- `x: number` - X 坐标
- `y: number` - Y 坐标

**实现建议**：

- Windows API: `SetCursorPos(x, y)`
- robotjs: `moveMouse(x, y)`

---

### 2.2 鼠标单击

**功能**：在指定位置执行鼠标左键单击

**参数**：

- `x: number` - X 坐标
- `y: number` - Y 坐标

**实现步骤**：

1. 移动鼠标到目标位置
2. 按下鼠标左键
3. 短暂延迟（建议 10-50ms）
4. 释放鼠标左键

**实现建议**：

- Windows API: `mouse_event(MOUSEEVENTF_LEFTDOWN)` + `mouse_event(MOUSEEVENTF_LEFTUP)`
- robotjs: `moveMouse(x, y)` + `mouseClick()`

---

### 2.3 鼠标双击

**功能**：在指定位置执行鼠标左键双击

**参数**：

- `x: number` - X 坐标
- `y: number` - Y 坐标

**实现步骤**：

1. 移动鼠标到目标位置
2. 执行两次快速单击（间隔建议 50-100ms）

**实现建议**：

- robotjs: `mouseClick('left', true)`
- 手动实现：连续执行两次单击操作

---

### 2.4 鼠标右键点击

**功能**：在指定位置执行鼠标右键单击

**参数**：

- `x: number` - X 坐标
- `y: number` - Y 坐标

**实现建议**：

- Windows API: `mouse_event(MOUSEEVENTF_RIGHTDOWN)` + `mouse_event(MOUSEEVENTF_RIGHTUP)`
- robotjs: `mouseClick('right')`

---

### 2.5 鼠标悬停

**功能**：将鼠标移动到指定位置并保持

**参数**：

- `x: number` - X 坐标
- `y: number` - Y 坐标

**实现说明**：

- 与"移动鼠标"功能相同
- 语义上表示鼠标停留在该位置以触发悬停效果

---

### 2.6 拖放操作

**功能**：从一个位置拖动鼠标到另一个位置

**参数**：

- `fromX: number` - 起始 X 坐标
- `fromY: number` - 起始 Y 坐标
- `toX: number` - 目标 X 坐标
- `toY: number` - 目标 Y 坐标

**实现步骤**：

1. 移动鼠标到起始位置
2. 按下鼠标左键（不释放）
3. 平滑移动鼠标到目标位置（建议分多个步骤移动）
4. 释放鼠标左键

**实现建议**：

- robotjs: `moveMouse()` + `mouseToggle('down')` + `dragMouse()` + `mouseToggle('up')`
- 平滑移动可以提高拖放的成功率

---

## 3. 键盘操作

### 3.1 输入文本

**功能**：模拟键盘输入一段文本

**参数**：

- `text: string` - 要输入的文本内容

**实现建议**：

- ASCII 字符：逐字符模拟按键
- 非 ASCII 字符（中文、emoji 等）：
  - 方案 1：使用剪贴板（复制文本后模拟 Ctrl+V）
  - 方案 2：使用 Windows IME API
- robotjs: `typeString(text)` （仅支持 ASCII）

**注意事项**：

- 考虑输入速度（建议每个字符间隔 10-50ms）
- 处理特殊字符的转义

---

### 3.2 按键操作

**功能**：模拟按下并释放一个或多个按键

**参数**：

- `key: string` - 按键标识符

**支持的按键类型**：

- 单个按键：`'a'`, `'Enter'`, `'Escape'`, `'Tab'` 等
- 组合键（用 + 连接）：`'Control+c'`, `'Alt+F4'`, `'Shift+a'` 等

**实现建议**：

- Windows API: `keybd_event()` 或 `SendInput()`
- robotjs: `keyTap(key)` 或 `keyTap(key, [modifiers])`
- 组合键处理：依次按下修饰键，按下主键，逆序释放

**常用按键映射**：

- 功能键：`F1`-`F12`
- 控制键：`Control`, `Alt`, `Shift`, `Win`
- 特殊键：`Enter`, `Escape`, `Tab`, `Backspace`, `Delete`
- 方向键：`Up`, `Down`, `Left`, `Right`

---

## 4. 滚动操作

### 4.1 指定位置滚动

**功能**：在屏幕指定位置执行滚动操作

**参数**：

- `x: number` - 滚动位置 X 坐标
- `y: number` - 滚动位置 Y 坐标
- `direction: 'up' | 'down' | 'left' | 'right'` - 滚动方向
- `distance: number` - 滚动距离（像素）

**实现步骤**：

1. 移动鼠标到指定位置
2. 模拟鼠标滚轮滚动

**实现建议**：

- Windows API: `mouse_event(MOUSEEVENTF_WHEEL)` / `mouse_event(MOUSEEVENTF_HWHEEL)`
- robotjs: `scrollMouse(x, y)`
  - 垂直滚动：`scrollMouse(0, amount)`
  - 水平滚动：`scrollMouse(amount, 0)`

**滚动量计算**：

- 向上/向左：distance 为正值
- 向下/向右：distance 为负值
- 建议每 120 个单位相当于一次滚轮刻度

---

### 4.2 全局滚动

**功能**：在当前鼠标位置执行滚动操作

**参数**：

- `direction: 'up' | 'down' | 'left' | 'right'` - 滚动方向
- `distance: number` - 滚动距离（像素）

**实现说明**：

- 与"指定位置滚动"相同，但不移动鼠标
- 直接在鼠标当前位置执行滚动

---

## 5. 实现注意事项

### 5.1 性能要求

- 截图操作应在 200ms 内完成
- 鼠标/键盘操作应在 50ms 内完成
- 支持高频率操作（至少 10 次/秒）

### 5.2 安全性

- 所有操作应该是同步阻塞的，确保顺序执行
- 操作失败时应抛出明确的错误信息
- 避免误操作系统关键区域

### 5.3 兼容性

- 支持 Windows 10/11
- 支持多显示器环境（以主显示器为准）
- 支持不同 DPI 缩放设置

### 5.4 错误处理

所有操作应在失败时抛出错误，错误信息应包含：

- 操作类型
- 失败原因
- 相关参数

---

## 6. 推荐实现方案

### 方案 A：robotjs（简单快速）

- 优点：API 简洁，跨平台
- 缺点：Unicode 字符支持有限，部分功能受限

### 方案 B：@nut-tree/nut-js（功能丰富）

- 优点：现代化 API，TypeScript 支持，功能完善
- 缺点：相对重量级

### 方案 C：Windows API + Node.js Addon（性能最优）

- 优点：性能最佳，功能最全，无依赖问题
- 缺点：开发复杂度高，需要 C++ 开发

### 方案 D：混合方案（推荐）

- 常规操作使用 robotjs 或 nut-js
- Unicode 输入使用剪贴板 + Windows API
- 截图使用 screenshot-desktop

---

## 7. 测试要求

实现方应确保以下功能可用：

- [ ] 正确获取屏幕分辨率
- [ ] 截图清晰完整
- [ ] 鼠标点击位置准确（误差 < 2px）
- [ ] 支持输入英文和中文
- [ ] 组合键正确执行
- [ ] 滚动方向和距离准确
- [ ] 拖放操作流畅

---

## 8. 示例代码参考

### 使用 robotjs

```javascript
const robot = require('robotjs');

// 获取屏幕尺寸
const size = robot.getScreenSize();

// 截图
const img = robot.captureScreen();

// 鼠标点击
robot.moveMouse(100, 200);
robot.mouseClick();

// 键盘输入
robot.typeString('Hello');
robot.keyTap('enter');

// 滚动
robot.scrollMouse(0, 10);
```

### 使用 @nut-tree/nut-js

```javascript
const { mouse, screen, keyboard } = require('@nut-tree/nut-js');

// 获取屏幕尺寸
const size = await screen.width();

// 截图
const img = await screen.grab();

// 鼠标点击
await mouse.setPosition({x: 100, y: 200});
await mouse.click();

// 键盘输入
await keyboard.type('Hello');
await keyboard.type(Key.Enter);

// 滚动
await mouse.scrollDown(10);
```

---

**文档版本**：v1.0  
**最后更新**：2025-10-10
