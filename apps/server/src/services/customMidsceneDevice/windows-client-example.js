/**
 * Windows 客户端完整示例
 *
 * 这是一个完整的 Windows 客户端实现，展示如何：
 * - 连接到 Midscene Server
 * - 注册客户端
 * - 处理服务器请求
 * - 执行 Windows 操作
 * - 心跳保活
 *
 * 使用方法：
 * 1. 安装依赖：npm install ws robotjs screenshot-desktop clipboardy node-window-manager
 * 2. 运行：node windows-client-example.js
 */

const WebSocket = require('ws');
const os = require('node:os');
const { randomUUID } = require('node:crypto');

// 配置
const CONFIG = {
  serverUrl: 'ws://localhost:3000/ws/windows-client',
  heartbeatInterval: 30000, // 30秒
  reconnectInterval: 5000, // 5秒
  maxReconnectAttempts: 10,
};

// 客户端类
class WindowsClient {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;

    // 动态加载依赖（避免没有安装时报错）
    this.loadDependencies();
  }

  // 加载依赖
  loadDependencies() {
    try {
      this.screenshot = require('screenshot-desktop');
      this.robot = require('robotjs');
      this.clipboard = require('clipboardy');
      this.windowManager = require('node-window-manager').windowManager;
      console.log('✅ 所有依赖加载成功');
    } catch (error) {
      console.warn('⚠️ 部分依赖未安装，某些功能将不可用:', error.message);
      console.log(
        '💡 请运行: npm install ws robotjs screenshot-desktop clipboardy node-window-manager',
      );
    }
  }

  // 连接到服务器
  connect() {
    console.log(`🔌 连接到服务器: ${CONFIG.serverUrl}`);

    this.ws = new WebSocket(CONFIG.serverUrl);

    this.ws.on('open', () => this.handleOpen());
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (error) => this.handleError(error));
  }

  // 连接成功
  handleOpen() {
    console.log('✅ WebSocket 连接成功');
    this.reconnectAttempts = 0;

    // 注册客户端
    this.register();

    // 启动心跳
    this.startHeartbeat();
  }

  // 注册客户端
  register() {
    const registrationMessage = {
      id: randomUUID(),
      type: 'request',
      action: 'register',
      params: {
        machineName: os.hostname(),
        os: `${os.type()} ${os.release()}`,
        ip: this.getLocalIP(),
        capabilities: this.getCapabilities(),
        version: '1.0.0',
      },
      timestamp: Date.now(),
    };

    console.log('📝 注册客户端:', registrationMessage.params);
    this.send(registrationMessage);
  }

  // 获取本地IP
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

  // 获取支持的能力
  getCapabilities() {
    const capabilities = ['getScreenSize', 'getStatus'];

    if (this.screenshot) capabilities.push('screenshot');
    if (this.robot) {
      capabilities.push(
        'mouseClick',
        'mouseDoubleClick',
        'mouseRightClick',
        'mouseHover',
        'mouseDrag',
        'typeText',
        'keyPress',
        'scroll',
      );
    }
    if (this.windowManager) {
      capabilities.push('getWindowList', 'activateWindow');
    }
    if (this.clipboard) {
      capabilities.push('getClipboard', 'setClipboard');
    }

    return capabilities;
  }

  // 处理消息
  async handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());

      console.log(
        `📨 收到消息: ${message.type} - ${message.action || message.requestId || ''}`,
      );

      switch (message.type) {
        case 'request':
          await this.handleRequest(message);
          break;

        case 'response':
          // 注册响应
          if (message.success && message.data && message.data.clientId) {
            this.clientId = message.data.clientId;
            console.log(`✅ 注册成功，客户端ID: ${this.clientId}`);
          }
          break;

        case 'pong':
          // 心跳响应
          console.log('💓 收到心跳响应');
          break;

        default:
          console.warn('⚠️ 未知消息类型:', message.type);
      }
    } catch (error) {
      console.error('❌ 处理消息失败:', error);
    }
  }

  // 处理请求
  async handleRequest(request) {
    const { id, action, params } = request;

    try {
      console.log(`🔧 执行操作: ${action}`, params);

      let result;

      switch (action) {
        case 'screenshot':
          result = await this.captureScreenshot();
          break;

        case 'getScreenSize':
          result = await this.getScreenSize();
          break;

        case 'mouseClick':
          result = await this.mouseClick(params.x, params.y);
          break;

        case 'mouseDoubleClick':
          result = await this.mouseDoubleClick(params.x, params.y);
          break;

        case 'mouseRightClick':
          result = await this.mouseRightClick(params.x, params.y);
          break;

        case 'mouseHover':
          result = await this.mouseHover(params.x, params.y);
          break;

        case 'mouseDrag':
          result = await this.mouseDrag(
            params.fromX,
            params.fromY,
            params.toX,
            params.toY,
          );
          break;

        case 'typeText':
          result = await this.typeText(params.text);
          break;

        case 'keyPress':
          result = await this.keyPress(params.key, params.modifiers);
          break;

        case 'scroll':
          result = await this.scroll(params);
          break;

        case 'getWindowList':
          result = await this.getWindowList();
          break;

        case 'activateWindow':
          result = await this.activateWindow(params.windowHandle);
          break;

        case 'getClipboard':
          result = await this.getClipboard();
          break;

        case 'setClipboard':
          result = await this.setClipboard(params.text);
          break;

        default:
          throw new Error(`不支持的操作: ${action}`);
      }

      // 发送成功响应
      this.sendResponse(id, true, result);
      console.log(`✅ 操作成功: ${action}`);
    } catch (error) {
      console.error(`❌ 操作失败: ${action}`, error);
      this.sendResponse(id, false, null, {
        code: 'OPERATION_FAILED',
        message: error.message,
        stack: error.stack,
      });
    }
  }

  // ==================== 操作实现 ====================

  async captureScreenshot() {
    if (!this.screenshot) {
      throw new Error('screenshot-desktop 未安装');
    }
    const img = await this.screenshot();
    return `data:image/png;base64,${img.toString('base64')}`;
  }

  async getScreenSize() {
    if (!this.robot) {
      throw new Error('robotjs 未安装');
    }
    const screenSize = this.robot.getScreenSize();
    return {
      width: screenSize.width,
      height: screenSize.height,
      dpr: 1,
    };
  }

  async mouseClick(x, y) {
    if (!this.robot) {
      throw new Error('robotjs 未安装');
    }
    this.robot.moveMouse(x, y);
    this.robot.mouseClick();
    return { success: true };
  }

  async mouseDoubleClick(x, y) {
    if (!this.robot) {
      throw new Error('robotjs 未安装');
    }
    this.robot.moveMouse(x, y);
    this.robot.mouseClick('left', true);
    return { success: true };
  }

  async mouseRightClick(x, y) {
    if (!this.robot) {
      throw new Error('robotjs 未安装');
    }
    this.robot.moveMouse(x, y);
    this.robot.mouseClick('right');
    return { success: true };
  }

  async mouseHover(x, y) {
    if (!this.robot) {
      throw new Error('robotjs 未安装');
    }
    this.robot.moveMouse(x, y);
    return { success: true };
  }

  async mouseDrag(fromX, fromY, toX, toY) {
    if (!this.robot) {
      throw new Error('robotjs 未安装');
    }
    this.robot.moveMouse(fromX, fromY);
    this.robot.mouseToggle('down');
    this.robot.dragMouse(toX, toY);
    this.robot.mouseToggle('up');
    return { success: true };
  }

  async typeText(text) {
    if (!this.robot) {
      throw new Error('robotjs 未安装');
    }
    this.robot.typeString(text);
    return { success: true };
  }

  async keyPress(key, modifiers = []) {
    if (!this.robot) {
      throw new Error('robotjs 未安装');
    }
    if (modifiers && modifiers.length > 0) {
      this.robot.keyTap(key, modifiers);
    } else {
      this.robot.keyTap(key);
    }
    return { success: true };
  }

  async scroll(params) {
    if (!this.robot) {
      throw new Error('robotjs 未安装');
    }

    if (params.x && params.y) {
      this.robot.moveMouse(params.x, params.y);
    }

    const amount =
      params.direction === 'up' || params.direction === 'left'
        ? params.distance
        : -params.distance;

    if (params.direction === 'up' || params.direction === 'down') {
      this.robot.scrollMouse(0, Math.floor(amount / 10));
    } else {
      this.robot.scrollMouse(Math.floor(amount / 10), 0);
    }

    return { success: true };
  }

  async getWindowList() {
    if (!this.windowManager) {
      throw new Error('node-window-manager 未安装');
    }

    const windows = this.windowManager.getWindows();
    return windows.map((w) => ({
      handle: String(w.getHandle()),
      title: w.getTitle(),
      processId: w.processId,
      isActive: w.isWindow(),
    }));
  }

  async activateWindow(windowHandle) {
    if (!this.windowManager) {
      throw new Error('node-window-manager 未安装');
    }

    const windows = this.windowManager.getWindows();
    const window = windows.find((w) => String(w.getHandle()) === windowHandle);
    if (window) {
      window.bringToTop();
    }
    return { success: true };
  }

  async getClipboard() {
    if (!this.clipboard) {
      throw new Error('clipboardy 未安装');
    }
    return this.clipboard.readSync();
  }

  async setClipboard(text) {
    if (!this.clipboard) {
      throw new Error('clipboardy 未安装');
    }
    this.clipboard.writeSync(text);
    return { success: true };
  }

  // ==================== 辅助方法 ====================

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendResponse(requestId, success, data = null, error = null) {
    this.send({
      id: randomUUID(),
      type: 'response',
      requestId,
      success,
      data,
      error,
      timestamp: Date.now(),
    });
  }

  // 心跳
  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          id: randomUUID(),
          timestamp: Date.now(),
        });
        console.log('💓 发送心跳');
      }
    }, CONFIG.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 连接关闭
  handleClose() {
    console.log('❌ WebSocket 连接关闭');
    this.stopHeartbeat();
    this.reconnect();
  }

  // 错误处理
  handleError(error) {
    console.error('❌ WebSocket 错误:', error.message);
  }

  // 重连
  reconnect() {
    if (this.reconnectAttempts >= CONFIG.maxReconnectAttempts) {
      console.error(
        `❌ 达到最大重连次数 (${CONFIG.maxReconnectAttempts})，停止重连`,
      );
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 ${CONFIG.reconnectInterval / 1000}秒后重连 (尝试 ${this.reconnectAttempts}/${CONFIG.maxReconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect();
    }, CONFIG.reconnectInterval);
  }
}

// 主程序
function main() {
  console.log('🚀 启动 Windows 客户端');
  console.log('='.repeat(50));

  const client = new WindowsClient();
  client.connect();

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n👋 正在关闭客户端...');
    client.stopHeartbeat();
    if (client.ws) {
      client.ws.close();
    }
    process.exit(0);
  });
}

// 运行
main();
