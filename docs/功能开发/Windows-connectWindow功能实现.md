# Windows connectWindow 功能实现

## 概述

实现了类似 Web 端 `connectTab` 的 `connectWindow` 功能，允许从外部通过 WebSocket 连接到指定 Windows 窗口，后续所有截图和操作都自动针对该窗口。支持动态切换窗口。

**实施时间**: 2025-10-21  
**影响范围**: WindowsDevice、WindowsOperateService、WebSocket Handlers  
**版本**: midscene-server v1.0

## 核心特性

### 1. 持久化连接模式

一旦调用 `connectWindow`，设备会记住连接的窗口，所有后续操作都自动针对该窗口：

```typescript
// 连接窗口
await device.connectWindow({ windowTitle: 'Notepad' });

// 后续截图自动使用连接的窗口
const screenshot1 = await device.screenshotBase64(); // Notepad 窗口
const screenshot2 = await device.screenshotBase64(); // Notepad 窗口
```

### 2. 动态窗口切换

支持多次调用 `connectWindow` 来切换不同窗口：

```typescript
// 连接第一个窗口
await device.connectWindow({ windowTitle: 'Calculator' });
// 截图 Calculator

// 切换到第二个窗口
await device.connectWindow({ windowTitle: 'Notepad' });
// 截图 Notepad
```

### 3. 灵活的窗口查找

支持两种查找方式，优先级：windowId > windowTitle

```typescript
// 方式 1: 通过窗口 ID（精确匹配）
await device.connectWindow({ windowId: 123456 });

// 方式 2: 通过窗口标题（模糊匹配，不区分大小写）
await device.connectWindow({ windowTitle: 'Notepad' });

// 方式 3: 同时提供（优先使用 ID）
await device.connectWindow({ 
  windowId: 123456,
  windowTitle: 'Notepad' // 备用
});
```

## 技术实现

### 1. 文件改动清单

#### 1.1 枚举和配置

**`apps/server/src/utils/enums.ts`**
- 新增 `CONNECT_WINDOW = 'connectWindow'` 枚举

**`apps/server/src/config/clientTypeActions.ts`**
- 在 Windows 客户端配置中添加 `connectWindow` action

#### 1.2 设备层实现

**`apps/server/src/services/customMidsceneDevice/windowsDevice.ts`**

新增私有属性：
```typescript
private connectedWindow: {
  id: number;
  title: string;
  width: number;
  height: number;
} | null = null;
```

新增方法：
- `connectWindow(params)` - 连接到指定窗口
- `disconnectWindow()` - 断开窗口连接
- `getConnectedWindow()` - 获取当前连接的窗口信息

修改方法：
- `screenshotBase64()` - 优先使用连接的窗口截图

#### 1.3 服务层实现

**`apps/server/src/services/windowsOperateService.ts`**

新增方法：
- `connectWindow(params)` - 连接窗口（调用设备方法）
- `disconnectWindow()` - 断开窗口连接
- `getWindowList()` - 获取所有窗口列表

#### 1.4 WebSocket Handler

**新文件: `apps/server/src/websocket/actions/connectWindow.ts`**
- 实现 `createConnectWindowHandler()` 处理 WebSocket 连接窗口请求

**`apps/server/src/websocket/actions/windows/index.ts`**
- 导出 `createConnectWindowHandler`

**`apps/server/src/websocket/handlers/messageHandlers.ts`**
- 在 `createWindowsMessageHandlers()` 中注册 handler

#### 1.5 前端类型（可选）

**`apps/web/src/types/debug.ts`**
- 在 `WebSocketAction` 类型中添加 `'connectWindow'`

### 2. 实现细节

#### 2.1 窗口查找逻辑

```typescript
// 优先通过 ID 查找
let targetWindow = windowId
  ? windows.find(w => w.id === windowId)
  : undefined;

// 如果通过 ID 未找到，尝试通过标题查找（模糊匹配）
if (!targetWindow && windowTitle) {
  targetWindow = windows.find(w =>
    w.title.toLowerCase().includes(windowTitle.toLowerCase())
  );
}
```

