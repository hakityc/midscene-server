# connectWindow 快速参考

## 基本用法

### 1. 通过窗口标题连接（推荐）

```typescript
await device.connectWindow({ windowTitle: 'Notepad' });
```

### 2. 通过窗口 ID 连接

```typescript
await device.connectWindow({ windowId: 123456 });
```

### 3. 断开连接

```typescript
device.disconnectWindow();
```

## WebSocket 消息

### 连接窗口

```json
{
  "meta": {
    "messageId": "msg_001",
    "clientType": "windows"
  },
  "payload": {
    "action": "connectWindow",
    "params": {
      "windowTitle": "Notepad"
    }
  }
}
```

### 成功响应

```json
{
  "payload": {
    "action": "connectWindow",
    "status": "success",
    "result": "已成功连接到窗口: \"Notepad\" (ID: 123456)",
    "data": {
      "id": 123456,
      "title": "Untitled - Notepad",
      "width": 800,
      "height": 600
    }
  }
}
```

## 常用场景

### 场景 1: 连接并截图

```typescript
// 1. 连接窗口
await device.connectWindow({ windowTitle: 'Calculator' });

// 2. 截图（自动使用连接的窗口）
const screenshot = await device.screenshotBase64();
```

### 场景 2: 切换窗口

```typescript
// 连接第一个窗口
await device.connectWindow({ windowTitle: 'Window A' });
// 操作...

// 切换到第二个窗口
await device.connectWindow({ windowTitle: 'Window B' });
// 操作...
```

### 场景 3: 获取窗口列表

```typescript
const windows = await device.getWindowList();
windows.forEach(w => {
  console.log(`${w.id}: ${w.title}`);
});
```

### 场景 4: 检查连接状态

```typescript
const current = device.getConnectedWindow();
if (current) {
  console.log(`已连接: ${current.title}`);
} else {
  console.log('全屏模式');
}
```

## 关键特性

- ✅ **持久化**: 连接后所有操作都自动针对该窗口
- ✅ **动态切换**: 可多次调用切换窗口
- ✅ **模糊匹配**: 标题支持部分匹配
- ✅ **优先级**: windowId > windowTitle
- ✅ **自动截图**: 截图自动使用连接的窗口

## 注意事项

1. **必须提供参数**: windowId 或 windowTitle 至少一个
2. **窗口 ID 不稳定**: 窗口重启后 ID 会变化
3. **推荐使用标题**: 标题更稳定，支持模糊匹配
4. **大小写不敏感**: 标题匹配不区分大小写

## 错误处理

```typescript
try {
  await device.connectWindow({ windowTitle: 'MyApp' });
} catch (error) {
  console.error('连接失败:', error.message);
  // Error: 未找到匹配的窗口 (标题: "MyApp")
}
```

## 测试

```bash
# 运行设备测试
npx tsx apps/server/test-connect-window.ts
```
