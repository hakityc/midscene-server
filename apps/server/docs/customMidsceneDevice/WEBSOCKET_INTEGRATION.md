# Windows WebSocket 集成指南

## 📋 概览

本文档说明如何将 Windows 客户端通过 WebSocket 与 Midscene Server 集成。

## 🏗️ 架构

```
Browser/API
    ↓ HTTP
Server (WindowsOperateService)
    ↓ 内部调用
AgentOverWindows
    ↓ 使用
WindowsDeviceProxy
    ↓ WebSocket 通信
WindowsClientConnectionManager
    ↓ WebSocket: /ws/windows-client
Windows Client Application
    ↓ 调用
Native Operations (robotjs, screenshot-desktop, etc.)
```

## 🔌 服务端集成

### 1. 在 WebSocket 路由中注册处理器

```typescript
// src/websocket/index.ts 或 src/index.ts

import { setupWindowsClientWebSocket } from './websocket/windowsClientHandler'

// 在你的 WebSocket 初始化代码中
export function setupWebSockets(app: Hono) {
  // 现有的浏览器 WebSocket
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })
  
  // 创建 Windows 客户端专用的 WebSocket 服务器
  const windowsWss = new WebSocketServer({ noServer: true })
  
  // 设置 Windows 客户端处理器
  setupWindowsClientWebSocket(windowsWss)
  
  // 在 HTTP 升级时路由到不同的 WebSocket
  app.server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`)
    
    if (url.pathname === '/ws/windows-client') {
      // Windows 客户端连接
      windowsWss.handleUpgrade(request, socket, head, (ws) => {
        windowsWss.emit('connection', ws, request)
      })
    } else {
      // 其他 WebSocket 连接（浏览器等）
      // 处理现有的 WebSocket...
    }
  })
}
```

或者更简单的方式（如果使用 @hono/node-ws）：

```typescript
// src/index.ts

import { createNodeWebSocket } from '@hono/node-ws'
import { setupWindowsClientWebSocket } from './websocket/windowsClientHandler'

const app = new Hono()

// 创建 WebSocket
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

// 注册 Windows 客户端路由
app.get('/ws/windows-client', upgradeWebSocket((c) => {
  return {
    onOpen(evt, ws) {
      // setupWindowsClientWebSocket 会处理
    }
  }
}))

// 在服务器启动后设置处理器
const server = serve({
  fetch: app.fetch,
  port: 3000
})

// 获取 WebSocket 服务器实例并设置处理器
const wss = (server as any).upgrade // 或者从你的 WebSocket 实现中获取
setupWindowsClientWebSocket(wss)
```

### 2. 使用 WindowsOperateService

```typescript
import { WindowsOperateService } from './services/windowsOperateService'

// 获取服务实例
const windowsService = WindowsOperateService.getInstance()

// 启动服务（等待客户端连接）
await windowsService.start()

// 执行操作
await windowsService.execute('点击开始按钮')
await windowsService.expect('开始菜单已打开')

// 停止服务
await windowsService.stop()
```

## 💻 客户端实现

### 客户端需要实现的功能

#### 1. WebSocket 连接

```javascript
// 客户端示例（Node.js）
const WebSocket = require('ws')

const ws = new WebSocket('ws://server-address:3000/ws/windows-client')

ws.on('open', () => {
  console.log('已连接到服务器')
  
  // 注册客户端
  ws.send(JSON.stringify({
    id: generateUUID(),
    type: 'request',
    action: 'register',
    params: {
      machineName: os.hostname(),
      os: `${os.type()} ${os.release()}`,
      ip: getLocalIP(),
      capabilities: [
        'screenshot',
        'getScreenSize',
        'mouseClick',
        'mouseDoubleClick',
        'mouseRightClick',
        'mouseHover',
        'mouseDrag',
        'typeText',
        'keyPress',
        'scroll',
        'getWindowList',
        'activateWindow',
        'getClipboard',
        'setClipboard'
      ],
      version: '1.0.0'
    },
    timestamp: Date.now()
  }))
})

ws.on('message', (data) => {
  const message = JSON.parse(data)
  
  if (message.type === 'request') {
    handleRequest(message, ws)
  } else if (message.type === 'response' && message.requestId) {
    // 处理注册响应等
    console.log('服务器响应:', message)
  }
})
```

#### 2. 请求处理

```javascript
async function handleRequest(request, ws) {
  const { id, action, params } = request
  
  try {
    let result
    
    switch (action) {
      case 'screenshot':
        result = await captureScreenshot()
        break
        
      case 'getScreenSize':
        result = await getScreenSize()
        break
        
      case 'mouseClick':
        result = await performMouseClick(params.x, params.y)
        break
        
      case 'typeText':
        result = await typeText(params.text)
        break
        
      // ... 其他操作
        
      default:
        throw new Error(`未知操作: ${action}`)
    }
    
    // 发送成功响应
    ws.send(JSON.stringify({
      id: generateUUID(),
      type: 'response',
      requestId: id,
      success: true,
      data: result,
      timestamp: Date.now()
    }))
    
  } catch (error) {
    // 发送错误响应
    ws.send(JSON.stringify({
      id: generateUUID(),
      type: 'response',
      requestId: id,
      success: false,
      error: {
        code: 'OPERATION_FAILED',
        message: error.message,
        stack: error.stack
      },
      timestamp: Date.now()
    }))
  }
}
```

#### 3. 操作实现示例

```javascript
const screenshot = require('screenshot-desktop')
const robot = require('robotjs')
const clipboard = require('clipboardy')
const { windowManager } = require('node-window-manager')

