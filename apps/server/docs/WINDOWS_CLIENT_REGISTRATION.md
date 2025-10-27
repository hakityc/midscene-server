# Windows 客户端注册指南

本文档详细说明了 Windows 客户端如何通过 WebSocket 连接到服务器并完成注册。

## 概述

Windows 客户端需要通过 WebSocket 连接到服务器，并发送注册请求来完成身份验证和能力声明。注册成功后，客户端将获得一个唯一的 `clientId`，用于后续的所有通信。

## 注册流程

### 1. 建立 WebSocket 连接

客户端需要连接到服务器的 Windows 客户端专用 WebSocket 端点（默认端口及路径需根据服务器配置确定）。

```javascript
// Node.js 示例
const WebSocket = require('ws');
const ws = new WebSocket('ws://服务器地址:端口/windows-client');
```

```csharp
// C# 示例
using System.Net.WebSockets;

var ws = new ClientWebSocket();
await ws.ConnectAsync(new Uri("ws://服务器地址:端口/windows-client"), CancellationToken.None);
```

### 2. 准备注册数据

注册数据需要符合 `ClientRegistrationData` 接口定义：

```typescript
interface ClientRegistrationData {
  /** 机器名（必需） */
  machineName: string;

  /** 操作系统信息（必需） */
  os: string;

  /** IP 地址（可选） */
  ip?: string;

  /** 客户端支持的能力列表（必需） */
  capabilities: WindowsAction[];

  /** 客户端版本（可选） */
  version?: string;
}
```

#### 支持的能力类型 (WindowsAction)

```typescript
type WindowsAction =
  // 基础操作
  | 'screenshot'           // 截图
  | 'getScreenSize'        // 获取屏幕尺寸
  | 'mouseClick'           // 鼠标点击
  | 'mouseDoubleClick'     // 鼠标双击
  | 'mouseRightClick'      // 鼠标右击
  | 'mouseHover'           // 鼠标悬停
  | 'mouseDrag'            // 鼠标拖拽
  | 'typeText'             // 输入文本
  | 'keyPress'             // 按键
  | 'scroll'               // 滚动
  // 窗口管理
  | 'getWindowList'        // 获取窗口列表
  | 'activateWindow'       // 激活窗口
  | 'getActiveWindow'      // 获取活动窗口
  // 剪贴板
  | 'getClipboard'         // 获取剪贴板
  | 'setClipboard'         // 设置剪贴板
  // 连接管理
  | 'register'             // 注册
  | 'getStatus';           // 获取状态
```

### 3. 发送注册请求

注册请求的消息格式如下：

```json
{
  "id": "唯一消息ID（UUID）",
  "type": "request",
  "action": "register",
  "timestamp": 当前时间戳（毫秒）,
  "params": {
    "machineName": "WIN-DESKTOP-01",
    "os": "Windows 11 Pro 64-bit",
    "ip": "192.168.1.100",
    "capabilities": [
      "screenshot",
      "getScreenSize",
      "mouseClick",
      "mouseDoubleClick",
      "mouseRightClick",
      "mouseHover",
      "mouseDrag",
      "typeText",
      "keyPress",
      "scroll",
      "getWindowList",
      "activateWindow",
      "getActiveWindow",
      "getClipboard",
      "setClipboard",
      "getStatus"
    ],
    "version": "1.0.0"
  }
}
```

**注意事项：**

- `id` 必须是唯一的，建议使用 UUID
- `timestamp` 必须是当前时间戳（毫秒），服务器会验证时间戳是否在 30 秒范围内
- `machineName` 和 `capabilities` 是必需字段

### 4. 接收注册响应

注册成功后，服务器会返回以下格式的响应：

```json
{
  "type": "response",
  "id": "resp-原始请求ID",
  "requestId": "原始请求ID",
  "timestamp": 服务器时间戳（毫秒）,
  "success": true,
  "data": {
    "clientId": "分配的客户端ID（UUID）",
    "serverTime": 服务器时间戳（毫秒）
  }
}
```

注册失败的响应：

```json
{
  "type": "response",
  "id": "resp-原始请求ID",
  "requestId": "原始请求ID",
  "timestamp": 服务器时间戳（毫秒）,
  "success": false,
  "error": {
    "code": "REGISTRATION_FAILED",
    "message": "无效的注册数据",
    "stack": "错误堆栈（如果有）"
  }
}
```

### 5. 保存客户端 ID

客户端必须保存服务器返回的 `clientId`，该 ID 在客户端的整个生命周期中使用。

## 心跳维护

注册成功后，客户端需要定期发送心跳以保持连接活跃。

### 心跳配置