#### 2.2 窗口切换检测

```typescript
// 检查是否正在切换窗口
const isSwitching = this.connectedWindow !== null;
const previousWindow = this.connectedWindow;

// 保存新窗口信息（覆盖旧值）
this.connectedWindow = {
  id: targetWindow.id,
  title: targetWindow.title,
  width: targetWindow.width,
  height: targetWindow.height,
};

// 输出切换日志
if (isSwitching) {
  console.log(
    `🔄 切换窗口: "${previousWindow!.title}" → "${this.connectedWindow.title}"`,
  );
}
```

#### 2.3 自动窗口截图

```typescript
async screenshotBase64(): Promise<string> {
  // 如果已连接到特定窗口，自动使用窗口截图模式
  if (this.connectedWindow) {
    this.cachedScreenshot = await windowsNative.captureWindowAsync(
      this.connectedWindow.id,
      screenshotOptions,
    );
    
    // 更新缓存尺寸为窗口尺寸
    this.cachedSize = {
      width: this.connectedWindow.width,
      height: this.connectedWindow.height,
      dpr: 1, // 窗口截图不涉及 DPI 缩放
    };
    
    return this.cachedScreenshot;
  }
  
  // 未连接窗口时，使用全屏截图
  // ...
}
```

## 使用示例

### 示例 1: 直接使用 WindowsDevice

```typescript
import WindowsDevice from './windowsDevice';

const device = new WindowsDevice({ debug: true });
await device.launch();

// 获取窗口列表
const windows = await device.getWindowList();
console.log(windows);

// 连接到窗口
const windowInfo = await device.connectWindow({ windowTitle: 'Notepad' });
console.log(`已连接: ${windowInfo.title}`);

// 截图（自动使用连接的窗口）
const screenshot = await device.screenshotBase64();

// 断开连接
device.disconnectWindow();
```

### 示例 2: 通过 WindowsOperateService

```typescript
import { WindowsOperateService } from './windowsOperateService';

const service = WindowsOperateService.getInstance();
await service.start();

// 连接窗口
const windowInfo = await service.connectWindow({ 
  windowTitle: 'Calculator' 
});

// 执行 AI 操作（基于连接的窗口）
await service.execute('点击数字 5');

// 断开连接
await service.disconnectWindow();
```

### 示例 3: 通过 WebSocket

**发送消息**:
```json
{
  "meta": {
    "messageId": "msg_001",
    "conversationId": "conv_001",
    "timestamp": 1672531199,
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

**接收响应**:
```json
{
  "meta": {
    "messageId": "msg_001",
    "conversationId": "conv_001",
    "timestamp": 1672531200
  },
  "payload": {
    "action": "connectWindow",
    "status": "success",
    "result": "已成功连接到窗口: \"Untitled - Notepad\" (ID: 123456)",
    "data": {
      "id": 123456,
      "title": "Untitled - Notepad",
      "width": 800,
      "height": 600
    }
  }
}
```

## API 文档

### WindowsDevice 方法

#### connectWindow(params)

连接到指定窗口（持久化模式）。

**参数**:
```typescript
{
  windowId?: number;      // 窗口 ID（优先）
  windowTitle?: string;   // 窗口标题（其次，模糊匹配）
}
```

**返回值**:
```typescript
{
  id: number;
  title: string;
  width: number;
  height: number;
}
```

**示例**:
```typescript
// 通过 ID
await device.connectWindow({ windowId: 123456 });

