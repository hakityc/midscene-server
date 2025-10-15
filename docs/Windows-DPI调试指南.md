# Windows DPI 点击偏差调试指南

## 问题现状

尽管已经实现了 DPR 检测和坐标转换，但问题仍然存在。现在需要调试验证整个链路。

## 已添加的调试日志

### 1. 屏幕尺寸检测（`windowsDevice.ts`）

```typescript
[DEBUG] windowsDevice.size() 返回: { width: 2880, height: 1620, dpr: 1.5 }
```

### 2. 截图尺寸验证（`windowsDevice.ts`）

```typescript
[DEBUG] screenshot 实际尺寸: 2880x1620
[DEBUG] cachedSize: 2880x1620
✓ 截图尺寸与 size() 一致
```

或者如果不一致：

```typescript
⚠️ 警告：截图尺寸 (1920x1080) 与 size() 返回的尺寸 (2880x1620) 不一致！
```

### 3. 鼠标点击坐标（`windowsNativeImpl.ts`）

```typescript
[WindowsNative] 鼠标点击:
  接收到的坐标: (1440, 810)
  屏幕信息: 2880x1620, DPR: 1.5000
  转换后逻辑坐标: (960, 540)
```

## 调试步骤

### 步骤 1：运行实际任务

```bash
# 启动服务
cd apps/server
pnpm dev

# 或者运行测试
node scripts/test-windows-dpi.js
```

### 步骤 2：触发一次点击操作

通过 Web 界面或 API 触发一次 Windows 点击操作，观察控制台输出。

### 步骤 3：检查日志输出

查找以下关键信息：

#### ✅ 正常情况（应该看到）

```
[WindowsNative] 屏幕信息检测:
  逻辑分辨率: 1920x1080
  物理分辨率: 2880x1620
  DPR: 1.5000
  ⚠️ 检测到 DPI 缩放: 150%
  坐标转换已启用: 物理坐标 → 逻辑坐标

[DEBUG] windowsDevice.size() 返回: { width: 2880, height: 1620, dpr: 1.5 }

[DEBUG] screenshot 实际尺寸: 2880x1620
[DEBUG] cachedSize: 2880x1620
✓ 截图尺寸与 size() 一致

[WindowsNative] 鼠标点击:
  接收到的坐标: (1440, 810)
  屏幕信息: 2880x1620, DPR: 1.5000
  转换后逻辑坐标: (960, 540)
```

#### ❌ 异常情况（需要排查）

**情况 A：截图尺寸不一致**

```
[DEBUG] screenshot 实际尺寸: 1920x1080
[DEBUG] cachedSize: 2880x1620
⚠️ 警告：截图尺寸 (1920x1080) 与 size() 返回的尺寸 (2880x1620) 不一致！
```

**原因**：`screen.grab()` 返回的图片尺寸与 `screen.width/height` 不匹配。

**解决方案**：
1. 检查 nut-js 版本
2. 检查 Windows DPI 设置是否在运行时改变
3. 考虑使用 Windows API 直接获取截图

**情况 B：接收到的坐标不是基于物理分辨率**

```
[WindowsNative] 鼠标点击:
  接收到的坐标: (960, 540)   ← 这是逻辑分辨率的坐标！
  屏幕信息: 2880x1620, DPR: 1.5000
  转换后逻辑坐标: (640, 360) ← 错误！
```

**原因**：AI 返回的坐标不是基于物理分辨率。

**解决方案**：检查 midscene core 的 `resizeImgBase64` 逻辑。

**情况 C：坐标转换未执行**

```
[WindowsNative] 鼠标点击:
  接收到的坐标: (1440, 810)
  屏幕信息: 1920x1080, DPR: 1.0000  ← DPR 检测错误！
  转换后逻辑坐标: (1440, 810)
```

**原因**：DPR 检测失败或被缓存为 1.0。

**解决方案**：
1. 清除缓存：`windowsNative.clearScreenInfoCache()`
2. 重新检测：重启服务

## 关键检查点

### 检查点 1：DPR 检测

**位置**：`windowsNativeImpl.ts` 的 `getScreenSize()` 方法

**验证方法**：
```bash
node scripts/test-windows-dpi.js
```

**预期输出**：
```
✓ DPR (从 grab): 1.5000  # 应该等于系统缩放比例
```

### 检查点 2：截图尺寸与 size() 一致性

**位置**：`windowsDevice.ts` 的 `screenshotBase64()` 方法

**验证方法**：查看日志中的 `[DEBUG] screenshot 实际尺寸`

**预期**：
- `screenshot 实际尺寸` === `windowsDevice.size() 返回的 width x height`

### 检查点 3：AI 接收到的坐标

**位置**：midscene core 的 UI Context 创建流程

**验证方法**：添加日志到 `packages/core/src/agent/utils.ts`

```typescript
// 在 buildUIContext 函数中添加
console.log('[DEBUG] UI Context:', {
  size,
  screenshotSize: '解析 base64 图片得到的尺寸',
});
```

