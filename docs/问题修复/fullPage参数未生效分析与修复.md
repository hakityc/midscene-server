2                                                                                                                                                                             # fullPage 参数未生效问题分析与修复

## 问题描述

用户在调用 `summarizeWithMidscene` 功能时传入 `fullPage: true` 参数，期望能够截取整个网页的长截图，但实际只截取了当前视口（viewport）的内容。

**日志示例：**

```
[2025-11-04 15:26:25.994 +0800] INFO: [30] 开始截图
   params: {
     "fullPage": true
   }
```

**实际截图尺寸：** 2544x1818（视口大小）
**期望结果：** 完整页面高度的截图

---

## 问题根因分析

### 1. 调用链路

```
summarizeWithMidsceneService.ts
  └─> WebOperateServiceRefactored.screenshot()
      └─> AgentOverChromeBridge.screenshot()
          └─> handleCaptureScreenshotRequest()
              └─> ChromeExtensionProxyPage.screenshotFullPageBase64()
```

### 2. Chrome Extension 全页截图实现

Chrome Extension 的 `screenshotFullPageBase64` 方法使用 **CDP (Chrome DevTools Protocol)** 的 `Emulation.setDeviceMetricsOverride` 命令来实现全页截图：

```typescript
// 1. 获取页面完整尺寸
const metrics = {
  width: Math.max(document.body.scrollWidth, ...),
  height: Math.max(document.body.scrollHeight, ...),
  deviceScaleFactor: window.devicePixelRatio
};

// 2. 设置设备指标以捕获整页
await sendCommandToDebugger('Emulation.setDeviceMetricsOverride', {
  width: metrics.width,
  height: metrics.height,
  deviceScaleFactor: metrics.deviceScaleFactor,
  mobile: false,
});

// 3. 捕获截图
const result = await sendCommandToDebugger('Page.captureScreenshot', {...});

// 4. 恢复原始视口
await sendCommandToDebugger('Emulation.clearDeviceMetricsOverride', {});
```

### 3. 问题所在

**原代码的问题：**

```typescript
} catch (error) {
  console.warn('Full page screenshot failed, fallback to viewport screenshot', error);
  // 静默降级到视口截图
  const result = await sendCommandToDebugger('Page.captureScreenshot', {...});
  base64 = createImgBase64ByFormat(imgType, result.data);
}
```

当 `Emulation.setDeviceMetricsOverride` 失败时：

1. **错误只在浏览器端输出 `console.warn`**，服务端看不到
2. **静默降级到视口截图**，没有通知调用方
3. **调用方无法判断** 返回的是全页截图还是视口截图

### 4. 为什么 Emulation 会失败？

可能的原因：

1. **页面限制**：某些 Web 应用（如飞书文档）可能通过 CSP 或其他机制阻止 CDP Emulation 命令
2. **不支持的页面类型**：某些特殊页面可能不支持设备指标覆盖
3. **Debugger 未正确 attach**：虽然概率较低，但也可能存在

---

## 解决方案

### 1. 增加尺寸验证和多重备选方案

**问题根因：** `Emulation.setDeviceMetricsOverride` 命令执行成功但没有真正改变视口大小。

**解决方案：**

#### 方案 1：在 Emulation 方法中增加尺寸验证

```typescript:514:623:/Users/lebo/lebo/project/midscene/packages/web-integration/src/chrome-extension/page.ts
private async screenshotFullPageByEmulation(
  imgType: string,
  quality: number,
): Promise<string> {
  // 1. 获取页面和视口尺寸
  const metrics = {
    pageWidth, pageHeight,      // 完整页面尺寸
    viewportWidth, viewportHeight,  // 当前视口尺寸
    deviceScaleFactor
  };

  // 2. 使用 Emulation.setDeviceMetricsOverride 设置页面大小
  await this.sendCommandToDebugger('Emulation.setDeviceMetricsOverride', {
    width: metrics.pageWidth,
    height: metrics.pageHeight,
    deviceScaleFactor: metrics.deviceScaleFactor,
    mobile: false,
  });

  // 3. 截图
  const result = await this.sendCommandToDebugger('Page.captureScreenshot', {...});
  const base64 = createImgBase64ByFormat(imgType, result.data);

  // 4. 恢复视口
  await this.sendCommandToDebugger('Emulation.clearDeviceMetricsOverride', {});

  // 5. 验证截图尺寸（通过 base64 长度估算）
  if (isLongPage && actualBase64Length < viewportBase64Length * 1.3) {
    throw new Error('Emulation screenshot likely failed: got viewport size screenshot');
  }

  return base64;
}
```