- **心跳间隔**: 30 秒（服务器配置：`heartbeatInterval`）
- **心跳超时**: 60 秒（服务器配置：`heartbeatTimeout`）
- 如果客户端 60 秒内没有发送心跳，服务器将断开连接并注销客户端

### 发送心跳

心跳消息格式：

```json
{
  "id": "唯一消息ID（UUID）",
  "type": "ping",
  "timestamp": 当前时间戳（毫秒）
}
```

### 接收心跳响应

服务器会返回 Pong 消息：

```json
{
  "id": "pong-原始ping消息ID",
  "type": "pong",
  "timestamp": 服务器时间戳（毫秒）
}
```

## 完整示例代码

### Node.js 示例

```javascript
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

class WindowsClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.clientId = null;
    this.heartbeatInterval = null;
  }

  // 连接到服务器
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.on('open', () => {
        console.log('WebSocket 连接已建立');
        this.register().then(resolve).catch(reject);
      });

      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });

      this.ws.on('close', () => {
        console.log('WebSocket 连接已关闭');
        this.stopHeartbeat();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket 错误:', error);
        reject(error);
      });
    });
  }

  // 注册客户端
  async register() {
    const registrationMessage = {
      id: uuidv4(),
      type: 'request',
      action: 'register',
      timestamp: Date.now(),
      params: {
        machineName: os.hostname(),
        os: `${os.type()} ${os.release()}`,
        ip: this.getLocalIP(),
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
          'getActiveWindow',
          'getClipboard',
          'setClipboard',
          'getStatus'
        ],
        version: '1.0.0'
      }
    };

    return new Promise((resolve, reject) => {
      const messageId = registrationMessage.id;

      // 监听注册响应
      const responseHandler = (message) => {
        if (message.type === 'response' && message.requestId === messageId) {
          this.ws.removeListener('message', responseHandler);

          if (message.success) {
            this.clientId = message.data.clientId;
            console.log('注册成功，客户端 ID:', this.clientId);
            this.startHeartbeat();
            resolve(this.clientId);
          } else {
            reject(new Error(message.error?.message || '注册失败'));
          }
        }
      };

      this.ws.on('message', (data) => {
        responseHandler(JSON.parse(data.toString()));
      });

      // 发送注册请求
      this.ws.send(JSON.stringify(registrationMessage));
    });
  }

  // 启动心跳
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendPing();
    }, 25000); // 25 秒发送一次，确保在 30 秒超时前发送
  }

  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 发送心跳
  sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const pingMessage = {
        id: uuidv4(),
        type: 'ping',
        timestamp: Date.now()
      };
      this.ws.send(JSON.stringify(pingMessage));
      console.log('发送心跳 Ping');
    }
  }

  // 处理消息
  handleMessage(message) {
    switch (message.type) {
      case 'pong':
        console.log('收到心跳 Pong');
        break;
      case 'request':
        // 处理服务器请求
        this.handleRequest(message);
        break;
      default:
        console.log('收到消息:', message);
    }
  }

  // 处理服务器请求
  handleRequest(request) {
    console.log('收到服务器请求:', request.action);
    // 根据 action 类型处理不同的请求
    // 实现具体的操作逻辑
  }

  // 获取本机 IP
  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
    }
  }
}

// 使用示例
async function main() {
  const client = new WindowsClient('ws://localhost:3000/windows-client');

  try {
    await client.connect();
    console.log('客户端已连接并注册');

    // 保持连接，处理服务器请求
    process.on('SIGINT', () => {
      console.log('正在断开连接...');
      client.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('连接失败:', error);
    process.exit(1);
  }
}

main();
```

### C# 示例