// 通过标题
await device.connectWindow({ windowTitle: 'Notepad' });
```

#### disconnectWindow()

断开窗口连接，恢复全屏模式。

**示例**:
```typescript
device.disconnectWindow();
```

#### getConnectedWindow()

获取当前连接的窗口信息。

**返回值**:
```typescript
{
  id: number;
  title: string;
  width: number;
  height: number;
} | null
```

**示例**:
```typescript
const window = device.getConnectedWindow();
if (window) {
  console.log(`当前连接: ${window.title}`);
} else {
  console.log('未连接窗口（全屏模式）');
}
```

### WindowsOperateService 方法

#### connectWindow(params)

同 WindowsDevice.connectWindow，但添加了错误处理和日志。

#### disconnectWindow()

同 WindowsDevice.disconnectWindow。

#### getWindowList()

获取所有窗口列表。

**返回值**:
```typescript
Array<{
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}>
```

## 测试

### 单元测试

运行设备层测试：
```bash
npx tsx apps/server/test-connect-window.ts
```

测试覆盖：
1. ✅ 获取窗口列表
2. ✅ 通过窗口标题连接
3. ✅ 验证截图使用连接的窗口
4. ✅ 切换到另一个窗口
5. ✅ 获取当前连接的窗口信息
6. ✅ 断开窗口连接

### WebSocket 测试

使用测试消息：
```bash
cat apps/server/test-connect-window-websocket.json
```

## 注意事项

### 1. 窗口 ID 的稳定性

窗口 ID 在窗口重新打开后会变化，因此：
- ✅ 推荐：使用 `windowTitle`（模糊匹配）
- ⚠️ 谨慎：使用 `windowId`（仅适用于短期会话）

### 2. 窗口查找失败

如果窗口未找到，会抛出错误：
```typescript
Error: 未找到匹配的窗口 (标题: "NonExistentWindow")
```

### 3. 窗口尺寸

连接窗口后，`device.size()` 返回的是窗口尺寸，而非屏幕尺寸：
```typescript
await device.connectWindow({ windowTitle: 'Notepad' });
const size = await device.size();
// size.width 和 size.height 是 Notepad 窗口的尺寸
```

### 4. DPI 缩放

窗口截图不涉及 DPI 缩放，`dpr` 始终为 1：
```typescript
this.cachedSize = {
  width: this.connectedWindow.width,
  height: this.connectedWindow.height,
  dpr: 1, // 窗口截图固定为 1
};
```

## 最佳实践

### 1. 使用窗口标题片段

```typescript
// ❌ 不推荐：完整标题可能包含动态内容
await device.connectWindow({ windowTitle: 'Document1.txt - Notepad' });

// ✅ 推荐：使用固定部分
await device.connectWindow({ windowTitle: 'Notepad' });
```

### 2. 错误处理

```typescript
try {
  await device.connectWindow({ windowTitle: 'MyApp' });
} catch (error) {
  if (error.message.includes('未找到匹配的窗口')) {
    console.log('窗口未打开，尝试启动应用...');
    // 启动应用逻辑
  }
}
```

### 3. 窗口列表预查

```typescript
// 先获取窗口列表，让用户选择
const windows = await device.getWindowList();
const targetWindow = windows.find(w => w.title.includes('MyApp'));

if (targetWindow) {
  await device.connectWindow({ windowId: targetWindow.id });
} else {
  console.log('目标窗口未找到');
}
```

## 未来优化

1. **窗口激活**: 连接窗口前自动激活窗口
2. **多显示器支持**: 支持跨显示器的窗口连接
3. **窗口状态检测**: 检测窗口是否最小化/隐藏
4. **窗口焦点管理**: 连接时自动获取焦点
5. **批量窗口管理**: 支持同时管理多个窗口

## 总结

✅ **功能完整**: 实现了从 WebSocket 到设备层的完整链路  
✅ **持久化模式**: 连接后自动使用该窗口，无需每次指定  
✅ **动态切换**: 支持随时切换到其他窗口  
✅ **灵活查找**: 支持 ID 和标题两种查找方式  
✅ **错误处理**: 完善的错误提示和日志  
✅ **向后兼容**: 未连接窗口时仍使用全屏模式  

这个功能为 Windows 自动化提供了更精准的窗口级控制能力，是对现有全屏操作的重要补充。

