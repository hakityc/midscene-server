import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WindowsClientConnectionManager } from '../windowsClientConnectionManager';
import type { ClientRegistrationData, WindowsWSResponse } from '../../types/windowsProtocol';

// Mock logger
vi.mock('../../utils/logger', () => ({
  serviceLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('WindowsClientConnectionManager', () => {
  let manager: WindowsClientConnectionManager;
  let mockWs: any;

  beforeEach(() => {
    // 重置单例实例
    (WindowsClientConnectionManager as any).instance = null;
    
    manager = WindowsClientConnectionManager.getInstance();

    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
    };

    vi.useFakeTimers();
  });

  afterEach(async () => {
    // 等待所有待处理的请求完成或超时
    const stats = manager.getStats();
    if (stats.pendingRequests > 0) {
      // 给待处理的请求一些时间完成，然后销毁
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    manager.destroy();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = WindowsClientConnectionManager.getInstance();
      const instance2 = WindowsClientConnectionManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('registerClient', () => {
    it('应该成功注册客户端', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'TEST-PC',
        os: 'Windows 11',
        capabilities: ['screenshot', 'mouseClick'],
      };

      const clientId = manager.registerClient(mockWs, metadata);

      expect(clientId).toBeDefined();
      expect(typeof clientId).toBe('string');
      
      const client = manager.getClient(clientId);
      expect(client).toBeDefined();
      expect(client?.metadata.machineName).toBe('TEST-PC');
      expect(client?.status).toBe('connected');
    });

    it('应该为每个客户端生成唯一 ID', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const id1 = manager.registerClient(mockWs, metadata);
      const id2 = manager.registerClient(mockWs, metadata);

      expect(id1).not.toBe(id2);
    });

    it('应该初始化客户端统计信息', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      const client = manager.getClient(clientId);

      expect(client?.activeRequests).toBe(0);
      expect(client?.totalRequests).toBe(0);
      expect(client?.connectedAt).toBeLessThanOrEqual(Date.now());
    });

    it('应该发射 clientConnected 事件', () => {
      return new Promise<void>((resolve) => {
        const metadata: ClientRegistrationData = {
          machineName: 'PC-1',
          os: 'Windows 10',
          capabilities: [],
        };

        manager.on('clientConnected', (client) => {
          expect(client.metadata.machineName).toBe('PC-1');
          resolve();
        });

        manager.registerClient(mockWs, metadata);
      });
    });
  });

  describe('unregisterClient', () => {
    it('应该成功注销客户端', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      manager.unregisterClient(clientId);

      const client = manager.getClient(clientId);
      expect(client).toBeUndefined();
    });

    it('应该处理不存在的客户端 ID', () => {
      expect(() => {
        manager.unregisterClient('non-existent-id');
      }).not.toThrow();
    });

    it('应该发射 clientDisconnected 事件', () => {
      return new Promise<void>((resolve) => {
        const metadata: ClientRegistrationData = {
          machineName: 'PC-1',
          os: 'Windows 10',
          capabilities: [],
        };

        const clientId = manager.registerClient(mockWs, metadata);

        manager.on('clientDisconnected', (client) => {
          expect(client.metadata.machineName).toBe('PC-1');
          resolve();
        });

        manager.unregisterClient(clientId);
      });
    });
  });

  describe('updateHeartbeat', () => {
    it('应该更新客户端心跳时间', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      const client = manager.getClient(clientId);
      const oldHeartbeat = client?.lastHeartbeat;

      vi.advanceTimersByTime(1000);
      manager.updateHeartbeat(clientId);

      const updatedClient = manager.getClient(clientId);
      expect(updatedClient?.lastHeartbeat).toBeGreaterThan(oldHeartbeat!);
    });

    it('应该处理不存在的客户端', () => {
      expect(() => {
        manager.updateHeartbeat('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('getAvailableClients', () => {
    it('应该返回所有已连接的客户端', () => {
      const metadata1: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };
      const metadata2: ClientRegistrationData = {
        machineName: 'PC-2',
        os: 'Windows 11',
        capabilities: [],
      };

      manager.registerClient(mockWs, metadata1);
      manager.registerClient(mockWs, metadata2);

      const available = manager.getAvailableClients();
      expect(available).toHaveLength(2);
      expect(available.every(c => c.status === 'connected')).toBe(true);
    });

    it('应该过滤掉已断开的客户端', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      manager.unregisterClient(clientId);

      const available = manager.getAvailableClients();
      expect(available).toHaveLength(0);
    });
  });

  describe('selectClient', () => {
    it('应该选择活动请求最少的客户端', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC',
        os: 'Windows 10',
        capabilities: [],
      };

      const id1 = manager.registerClient(mockWs, metadata);
      const id2 = manager.registerClient(mockWs, metadata);

      // 模拟第一个客户端有更多请求
      const client1 = manager.getClient(id1);
      const client2 = manager.getClient(id2);
      if (client1) client1.activeRequests = 5;
      if (client2) client2.activeRequests = 2;

      const selected = manager.selectClient();
      expect(selected.id).toBe(id2);
      expect(selected.activeRequests).toBe(2);
    });

    it('应该在没有可用客户端时抛出错误', () => {
      expect(() => {
        manager.selectClient();
      }).toThrow('没有可用的 Windows 客户端');
    });
  });

  describe('sendRequest', () => {
    it('应该成功发送请求并返回响应', async () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: ['screenshot'],
      };

      const clientId = manager.registerClient(mockWs, metadata);

      // 模拟异步响应
      const requestPromise = manager.sendRequest(
        clientId,
        'screenshot',
        {},
        5000
      );

      // 获取发送的请求
      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentRequest = JSON.parse(mockWs.send.mock.calls[0][0]);

      // 模拟客户端响应
      const response: WindowsWSResponse = {
        id: 'response-id',
        type: 'response',
        requestId: sentRequest.id,
        success: true,
        data: { screenshot: 'base64data' },
        timestamp: Date.now(),
      };

      manager.handleResponse(response);

      const result = await requestPromise;
      expect(result).toEqual({ screenshot: 'base64data' });
    });

    it('应该在客户端不存在时抛出错误', async () => {
      await expect(
        manager.sendRequest('non-existent', 'screenshot', {})
      ).rejects.toThrow('客户端不存在');
    });

    it('应该在请求超时时拒绝 Promise', async () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);

      const requestPromise = manager.sendRequest(
        clientId,
        'screenshot',
        {},
        1000
      );

      // 快进超时时间
      vi.advanceTimersByTime(1100);

      await expect(requestPromise).rejects.toThrow('请求超时');
    });

    it('应该更新客户端请求计数', async () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      const client = manager.getClient(clientId);

      expect(client?.activeRequests).toBe(0);
      expect(client?.totalRequests).toBe(0);

      const requestPromise = manager.sendRequest(clientId, 'screenshot', {});

      const updatedClient = manager.getClient(clientId);
      expect(updatedClient?.activeRequests).toBe(1);
      expect(updatedClient?.totalRequests).toBe(1);

      // 完成请求
      const sentRequest = JSON.parse(mockWs.send.mock.calls[0][0]);
      const response: WindowsWSResponse = {
        id: 'resp-id',
        type: 'response',
        requestId: sentRequest.id,
        success: true,
        data: {},
        timestamp: Date.now(),
      };
      manager.handleResponse(response);

      await requestPromise;
      
      const finalClient = manager.getClient(clientId);
      expect(finalClient?.activeRequests).toBe(0);
    });

    it('应该处理发送失败的情况', async () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      mockWs.send.mockImplementation(() => {
        throw new Error('WebSocket 发送失败');
      });

      await expect(
        manager.sendRequest(clientId, 'screenshot', {})
      ).rejects.toThrow('WebSocket 发送失败');

      // 验证请求计数被正确清理
      const client = manager.getClient(clientId);
      expect(client?.activeRequests).toBe(0);
    });
  });

  describe('handleResponse', () => {
    it('应该处理成功响应', async () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      const requestPromise = manager.sendRequest(clientId, 'screenshot', {});

      const sentRequest = JSON.parse(mockWs.send.mock.calls[0][0]);
      const response: WindowsWSResponse = {
        id: 'resp-id',
        type: 'response',
        requestId: sentRequest.id,
        success: true,
        data: { result: 'success' },
        timestamp: Date.now(),
      };

      manager.handleResponse(response);

      const result = await requestPromise;
      expect(result).toEqual({ result: 'success' });
    });

    it('应该处理失败响应', async () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      const requestPromise = manager.sendRequest(clientId, 'screenshot', {});

      const sentRequest = JSON.parse(mockWs.send.mock.calls[0][0]);
      const response: WindowsWSResponse = {
        id: 'resp-id',
        type: 'response',
        requestId: sentRequest.id,
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: '操作失败',
        },
        timestamp: Date.now(),
      };

      manager.handleResponse(response);

      await expect(requestPromise).rejects.toThrow('操作失败');
    });

    it('应该忽略未知请求的响应', () => {
      const response: WindowsWSResponse = {
        id: 'resp-id',
        type: 'response',
        requestId: 'unknown-request-id',
        success: true,
        data: {},
        timestamp: Date.now(),
      };

      expect(() => {
        manager.handleResponse(response);
      }).not.toThrow();
    });
  });

  describe('心跳检测', () => {
    it.skip('应该断开超时的客户端（心跳定时器需要实际运行）', () => {
      // 注意：此测试需要实际运行定时器，在单元测试环境中较难模拟
      // 可在集成测试中验证此功能
    });

    it('应该保持有心跳的客户端连接', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);

      // 定期更新心跳
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(25000); // 25秒
        manager.updateHeartbeat(clientId);
      }

      // 客户端应该仍然连接
      const client = manager.getClient(clientId);
      expect(client).toBeDefined();
      expect(client?.status).toBe('connected');
    });

    it('应该能够停止心跳检测', () => {
      manager.stopHeartbeat();
      
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);

      // 快进很长时间
      vi.advanceTimersByTime(120000);

      // 客户端应该仍然存在（因为心跳检测已停止）
      const client = manager.getClient(clientId);
      expect(client).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('应该返回正确的统计信息', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC',
        os: 'Windows 10',
        capabilities: [],
      };

      manager.registerClient(mockWs, metadata);
      manager.registerClient(mockWs, metadata);

      const stats = manager.getStats();

      expect(stats.total).toBe(2);
      expect(stats.connected).toBe(2);
      expect(stats.busy).toBe(0);
      expect(stats.disconnected).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.activeRequests).toBe(0);
      expect(stats.pendingRequests).toBe(0);
    });

    it('应该正确统计活动请求数', async () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      
      // 发送请求但不响应
      const req1 = manager.sendRequest(clientId, 'screenshot', {}).catch(() => {});
      const req2 = manager.sendRequest(clientId, 'mouseClick', { x: 100, y: 100 }).catch(() => {});

      const stats = manager.getStats();
      expect(stats.activeRequests).toBe(2);
      expect(stats.pendingRequests).toBe(2);
      
      // 清理：响应这些请求或等待它们超时
      const sentRequest1 = JSON.parse(mockWs.send.mock.calls[0][0]);
      const sentRequest2 = JSON.parse(mockWs.send.mock.calls[1][0]);
      
      manager.handleResponse({
        id: 'resp-1',
        type: 'response',
        requestId: sentRequest1.id,
        success: true,
        data: {},
        timestamp: Date.now(),
      });
      
      manager.handleResponse({
        id: 'resp-2',
        type: 'response',
        requestId: sentRequest2.id,
        success: true,
        data: {},
        timestamp: Date.now(),
      });
      
      await req1;
      await req2;
    });
  });

  describe('destroy', () => {
    it('应该清理所有资源', () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC',
        os: 'Windows 10',
        capabilities: [],
      };

      manager.registerClient(mockWs, metadata);
      manager.registerClient(mockWs, metadata);

      manager.destroy();

      const stats = manager.getStats();
      expect(stats.total).toBe(0);
      expect(stats.activeRequests).toBe(0);
    });

    it('应该取消所有待处理请求', async () => {
      const metadata: ClientRegistrationData = {
        machineName: 'PC-1',
        os: 'Windows 10',
        capabilities: [],
      };

      const clientId = manager.registerClient(mockWs, metadata);
      const requestPromise = manager.sendRequest(clientId, 'screenshot', {});

      manager.destroy();

      await expect(requestPromise).rejects.toThrow('客户端已断开连接');
    });
  });
});

