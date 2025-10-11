/**
 * Windows 客户端连接管理器
 *
 * 职责：
 * - 管理所有 Windows 客户端的 WebSocket 连接
 * - 处理客户端注册/注销
 * - 消息路由和请求-响应管理
 * - 心跳检测
 * - 负载均衡（选择可用客户端）
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type {
  ClientRegistrationData,
  WindowsAction,
  WindowsWSEvent,
  WindowsWSRequest,
  WindowsWSResponse,
} from '../types/windowsProtocol';
import { serviceLogger } from '../utils/logger';

// ==================== 类型定义 ====================

/**
 * 客户端连接信息
 */
export interface ClientConnection {
  /** 客户端ID */
  id: string;
  /** WebSocket 连接 */
  ws: any; // WebSocket from @hono/node-ws
  /** 客户端元数据 */
  metadata: ClientRegistrationData;
  /** 连接状态 */
  status: 'connected' | 'disconnected' | 'busy';
  /** 最后心跳时间 */
  lastHeartbeat: number;
  /** 活动请求数 */
  activeRequests: number;
  /** 总处理请求数 */
  totalRequests: number;
  /** 连接时间 */
  connectedAt: number;
}

/**
 * 待处理请求
 */
interface PendingRequest {
  /** Promise resolve */
  resolve: (value: any) => void;
  /** Promise reject */
  reject: (error: any) => void;
  /** 超时定时器 */
  timeout: NodeJS.Timeout;
  /** 开始时间 */
  startTime: number;
  /** 操作类型 */
  action: WindowsAction;
}

// ==================== 连接管理器 ====================

export class WindowsClientConnectionManager extends EventEmitter {
  // ==================== 单例模式 ====================
  private static instance: WindowsClientConnectionManager | null = null;

  public static getInstance(): WindowsClientConnectionManager {
    if (!WindowsClientConnectionManager.instance) {
      WindowsClientConnectionManager.instance =
        new WindowsClientConnectionManager();
    }
    return WindowsClientConnectionManager.instance;
  }

  // ==================== 私有属性 ====================

  /** 客户端连接池 */
  private clients: Map<string, ClientConnection> = new Map();

  /** 待处理请求 */
  private pendingRequests: Map<string, PendingRequest> = new Map();

  /** 心跳定时器 */
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /** 配置 */
  private config = {
    heartbeatInterval: 30000, // 30秒心跳检测
    heartbeatTimeout: 60000, // 60秒无心跳断开
    requestTimeout: 10000, // 10秒请求超时
  };

  private constructor() {
    super();
    this.startHeartbeat();
  }

  // ==================== 客户端管理 ====================

  /**
   * 注册新客户端
   */
  registerClient(ws: any, metadata: ClientRegistrationData): string {
    const clientId = randomUUID();

    const client: ClientConnection = {
      id: clientId,
      ws,
      metadata,
      status: 'connected',
      lastHeartbeat: Date.now(),
      activeRequests: 0,
      totalRequests: 0,
      connectedAt: Date.now(),
    };

    this.clients.set(clientId, client);

    serviceLogger.info(
      {
        clientId,
        machineName: metadata.machineName,
        capabilities: metadata.capabilities,
      },
      'Windows 客户端已注册',
    );

    // 发射事件
    this.emit('clientConnected', client);

    return clientId;
  }

  /**
   * 注销客户端
   */
  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // 取消所有待处理请求
    this.cancelClientRequests(clientId);

    // 移除客户端
    this.clients.delete(clientId);

    serviceLogger.info(
      {
        clientId,
        machineName: client.metadata.machineName,
        uptime: Date.now() - client.connectedAt,
      },
      'Windows 客户端已注销',
    );