```csharp
using System;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

public class WindowsClient
{
    private readonly string serverUrl;
    private ClientWebSocket ws;
    private string clientId;
    private Timer heartbeatTimer;

    public WindowsClient(string serverUrl)
    {
        this.serverUrl = serverUrl;
    }

    // 连接到服务器
    public async Task ConnectAsync()
    {
        ws = new ClientWebSocket();
        await ws.ConnectAsync(new Uri(serverUrl), CancellationToken.None);
        Console.WriteLine("WebSocket 连接已建立");

        // 注册
        await RegisterAsync();

        // 启动消息接收循环
        _ = Task.Run(() => ReceiveLoop());
    }

    // 注册客户端
    private async Task RegisterAsync()
    {
        var registrationMessage = new
        {
            id = Guid.NewGuid().ToString(),
            type = "request",
            action = "register",
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            @params = new
            {
                machineName = Environment.MachineName,
                os = $"{Environment.OSVersion.Platform} {Environment.OSVersion.Version}",
                ip = GetLocalIP(),
                capabilities = new[]
                {
                    "screenshot", "getScreenSize", "mouseClick", "mouseDoubleClick",
                    "mouseRightClick", "mouseHover", "mouseDrag", "typeText",
                    "keyPress", "scroll", "getWindowList", "activateWindow",
                    "getActiveWindow", "getClipboard", "setClipboard", "getStatus"
                },
                version = "1.0.0"
            }
        };

        var json = JsonSerializer.Serialize(registrationMessage);
        var bytes = Encoding.UTF8.GetBytes(json);
        await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);

        Console.WriteLine("注册请求已发送");
    }

    // 启动心跳
    private void StartHeartbeat()
    {
        heartbeatTimer = new Timer(async _ =>
        {
            await SendPingAsync();
        }, null, TimeSpan.Zero, TimeSpan.FromSeconds(25));
    }

    // 发送心跳
    private async Task SendPingAsync()
    {
        if (ws.State == WebSocketState.Open)
        {
            var pingMessage = new
            {
                id = Guid.NewGuid().ToString(),
                type = "ping",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            var json = JsonSerializer.Serialize(pingMessage);
            var bytes = Encoding.UTF8.GetBytes(json);
            await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            Console.WriteLine("发送心跳 Ping");
        }
    }

    // 接收消息循环
    private async Task ReceiveLoop()
    {
        var buffer = new byte[8192];
        while (ws.State == WebSocketState.Open)
        {
            var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Text)
            {
                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                HandleMessage(message);
            }
        }
    }

    // 处理消息
    private void HandleMessage(string messageJson)
    {
        using var doc = JsonDocument.Parse(messageJson);
        var root = doc.RootElement;
        var type = root.GetProperty("type").GetString();

        switch (type)
        {
            case "response":
                if (root.GetProperty("success").GetBoolean())
                {
                    clientId = root.GetProperty("data").GetProperty("clientId").GetString();
                    Console.WriteLine($"注册成功，客户端 ID: {clientId}");
                    StartHeartbeat();
                }
                else
                {
                    var error = root.GetProperty("error").GetProperty("message").GetString();
                    Console.WriteLine($"注册失败: {error}");
                }
                break;

            case "pong":
                Console.WriteLine("收到心跳 Pong");
                break;

            case "request":
                // 处理服务器请求
                HandleRequest(root);
                break;
        }
    }

    // 处理服务器请求
    private void HandleRequest(JsonElement request)
    {
        var action = request.GetProperty("action").GetString();
        Console.WriteLine($"收到服务器请求: {action}");
        // 根据 action 类型处理不同的请求
        // 实现具体的操作逻辑
    }

    // 获取本机 IP
    private string GetLocalIP()
    {
        // 实现获取本机 IP 的逻辑
        return "127.0.0.1";
    }

    // 断开连接
    public async Task DisconnectAsync()
    {
        heartbeatTimer?.Dispose();
        if (ws != null && ws.State == WebSocketState.Open)
        {
            await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client disconnecting", CancellationToken.None);
        }
    }
}

// 使用示例
class Program
{
    static async Task Main(string[] args)
    {
        var client = new WindowsClient("ws://localhost:3000/windows-client");

        try
        {
            await client.ConnectAsync();
            Console.WriteLine("客户端已连接并注册，按任意键退出...");
            Console.ReadKey();
            await client.DisconnectAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"连接失败: {ex.Message}");
        }
    }
}
```

## 常见问题

### 1. 注册失败：无效的注册数据

**原因**: `machineName` 或 `capabilities` 字段缺失或为空。

**解决方案**: 确保注册数据包含所有必需字段。

### 2. 注册失败：消息时间戳超出范围

**原因**: 客户端和服务器的时间差异超过 30 秒。

**解决方案**: 同步客户端和服务器的系统时间。

### 3. 连接断开：没有可用的 Windows 客户端

**原因**: 客户端没有定期发送心跳，服务器认为客户端已断开。

**解决方案**: 确保心跳间隔小于 30 秒（建议 25 秒）。

### 4. 如何确认注册成功？

检查注册响应的 `success` 字段是否为 `true`，并保存 `data.clientId`。

### 5. 客户端断开后需要重新注册吗？

是的，每次建立新的 WebSocket 连接后都需要重新注册。

## 相关文档

- [Windows 协议定义](../src/types/windowsProtocol.ts)
- [连接管理器实现](../src/services/windowsClientConnectionManager.ts)
- [WebSocket 处理器](../src/websocket/windowsClientHandler.ts)

## 技术支持

如果遇到问题，请查看服务器日志以获取更多详细信息。服务器使用 `serviceLogger` 记录所有客户端连接、注册和心跳活动。