### 检查点 4：坐标转换

**位置**：`windowsNativeImpl.ts` 的 `convertToLogicalCoordinates()` 方法

**验证方法**：查看日志中的 `[WindowsNative] 鼠标点击`

**预期**：
- `转换后逻辑坐标` === `接收到的坐标 ÷ DPR`

## 可能的问题和解决方案

### 问题 1：midscene core 的 resizeImgBase64 干扰

**文件**：`packages/core/src/agent/utils.ts` 第 56-62 行

```typescript
if (size.dpr && size.dpr !== 1) {
  debugProfile('Resizing screenshot for non-1 dpr');
  screenshotBase64 = await resizeImgBase64(screenshotBase64, {
    width: size.width,
    height: size.height,
  });
  debugProfile('ResizeImgBase64 end');
}
```

**可能的问题**：
- 这段代码会调整截图尺寸
- 如果截图已经是物理分辨率，这个 resize 应该不会改变尺寸
- 但需要验证 `resizeImgBase64` 的实际行为

**调试方法**：
1. 在 `resizeImgBase64` 前后添加日志
2. 对比 resize 前后的图片尺寸

**临时解决方案**（仅用于测试）：

在 `packages/core/src/agent/utils.ts` 中注释掉这段代码：

```typescript
// TEMP: 临时禁用 resize 用于测试
/*
if (size.dpr && size.dpr !== 1) {
  debugProfile('Resizing screenshot for non-1 dpr');
  screenshotBase64 = await resizeImgBase64(screenshotBase64, {
    width: size.width,
    height: size.height,
  });
  debugProfile('ResizeImgBase64 end');
}
*/
```

如果禁用后问题解决，说明问题出在 resize 逻辑。

### 问题 2：缓存导致的延迟更新

**现象**：改变 Windows 缩放后，仍使用旧的 DPR。

**解决方案**：

```typescript
// 在 windowsOperateService 启动时清除缓存
windowsNative.clearScreenInfoCache();
```

或者在每次 getScreenSize() 时检查是否需要重新计算：

```typescript
// 每次都重新检测（性能换准确性）
this.cachedScreenInfo = null;
```

### 问题 3：坐标来源不是 AI

**现象**：坐标不是来自 AI 分析截图，而是来自其他来源（如用户输入）。

**验证方法**：
- 检查调用链路
- 确认坐标是通过 midscene AI 返回的

## 下一步行动

### 立即执行

1. **运行实际任务**，收集完整的日志输出
2. **对比预期值**，找出哪个环节不一致
3. **定位问题点**，根据日志判断问题在哪里

### 根据日志结果

#### 如果 `截图尺寸 !== size()` ：

问题在 `getScreenSize()` 或 `captureScreenAsync()`

→ 检查 nut-js 的实际行为
→ 可能需要使用 Windows API

#### 如果 `截图尺寸 === size()` 但点击还是不准：

问题在坐标转换或 midscene core 的处理

→ 检查 AI 返回的坐标是否基于正确的尺寸
→ 检查 `resizeImgBase64` 是否改变了截图

#### 如果坐标转换没有执行：

问题在调用链路

→ 检查是否真的调用了 `windowsNative.mouseClick()`
→ 检查是否被其他代码绕过了

## 测试用例

### 测试用例 1：点击屏幕中心

```typescript
const screenInfo = await windowsDevice.size();
const centerX = screenInfo.width / 2;
const centerY = screenInfo.height / 2;
await windowsDevice.mouseClick(centerX, centerY);
```

**预期**：鼠标移动到屏幕中心

**验证**：目视检查或使用 `mouse.getPosition()` 验证

### 测试用例 2：多个缩放比例

```
1. 设置 Windows 缩放为 100%，测试点击
2. 设置 Windows 缩放为 125%，测试点击
3. 设置 Windows 缩放为 150%，测试点击
```

**预期**：所有缩放比例下点击都准确

### 测试用例 3：四个角落

```typescript
const corners = [
  { x: 100, y: 100 },           // 左上
  { x: width - 100, y: 100 },   // 右上
  { x: 100, y: height - 100 },  // 左下
  { x: width - 100, y: height - 100 }, // 右下
];
```

**预期**：每个角落都能准确点击

## 诊断工具

### 工具 1：DPR 诊断脚本

```bash
node scripts/test-windows-dpi.js
```

### 工具 2：截图尺寸检查脚本

```bash
node scripts/debug-screenshot-size.js
```

### 工具 3：启用详细日志

```bash
# 所有调试日志都会输出
# 查看控制台了解详细的执行过程
```

## 总结

目前已经添加了完整的调试日志，下一步：

1. ✅ 运行实际任务
2. ✅ 收集日志输出
3. ✅ 对比检查点
4. ✅ 定位问题根源
5. ✅ 实施针对性修复

请运行实际的 Windows 点击任务，然后将完整的日志输出分享给我，我会根据日志进一步分析问题。

