# node-screenshots 快速参考

## 安装

```bash
npm install node-screenshots
```

## 关键改动

### 1. 跨平台兼容层

由于 macOS 和 Windows 的 API 差异，实现了兼容层：

```typescript
function getMonitorProperty<T>(monitor: Monitor, prop: string): T {
  const value = (monitor as any)[prop];
  return typeof value === 'function' ? value.call(monitor) : value;
}

function getWindowProperty<T>(window: Window, prop: string): T {
  const value = (window as any)[prop];
  return typeof value === 'function' ? value.call(window) : value;
}
```

### 2. 导入方式

```typescript
import type { Monitor, Window } from 'node-screenshots';
import * as screenshots from 'node-screenshots';
```

### 3. 使用示例

```typescript
// ❌ 错误（仅 Windows）
const width = monitor.width();

// ✅ 正确（跨平台）
const width = getMonitorProperty<number>(monitor, 'width');

// ❌ 错误
const monitors = Monitor.all();

// ✅ 正确
const monitors = screenshots.Monitor.all();
```

## 主要 API

### 全屏截图

```typescript
const monitors = screenshots.Monitor.all();
const primary = monitors.find(m => 
  getMonitorProperty<boolean>(m, 'isPrimary')
) || monitors[0];
const image = await primary.captureImage();
const buffer = await image.toJpeg();
```

### 窗口截图

```typescript
const windows = screenshots.Window.all();
const window = windows.find(w => 
  getWindowProperty<number>(w, 'id') === targetId
);
const image = await window.captureImage();
```

### 获取窗口列表

```typescript
const windows = screenshots.Window.all();
const list = windows.map(w => ({
  id: getWindowProperty<number>(w, 'id'),
  title: getWindowProperty<string>(w, 'title'),
  x: getWindowProperty<number>(w, 'x'),
  y: getWindowProperty<number>(w, 'y'),
  width: getWindowProperty<number>(w, 'width'),
  height: getWindowProperty<number>(w, 'height'),
}));
```

## 常见属性

### Monitor 属性

- `id` - 显示器 ID
- `name` - 显示器名称
- `x`, `y` - 位置
- `width`, `height` - 尺寸
- `isPrimary` - 是否主显示器
- `scaleFactor` - 缩放因子

### Window 属性

- `id` - 窗口 ID
- `title` - 窗口标题
- `x`, `y` - 位置
- `width`, `height` - 尺寸

### Image 方法

- `await image.toPng()` - 转 PNG
- `await image.toJpeg()` - 转 JPEG
- `await image.toBmp()` - 转 BMP
- `await image.toRaw()` - 转原始 RGBA

## 性能提升

| 操作 | 旧实现 (nut-js) | 新实现 (node-screenshots) | 提升 |
|------|----------------|---------------------------|------|
| 全屏截图 | ~300ms | ~150ms | **50%** |
| 窗口截图 | 不支持 | ~80ms | ✅ |

## 注意事项

1. **平台差异**: Windows 用函数调用，macOS 用属性访问
2. **兼容层**: 必须使用 `getMonitorProperty` 和 `getWindowProperty`
3. **导入**: 使用 `screenshots.Monitor.all()` 而非 `Monitor.all()`
4. **异步**: 优先使用异步方法 `captureImage()`

## 测试

```bash
npx tsx test-node-screenshots.ts
```
