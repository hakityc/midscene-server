# 截图质量配置使用示例

## 基础示例

### 示例 1: 使用默认配置（推荐）

```typescript
import WindowsDevice from './services/customMidsceneDevice/windowsDevice';

async function example1() {
  // 默认使用 JPEG 90
  const device = new WindowsDevice({
    deviceName: 'MyApp',
    debug: true,
  });

  await device.launch();
  
  // 自动使用 JPEG 90 压缩
  const screenshot = await device.screenshotBase64();
  
  console.log('截图大小:', (screenshot.length * 0.75 / 1024).toFixed(2), 'KB');
  
  await device.destroy();
}
```

### 示例 2: 高质量场景（PNG）

```typescript
async function example2() {
  // 使用 PNG 无损格式
  const device = new WindowsDevice({
    deviceName: 'HighQuality',
    screenshot: {
      format: 'png',
    },
  });

  await device.launch();
  
  // 获取最高质量截图
  const screenshot = await device.screenshotBase64();
  
  await device.destroy();
}
```

### 示例 3: 低带宽场景（JPEG 70）

```typescript
async function example3() {
  // 使用较低质量以减少传输时间
  const device = new WindowsDevice({
    deviceName: 'LowBandwidth',
    screenshot: {
      format: 'jpeg',
      quality: 70,
    },
  });

  await device.launch();
  
  // 获取压缩后的截图
  const screenshot = await device.screenshotBase64();
  
  await device.destroy();
}
```

## 高级示例

### 示例 4: 根据环境动态配置

```typescript
async function example4() {
  // 根据环境变量配置质量
  const isProduction = process.env.NODE_ENV === 'production';
  const isSlow Network = process.env.NETWORK_SPEED === 'slow';

  const device = new WindowsDevice({
    deviceName: 'DynamicConfig',
    screenshot: {
      format: 'jpeg',
      quality: isSlowNetwork ? 70 : 90,
    },
  });

  await device.launch();
  const screenshot = await device.screenshotBase64();
  await device.destroy();
}
```

### 示例 5: 对比不同质量

```typescript
async function example5() {
  const qualities = [90, 80, 70, 60];

  for (const quality of qualities) {
    const device = new WindowsDevice({
      screenshot: {
        format: 'jpeg',
        quality,
      },
    });

    await device.launch();
    
    const startTime = Date.now();
    const screenshot = await device.screenshotBase64();
    const endTime = Date.now();
    
    const size = (screenshot.length * 0.75) / 1024;
    
    console.log(`质量 ${quality}: ${size.toFixed(2)}KB, ${endTime - startTime}ms`);
    
    await device.destroy();
  }
}
```

### 示例 6: 在 WebSocket 服务中使用

```typescript
import type { WebSocket } from 'ws';
import WindowsDevice from './services/customMidsceneDevice/windowsDevice';

async function handleScreenshotRequest(ws: WebSocket, config: any) {
  // 从客户端配置中获取质量设置
  const device = new WindowsDevice({
    deviceName: 'WebSocketClient',
    screenshot: {
      format: config.screenshotFormat || 'jpeg',
      quality: config.screenshotQuality || 90,
    },
  });

  try {
    await device.launch();
    const screenshot = await device.screenshotBase64();
    
    // 发送给客户端
    ws.send(JSON.stringify({
      type: 'screenshot',
      data: screenshot,
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message,
    }));
  } finally {
    await device.destroy();
  }
}
```

### 示例 7: 批量截图优化

```typescript
async function example7() {
  // 批量截图时使用较低质量以节省时间和空间
  const device = new WindowsDevice({
    deviceName: 'BatchScreenshots',
    screenshot: {
      format: 'jpeg',
      quality: 75, // 平衡质量和大小
    },
  });

  await device.launch();

  const screenshots: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const screenshot = await device.screenshotBase64();
    screenshots.push(screenshot);
    
    // 模拟一些操作
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`捕获了 ${screenshots.length} 张截图`);
  
  await device.destroy();
}
```

## 性能优化建议

### 1. 选择合适的质量

```typescript
// 开发环境：使用高质量便于调试
const devDevice = new WindowsDevice({
  screenshot: {
    format: process.env.NODE_ENV === 'development' ? 'png' : 'jpeg',
    quality: 90,
  },
});
```

### 2. 监控截图性能

```typescript
async function monitoredScreenshot(device: WindowsDevice) {
  const startTime = Date.now();
  const screenshot = await device.screenshotBase64();
  const endTime = Date.now();
  
  const size = (screenshot.length * 0.75) / 1024;
  const time = endTime - startTime;
  
  // 记录性能指标
  console.log({
    size: `${size.toFixed(2)}KB`,
    time: `${time}ms`,
    throughput: `${(size / time).toFixed(2)}KB/ms`,
  });
  
  return screenshot;
}
```

### 3. 条件压缩

```typescript
async function conditionalCompression(
  device: WindowsDevice,
  needsHighQuality: boolean
) {
  // 动态调整设备配置
  const deviceWithConfig = new WindowsDevice({
    screenshot: {
      format: needsHighQuality ? 'png' : 'jpeg',
      quality: needsHighQuality ? undefined : 80,
    },
  });
  
  await deviceWithConfig.launch();
  const screenshot = await deviceWithConfig.screenshotBase64();
  await deviceWithConfig.destroy();
  
  return screenshot;
}
```

## 常见问题

### Q: 默认质量是多少？

A: 默认使用 JPEG 格式，质量 90，与 web 版本保持一致。

### Q: PNG 和 JPEG 90 视觉上有区别吗？

A: 对于大多数屏幕内容，JPEG 90 的视觉质量与 PNG 几乎无法区分。

### Q: 会影响 AI 识别精度吗？

A: JPEG 90 不会影响 AI 识别精度。质量低于 70 时可能会有影响。

### Q: 如何选择合适的质量？

A:

- 90: 默认，适合所有场景
- 80: 网络较慢，需要更快传输
- 70: 带宽严重受限
- PNG: 需要像素完美或存档用途

### Q: 可以在运行时更改质量吗？

A: 需要创建新的 WindowsDevice 实例。未来可能添加动态配置支持。