#### 方案 2：使用 captureBeyondViewport 作为备选

```typescript:660:705:/Users/lebo/lebo/project/midscene/packages/web-integration/src/chrome-extension/page.ts
if (fullPage && !elementRect) {
  try {
    // 方案 1：Emulation (会验证尺寸)
    base64 = await this.screenshotFullPageByEmulation(imgType, quality);
    console.log('✅ Full page screenshot by Emulation succeeded');
  } catch (emulationError) {
    console.error('❌ Emulation screenshot failed:', emulationError.message);

    // 方案 2：使用 captureBeyondViewport
    console.log('🔄 Trying Page.captureScreenshot with captureBeyondViewport...');
    try {
      const pageSize = { width, height, dpr };
      const result = await this.sendCommandToDebugger('Page.captureScreenshot', {
        format: imgType,
        quality,
        clip: {
          x: 0, y: 0,
          width: pageSize.width,
          height: pageSize.height,
          scale: 1,
        },
        captureBeyondViewport: true,  // 关键参数
      });
      base64 = createImgBase64ByFormat(imgType, result.data);
      console.log('✅ Full page screenshot with captureBeyondViewport succeeded');
    } catch (captureError) {
      // 方案 3：回退到视口截图
      console.warn('⚠️  All methods failed, fallback to viewport screenshot');
      // ... 视口截图
    }
  }
}
```

### 2. 服务端增加尺寸验证

**在服务端检查实际截图尺寸：**

```typescript:46:66:/Users/lebo/lebo/project/midscene-server/apps/server/src/services/summarizeWithMidsceneService.ts
// 3. 使用服务层的截图方法
const { imageBase64, locateRect } = await webService.screenshot({
  fullPage,
  locate,
});

// 解析图片尺寸以验证是否真的执行了全页截图
const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
const buffer = Buffer.from(base64Data, 'base64');
const imageInfo = await sharp(buffer).metadata();

console.log(
  `截图完成: fullPage=${fullPage}, 实际尺寸=${imageInfo.width}x${imageInfo.height}, locateRect=${JSON.stringify(locateRect)}`,
);

// 如果请求全页截图但尺寸很小，可能是回退到了视口截图
if (fullPage && imageInfo.height && imageInfo.height < 2000) {
  console.warn(
    `⚠️  请求了全页截图但实际尺寸只有 ${imageInfo.width}x${imageInfo.height}，可能是浏览器端全页截图失败，已回退到视口截图`,
  );
}
```

---

## 后续优化方向

### 1. 实现滚动拼接截图方案

如果 `Emulation.setDeviceMetricsOverride` 在某些页面上不可用，可以实现基于滚动的全页截图方案（类似 Puppeteer 的实现）：

```typescript
/**
 * 使用滚动拼接方式实现全页截图
 *
 * 实现思路：
 * 1. 获取页面总高度和视口高度
 * 2. 从顶部开始，按视口高度分段截图
 * 3. 滚动到下一个位置，继续截图
 * 4. 使用 sharp 或 canvas 拼接所有截图
 * 5. 恢复原始滚动位置
 */
private async screenshotFullPageByScrolling(
  imgType: string,
  quality: number,
): Promise<string> {
  // TODO: 实现滚动拼接逻辑
  // 参考 Puppeteer 的 fullPage screenshot 实现
}
```

### 2. 对比 Puppeteer 和 Chrome Extension 的实现差异

- **Puppeteer**：直接调用 `page.screenshot({ fullPage: true })`，内部实现了可靠的滚动拼接
- **Chrome Extension**：只能通过 CDP 命令手动实现，`Emulation` 方案在某些页面上会失败

### 3. 增加配置选项

允许用户选择截图策略：

```typescript
export type SummarizeWithMidsceneParams = {
  fullPage?: boolean;
  screenshotMethod?: 'emulation' | 'scrolling' | 'auto'; // 截图方法选择
  locate?: any;
};
```

---

## 验证步骤

### 1. 重新编译项目（✅ 已完成）

```bash
cd /Users/lebo/lebo/project/midscene
pnpm --filter @midscene/web build
cd apps/chrome-extension
pnpm build
```

**编译结果：**

- ✅ `@midscene/web` 编译成功（page.js: 32.0 kB → 35.2 kB）
- ✅ Chrome Extension 编译成功
- 📦 扩展包位置：`/Users/lebo/lebo/project/midscene/apps/chrome-extension/midscene-extension-v0.30.7.zip`

### 2. 重新加载 Chrome Extension（❗需要手动操作）