    // 发射事件
    this.emit('clientDisconnected', client);
  }

  /**
   * 更新心跳时间
   */
  updateHeartbeat(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastHeartbeat = Date.now();
    }
  }

  /**
   * 获取客户端
   */
  getClient(clientId: string): ClientConnection | undefined {
    return this.clients.get(clientId);
  }

  /**
   * 获取所有可用客户端
   */
  getAvailableClients(): ClientConnection[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.status === 'connected',
    );
  }

  /**
   * 选择最佳客户端（负载均衡）
   */
  selectClient(): ClientConnection {
    const available = this.getAvailableClients();

    if (available.length === 0) {
      throw new Error('没有可用的 Windows 客户端');
    }

    // 选择活动请求数最少的客户端
    return available.reduce((prev, current) =>
      prev.activeRequests < current.activeRequests ? prev : current,
    );
  }

  // ==================== 请求处理 ====================

  /**
   * 发送请求到客户端
   */
  async sendRequest<T = any>(
    clientId: string,
    action: WindowsAction,
    params: any,
    timeout?: number,
  ): Promise<T> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`客户端不存在: ${clientId}`);
    }

    if (client.status === 'disconnected') {
      throw new Error(`客户端已断开连接: ${clientId}`);
    }

    const requestId = randomUUID();
    const requestTimeout = timeout || this.config.requestTimeout;

    // 创建请求消息
    const request: WindowsWSRequest = {
      id: requestId,
      type: 'request',
      action,
      params,
      timeout: requestTimeout,
      timestamp: Date.now(),
    };

    // 创建 Promise
    return new Promise<T>((resolve, reject) => {
      // 设置超时
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        client.activeRequests--;

        serviceLogger.error(
          {
            requestId,
            clientId,
            action,
            timeout: requestTimeout,
          },
          'Windows 客户端请求超时',
        );

        reject(new Error(`请求超时: ${action} (${requestTimeout}ms)`));
      }, requestTimeout);

      // 保存待处理请求
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        startTime: Date.now(),
        action,
      });

      // 更新客户端状态
      client.activeRequests++;
      client.totalRequests++;

      // 发送消息
      try {
        client.ws.send(JSON.stringify(request));

        serviceLogger.debug(
          {
            requestId,
            clientId,
            action,
            params,
          },
          '发送 Windows 客户端请求',
        );
      } catch (error) {
        // 发送失败，清理
        this.pendingRequests.delete(requestId);
        clearTimeout(timeoutHandle);
        client.activeRequests--;

        serviceLogger.error(
          {
            requestId,
            clientId,
            action,
            error,
          },
          '发送 Windows 客户端请求失败',
        );

        reject(error);
      }
    });
  }

  /**
   * 处理响应
   */
  handleResponse(response: WindowsWSResponse): void {
    const pending = this.pendingRequests.get(response.requestId);
    if (!pending) {
      serviceLogger.warn(
        {
          requestId: response.requestId,
        },
        '收到未知请求的响应',
      );
      return;
    }

    // 清理
    this.pendingRequests.delete(response.requestId);
    clearTimeout(pending.timeout);

    // 更新客户端状态
    const client = Array.from(this.clients.values()).find(
      (c) => c.activeRequests > 0,
    );
    if (client) {
      client.activeRequests--;
    }

    const duration = Date.now() - pending.startTime;

    if (response.success) {
      serviceLogger.debug(
        {
          requestId: response.requestId,
          action: pending.action,
          duration,
        },
        'Windows 客户端请求成功',
      );

      pending.resolve(response.data);
    } else {
      serviceLogger.error(
        {
          requestId: response.requestId,
          action: pending.action,
          error: response.error,
          duration,
        },
        'Windows 客户端请求失败',
      );

      const error = new Error(
        response.error?.message || 'Windows 客户端操作失败',
      );
      (error as any).code = response.error?.code;
      (error as any).remoteStack = response.error?.stack;

      pending.reject(error);
    }
  }

  /**
   * 处理事件
   */
  handleEvent(event: WindowsWSEvent): void {
    serviceLogger.info(
      {
        event: event.event,
        data: event.data,
      },
      '收到 Windows 客户端事件',
    );

    // 发射事件
    this.emit('clientEvent', event);
  }

  // ==================== 心跳检测 ====================

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats();
    }, this.config.heartbeatInterval);

    serviceLogger.info('Windows 客户端心跳检测已启动');
  }

  /**
   * 停止心跳检测
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      serviceLogger.info('Windows 客户端心跳检测已停止');
    }
  }

  /**
   * 检查所有客户端心跳
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const disconnected: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      const timeSinceHeartbeat = now - client.lastHeartbeat;

      if (timeSinceHeartbeat > this.config.heartbeatTimeout) {
        serviceLogger.warn(
          {
            clientId,
            machineName: client.metadata.machineName,
            timeSinceHeartbeat,
          },
          'Windows 客户端心跳超时',
        );

        disconnected.push(clientId);
      }
    }

    // 断开超时客户端
    for (const clientId of disconnected) {
      this.unregisterClient(clientId);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 取消客户端的所有待处理请求
   */
  private cancelClientRequests(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // 找到所有该客户端的请求并取消
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('客户端已断开连接'));
      this.pendingRequests.delete(requestId);
    }

    client.activeRequests = 0;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const clients = Array.from(this.clients.values());

    return {
      total: clients.length,
      connected: clients.filter((c) => c.status === 'connected').length,
      busy: clients.filter((c) => c.status === 'busy').length,
      disconnected: clients.filter((c) => c.status === 'disconnected').length,
      totalRequests: clients.reduce((sum, c) => sum + c.totalRequests, 0),
      activeRequests: clients.reduce((sum, c) => sum + c.activeRequests, 0),
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopHeartbeat();

    // 断开所有客户端
    for (const clientId of this.clients.keys()) {
      this.unregisterClient(clientId);
    }

    this.clients.clear();
    this.pendingRequests.clear();

    serviceLogger.info('Windows 客户端连接管理器已销毁');
  }
}
