/**
 * Windows 客户端 WebSocket 处理器
 *
 * 职责：
 * - 处理 Windows 客户端的 WebSocket 连接
 * - 消息接收和分发
 * - 客户端注册和注销
 */

import { WindowsClientConnectionManager } from '../services/windowsClientConnectionManager';
import type {
  AnyWindowsWSMessage,
  ClientRegistrationData,
  ClientRegistrationResponse,
  WindowsWSEvent,
  WindowsWSPing,
  WindowsWSResponse,
} from '../types/windowsProtocol';
import { serviceLogger } from '../utils/logger';

/**
 * 设置 Windows 客户端 WebSocket 处理
 */
export function setupWindowsClientWebSocket(wss: any) {
  const connectionManager = WindowsClientConnectionManager.getInstance();

  serviceLogger.info('Windows 客户端 WebSocket 处理器已初始化');

  // 处理每个新连接
  wss.on('connection', (ws: any) => {
    let clientId: string | null = null;

    serviceLogger.info('Windows 客户端尝试连接');

    // 接收消息
    ws.on('message', (data: Buffer) => {
      try {
        const message: AnyWindowsWSMessage = JSON.parse(data.toString());

        // 验证消息格式
        if (!validateMessage(message)) {
          serviceLogger.warn({ message }, '收到无效的 Windows 客户端消息');
          return;
        }

        // 根据消息类型处理
        switch (message.type) {
          case 'request':
            // 客户端主动发起的请求（如注册）
            if (message.action === 'register') {
              handleRegister(ws, message, connectionManager)
                .then((newClientId) => {
                  clientId = newClientId;
                })
                .catch((error) => {
                  serviceLogger.error({ error }, '处理客户端注册失败');
                });
            }
            break;

          case 'response':
            // 操作响应
            handleResponse(message as WindowsWSResponse, connectionManager);
            break;

          case 'event':
            // 客户端事件
            handleEvent(message as WindowsWSEvent, connectionManager);
            break;

          case 'ping':
            // 心跳 Ping
            handlePing(
              ws,
              message as WindowsWSPing,
              clientId,
              connectionManager,
            );
            break;

          default:
            serviceLogger.warn({ messageType: message.type }, '未知的消息类型');
        }
      } catch (error) {
        serviceLogger.error(
          { error, data: data.toString() },
          '解析 Windows 客户端消息失败',
        );
      }
    });

    // 连接断开
    ws.on('close', () => {
      if (clientId) {
        serviceLogger.info({ clientId }, 'Windows 客户端断开连接');
        connectionManager.unregisterClient(clientId);
      }
    });

    // 错误处理
    ws.on('error', (error: Error) => {
      serviceLogger.error({ error, clientId }, 'Windows 客户端 WebSocket 错误');
    });
  });

  return connectionManager;
}

/**
 * 验证消息格式
 */
function validateMessage(message: any): boolean {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (!message.id || !message.type || typeof message.timestamp !== 'number') {
    return false;
  }

  // 检查时间戳是否在合理范围内（30秒内）
  const now = Date.now();
  const timeDiff = Math.abs(now - message.timestamp);
  if (timeDiff > 30000) {
    serviceLogger.warn(
      { timestamp: message.timestamp, now, timeDiff },
      '消息时间戳超出范围',
    );
    return false;
  }

  return true;
}

/**
 * 处理客户端注册
 */
async function handleRegister(
  ws: any,
  message: any,
  connectionManager: WindowsClientConnectionManager,
): Promise<string> {
  const registrationData: ClientRegistrationData = message.params;

  if (!registrationData || !registrationData.machineName) {
    throw new Error('无效的注册数据');
  }

  // 注册客户端
  const clientId = connectionManager.registerClient(ws, registrationData);

  // 发送注册成功响应
  const response: ClientRegistrationResponse = {
    clientId,
    serverTime: Date.now(),
  };

  ws.send(
    JSON.stringify({
      type: 'response',
      requestId: message.id,
      success: true,
      data: response,
      id: `resp-${message.id}`,
      timestamp: Date.now(),
    }),
  );

  serviceLogger.info(
    {
      clientId,
      machineName: registrationData.machineName,
      capabilities: registrationData.capabilities,
    },
    'Windows 客户端注册成功',
  );

  return clientId;
}

/**
 * 处理响应消息
 */
function handleResponse(
  response: WindowsWSResponse,
  connectionManager: WindowsClientConnectionManager,
): void {
  connectionManager.handleResponse(response);
}

/**
 * 处理事件消息
 */
function handleEvent(
  event: WindowsWSEvent,
  connectionManager: WindowsClientConnectionManager,
): void {
  connectionManager.handleEvent(event);
}

/**
 * 处理心跳 Ping
 */
function handlePing(
  ws: any,
  ping: WindowsWSPing,
  clientId: string | null,
  connectionManager: WindowsClientConnectionManager,
): void {
  if (clientId) {
    connectionManager.updateHeartbeat(clientId);
  }

  // 发送 Pong 响应
  ws.send(
    JSON.stringify({
      type: 'pong',
      id: `pong-${ping.id}`,
      timestamp: Date.now(),
    }),
  );
}