// 截图
async function captureScreenshot() {
  const img = await screenshot()
  return `data:image/png;base64,${img.toString('base64')}`
}

// 获取屏幕尺寸
async function getScreenSize() {
  const screenSize = robot.getScreenSize()
  return {
    width: screenSize.width,
    height: screenSize.height,
    dpr: 1
  }
}

// 鼠标点击
async function performMouseClick(x, y) {
  robot.moveMouse(x, y)
  robot.mouseClick()
  return { success: true }
}

// 鼠标双击
async function performMouseDoubleClick(x, y) {
  robot.moveMouse(x, y)
  robot.mouseClick('left', true)
  return { success: true }
}

// 鼠标右键
async function performMouseRightClick(x, y) {
  robot.moveMouse(x, y)
  robot.mouseClick('right')
  return { success: true }
}

// 鼠标悬停
async function performMouseHover(x, y) {
  robot.moveMouse(x, y)
  return { success: true }
}

// 拖拽
async function performMouseDrag(fromX, fromY, toX, toY) {
  robot.moveMouse(fromX, fromY)
  robot.mouseToggle('down')
  robot.dragMouse(toX, toY)
  robot.mouseToggle('up')
  return { success: true }
}

// 输入文本
async function typeText(text) {
  robot.typeString(text)
  return { success: true }
}

// 按键
async function keyPress(key, modifiers = []) {
  if (modifiers.length > 0) {
    robot.keyTap(key, modifiers)
  } else {
    robot.keyTap(key)
  }
  return { success: true }
}

// 滚动
async function scroll(params) {
  if (params.x && params.y) {
    robot.moveMouse(params.x, params.y)
  }
  
  const amount = params.direction === 'up' || params.direction === 'left' 
    ? params.distance 
    : -params.distance
    
  if (params.direction === 'up' || params.direction === 'down') {
    robot.scrollMouse(0, amount / 10) // 调整滚动速度
  } else {
    robot.scrollMouse(amount / 10, 0)
  }
  
  return { success: true }
}

// 获取窗口列表
async function getWindowList() {
  const windows = windowManager.getWindows()
  return windows.map(w => ({
    handle: String(w.getHandle()),
    title: w.getTitle(),
    processId: w.processId,
    isActive: w.isWindow()
  }))
}

// 激活窗口
async function activateWindow(windowHandle) {
  const windows = windowManager.getWindows()
  const window = windows.find(w => String(w.getHandle()) === windowHandle)
  if (window) {
    window.bringToTop()
  }
  return { success: true }
}

// 获取剪贴板
async function getClipboard() {
  return clipboard.readSync()
}

// 设置剪贴板
async function setClipboard(text) {
  clipboard.writeSync(text)
  return { success: true }
}
```

#### 4. 心跳机制

```javascript
// 定时发送心跳
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ping',
      id: generateUUID(),
      timestamp: Date.now()
    }))
  }
}, 30000) // 每30秒一次
```

## 📊 消息协议

### 请求格式（Server → Client）

```json
{
  "id": "uuid-v4",
  "type": "request",
  "action": "screenshot",
  "params": {},
  "timeout": 10000,
  "timestamp": 1234567890
}
```

### 响应格式（Client → Server）

成功：

```json
{
  "id": "uuid-v4",
  "type": "response",
  "requestId": "原请求的id",
  "success": true,
  "data": { ... },
  "timestamp": 1234567890
}
```

失败：

```json
{
  "id": "uuid-v4",
  "type": "response",
  "requestId": "原请求的id",
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "stack": "错误堆栈"
  },
  "timestamp": 1234567890
}
```

## 🧪 测试

### 测试客户端连接

```bash
# 安装依赖
npm install ws robotjs screenshot-desktop clipboardy node-window-manager

# 运行客户端
node windows-client.js
```

### 测试服务端

```typescript
import { WindowsOperateService } from './services/windowsOperateService'

async function test() {
  const service = WindowsOperateService.getInstance()
  
  // 启动服务
  await service.start()
  
  // 等待客户端连接
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // 测试截图
  const screenshot = await service.screenshot()
  console.log('截图长度:', screenshot.length)
  
  // 测试设备信息
  const info = await service.getDeviceInfo()
  console.log('设备信息:', info)
  
  // 测试执行任务
  await service.execute('点击屏幕中心')
  
  await service.stop()
}

test().catch(console.error)
```

## 🔧 故障排除

### 1. 客户端无法连接

**检查项**:

- WebSocket 路径是否正确 (`/ws/windows-client`)
- 服务器是否正在运行
- 防火墙是否阻止连接
- 网络是否可达

### 2. 操作超时

**原因**:

- 客户端处理太慢
- 网络延迟
- 客户端未响应

**解决**:

- 增加超时时间
- 检查客户端日志
- 优化客户端性能

### 3. 操作失败

**检查**:

- 客户端错误日志
- 操作参数是否正确
- 客户端是否有权限执行操作

## 📝 完整客户端示例

查看 `windows-client-example.js` 获取完整的客户端实现示例。

## 🔐 安全建议

虽然不需要认证，但建议：

1. **网络隔离**: 确保服务器和客户端在隔离的网络中
2. **消息验证**: 验证所有接收到的消息格式
3. **错误处理**: 完善的错误处理避免崩溃
4. **日志记录**: 记录所有操作便于调试

## 📚 相关文档

- [README.md](./README.md) - 架构说明
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 实现总结
- [examples.ts](./examples.ts) - 使用示例
