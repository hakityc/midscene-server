# Windows WebSocket 快速开始

## 🚀 5分钟快速集成

### 步骤 1: 服务端集成（已完成）

所有服务端代码已经实现，文件清单：

```
✅ types/windowsProtocol.ts                  - 协议定义
✅ services/windowsClientConnectionManager.ts - 连接管理器
✅ services/customMidsceneDevice/
   ├── windowsDeviceProxy.ts                - 设备代理
   ├── agentOverWindows.ts                  - Agent 实现
   └── index.ts                             - 导出
✅ services/windowsOperateService.ts         - 操作服务
✅ websocket/windowsClientHandler.ts         - WebSocket 处理器
```

### 步骤 2: 注册 WebSocket 路由

在你的主入口文件中添加：

```typescript
// src/index.ts 或 src/websocket/index.ts

import { setupWindowsClientWebSocket } from './websocket/windowsClientHandler'

// 方式1: 如果使用 @hono/node-ws
app.get('/ws/windows-client', upgradeWebSocket((c) => {
  return {
    onOpen(evt, ws) {
      // Handler 会自动处理
    }
  }
}))

// 在 WebSocket 服务器实例上设置处理器
setupWindowsClientWebSocket(wss)

// 方式2: 如果使用原生 WebSocket
const wss = new WebSocketServer({ noServer: true })
setupWindowsClientWebSocket(wss)

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`)
  
  if (url.pathname === '/ws/windows-client') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  }
})
```

### 步骤 3: 使用服务

```typescript
import { WindowsOperateService } from './services/windowsOperateService'

// 获取服务实例
const service = WindowsOperateService.getInstance()

// 启动（等待客户端连接）
await service.start()

// 执行操作
await service.execute('点击开始按钮')
await service.expect('开始菜单已打开')

// 获取设备信息
const info = await service.getDeviceInfo()
console.log('屏幕:', info.width, 'x', info.height)

// 截图
const screenshot = await service.screenshot()
```

### 步骤 4: 启动 Windows 客户端

```bash
# 在 Windows 机器上

# 1. 安装依赖
npm install ws robotjs screenshot-desktop clipboardy node-window-manager

# 2. 复制客户端代码
# 使用 windows-client-example.js 作为模板

# 3. 修改服务器地址
# 编辑 windows-client-example.js 中的 CONFIG.serverUrl

# 4. 运行客户端
node windows-client-example.js
```

### 步骤 5: 验证连接

客户端成功连接后，你应该看到：

**客户端日志**:

```
🚀 启动 Windows 客户端
==================================================
✅ 所有依赖加载成功
🔌 连接到服务器: ws://localhost:3000/ws/windows-client
✅ WebSocket 连接成功
📝 注册客户端: { machineName: 'WIN-PC', os: 'Windows_NT 10.0.19045', ... }
✅ 注册成功，客户端ID: xxx-xxx-xxx
💓 发送心跳
```

**服务端日志**:

```
Windows 客户端 WebSocket 处理器已初始化
Windows 客户端尝试连接
Windows 客户端注册成功 { clientId: 'xxx', machineName: 'WIN-PC', ... }
```

## 📋 完整示例

### 示例 1: 简单的自动化任务

```typescript
import { WindowsOperateService } from './services/windowsOperateService'

async function automateCalculator() {
  const service = WindowsOperateService.getInstance()
  await service.start()

  try {
    // 打开计算器
    await service.execute('打开计算器应用')
    
    // 等待加载
    await service.expect('计算器窗口已打开')
    
    // 执行计算
    await service.execute('点击数字 5')
    await service.execute('点击加号')
    await service.execute('点击数字 3')
    await service.execute('点击等号')
    
    // 验证结果
    await service.expect('显示结果为 8')
    
    console.log('✅ 自动化任务完成')
  } catch (error) {
    console.error('❌ 任务失败:', error)
  } finally {
    await service.stop()
  }
}

automateCalculator()
```

### 示例 2: 获取窗口信息

```typescript
import AgentOverWindows from './services/customMidsceneDevice/agentOverWindows'

async function listWindows() {
  const agent = new AgentOverWindows({ deviceOptions: { debug: true } })
  await agent.launch()

  const windows = await agent.getWindowList()
  
  console.log('当前打开的窗口:')
  windows.forEach(w => {
    console.log(`  ${w.isActive ? '✓' : ' '} ${w.title} (${w.handle})`)
  })

  await agent.destroy()
}

listWindows()
```

### 示例 3: 使用 YAML 脚本

```typescript
import { WindowsOperateService } from './services/windowsOperateService'

const yamlScript = `
tasks:
  - name: 打开记事本
    type: action
    prompt: 点击开始菜单，搜索并打开记事本

  - name: 输入内容
    type: action
    prompt: 在文本框输入"Hello from Midscene!"

  - name: 验证
    type: assert
    prompt: 文本框包含"Hello from Midscene!"
`

async function runYamlTask() {
  const service = WindowsOperateService.getInstance()
  await service.start()

  await service.executeScript(yamlScript)
  
  await service.stop()
}

runYamlTask()
```

## 🔍 调试技巧

### 1. 启用调试日志

```typescript
// 服务端
const service = WindowsOperateService.getInstance()
service.on('taskStartTip', (tip) => {
  console.log('📋 任务:', tip)
})

// 客户端
// 在 windows-client-example.js 中已经包含详细日志
```

### 2. 检查连接状态

```typescript
const manager = WindowsClientConnectionManager.getInstance()

// 获取所有客户端
const clients = manager.getAvailableClients()
console.log('可用客户端:', clients.length)

// 获取统计信息
const stats = manager.getStats()
console.log('统计:', stats)
```

### 3. 手动测试操作

```typescript
import AgentOverWindows from './services/customMidsceneDevice/agentOverWindows'

const agent = new AgentOverWindows()
await agent.launch()

// 直接调用底层方法测试
const size = await agent.interface.size()
console.log('屏幕尺寸:', size)

const screenshot = await agent.interface.screenshotBase64()
console.log('截图长度:', screenshot.length)
```

## ⚠️ 常见问题

### Q: 客户端连接失败

**A**: 检查：

1. 服务器是否运行在正确的端口
2. WebSocket 路径是否为 `/ws/windows-client`
3. 防火墙是否允许连接

### Q: 操作超时

**A**:

1. 增加超时时间：`service.execute(prompt, 5)` // 5次重试
2. 检查客户端性能
3. 查看客户端日志

### Q: 某些操作不支持

**A**:

1. 检查客户端依赖是否安装
2. 查看客户端的 `capabilities` 列表
3. 确保 Windows 有操作权限

## 📚 下一步

- 查看 [WEBSOCKET_INTEGRATION.md](./WEBSOCKET_INTEGRATION.md) 了解详细协议
- 查看 [examples.ts](./examples.ts) 了解更多使用示例
- 查看 [README.md](./README.md) 了解架构设计

## 🎉 完成

现在你已经成功集成了 Windows WebSocket 自动化！

如有问题，请查看：

- 服务端日志
- 客户端日志
- 网络连接状态