**重要：** 必须重新加载扩展才能使新代码生效！

1. 打开 Chrome 扩展管理页面：`chrome://extensions/`
2. 找到 Midscene 扩展
3. 点击**"重新加载"**按钮（🔄）
4. 或者：关闭并重新加载扩展目录

### 3. 测试截图功能并观察日志

#### 在浏览器控制台观察（关键！）

打开一个长页面（如飞书文档），按 F12 打开开发者工具，切换到 **Console** 标签页，然后调用 `summarize` 功能。

**预期日志输出（3种情况）：**

**情况 1：Emulation 成功** ✅

```
📏 页面尺寸信息: {page: "1920x5000", viewport: "1920x1080", dpr: 2}
📊 截图大小验证: {actualLength: 2500000, viewportLength: 1200000, ratio: "2.08"}
✅ Full page screenshot by Emulation succeeded
```

**情况 2：Emulation 失败，captureBeyondViewport 成功** ✅

```
📏 页面尺寸信息: {page: "1920x5000", viewport: "1920x1080", dpr: 2}
📊 截图大小验证: {actualLength: 1100000, viewportLength: 1200000, ratio: "0.92"}
❌ Emulation screenshot failed: Emulation screenshot likely failed...
🔄 Trying Page.captureScreenshot with captureBeyondViewport...
✅ Full page screenshot with captureBeyondViewport succeeded
```

**情况 3：所有方案都失败** ⚠️

```
❌ Emulation screenshot failed: ...
🔄 Trying Page.captureScreenshot with captureBeyondViewport...
❌ captureBeyondViewport also failed: ...
⚠️  All methods failed, fallback to viewport screenshot
```

#### 在服务端日志观察

```bash
# 服务端会输出截图尺寸验证
截图完成: fullPage=true, 实际尺寸=1920x5000, locateRect=undefined
📸 截图已保存: /path/to/screenshot-xxx.jpg

# 如果检测到降级
⚠️  请求了全页截图但实际尺寸只有 1920x1080，可能是浏览器端全页截图失败，已回退到视口截图
```

### 4. 验证截图文件

```bash
cd /Users/lebo/lebo/project/midscene-server/apps/server
file midscene_run/output/screenshot-*.jpg | tail -1
```

查看最新截图的实际尺寸，确认是否是完整页面。

---

## 总结

### 问题根因

Chrome Extension 使用的 `Emulation.setDeviceMetricsOverride` 在某些页面上：

1. **命令执行"成功"**（没有抛出异常）
2. **但实际上没有改变视口大小**
3. **导致截图仍然是视口尺寸**
4. **错误信息只在浏览器端，服务端无法感知**

### 解决方案（已实现）

#### 1. 增加尺寸验证

- 在 `screenshotFullPageByEmulation` 方法中获取页面和视口尺寸
- 通过比较 base64 长度来验证截图是否为完整页面
- 如果检测到尺寸不符，主动抛出异常

#### 2. 多重备选方案

- **方案 1**：`Emulation.setDeviceMetricsOverride`（主要方案，带尺寸验证）
- **方案 2**：`Page.captureScreenshot` + `captureBeyondViewport`（备选方案）
- **方案 3**：降级到视口截图（兜底方案）

#### 3. 日志增强

- **浏览器端**：输出详细的尺寸信息和验证结果
  - `📏 页面尺寸信息`
  - `📊 截图大小验证`
  - `✅/❌ 成功/失败标识`
- **服务端**：检测截图尺寸并输出警告

### 效果

- ✅ 能够检测 Emulation 失败的情况
- ✅ 自动尝试 captureBeyondViewport 备选方案
- ✅ 服务端和浏览器端都能看到详细的诊断信息
- ⏳ 如果 captureBeyondViewport 也不支持，会降级到视口截图（未来可实现滚动拼接）

### 后续优化方向

如果 `captureBeyondViewport` 在你的目标页面上也不支持，可以考虑：

1. **实现滚动拼接截图**：分段截图并在浏览器端用 Canvas 拼接
2. **切换到 Puppeteer 方案**：使用服务端 Puppeteer 代替 Chrome Extension
3. **优化 Emulation 参数**：尝试不同的设备指标组合

---

## 相关文件

- `/Users/lebo/lebo/project/midscene/packages/web-integration/src/chrome-extension/page.ts`
- `/Users/lebo/lebo/project/midscene-server/apps/server/src/services/summarizeWithMidsceneService.ts`
- `/Users/lebo/lebo/project/midscene-server/apps/server/src/services/base/WebOperateServiceRefactored.ts`
