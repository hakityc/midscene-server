/**
 * WebOperateServiceRefactored 最后标签页跟踪功能测试
 *
 * 测试新增的 lastConnectedTabId 跟踪逻辑：
 * - connectLastTab 正确设置 lastConnectedTabId
 * - ensureCurrentTabConnection 检测标签页变化并重新连接
 * - destroyAgent 正确重置 lastConnectedTabId
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OperateServiceState } from '../BaseOperateService';
import { WebOperateServiceRefactored } from '../WebOperateServiceRefactored';

// Mock 依赖
vi.mock('@midscene/web/bridge-mode', () => ({
  AgentOverChromeBridge: vi.fn(),
}));

vi.mock('../../routes/health', () => ({
  setBrowserConnected: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  serviceLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('WebOperateServiceRefactored', () => {
  let service: WebOperateServiceRefactored;
  let mockAgent: any;

  beforeEach(() => {
    // 重置单例
    WebOperateServiceRefactored.resetInstance();
    service = WebOperateServiceRefactored.getInstance();

    // 创建模拟的 Agent
    mockAgent = {
      getBrowserTabList: vi.fn(),
      setActiveTabId: vi.fn(),
      page: {
        getActiveTabId: vi.fn(),
        showStatusMessage: vi.fn(),
      },
      destroy: vi.fn(),
      ai: vi.fn(),
      aiAssert: vi.fn(),
      runYaml: vi.fn(),
      evaluateJavaScript: vi.fn(),
      screenshot: vi.fn(),
      setAIActionContext: vi.fn(),
      onTaskStartTip: undefined,
    };

    // 设置 agent 属性
    (service as any).agent = mockAgent;
    (service as any).state = OperateServiceState.RUNNING;
  });

  afterEach(() => {
    WebOperateServiceRefactored.resetInstance();
    vi.clearAllMocks();
  });

  describe('lastConnectedTabId 初始化和重置', () => {
    it('应该初始化为 null', () => {
      const lastTabId = (service as any).lastConnectedTabId;
      expect(lastTabId).toBeNull();
    });

    it('destroyAgent 应该重置 lastConnectedTabId 为 null', async () => {
      // 先设置一个值
      (service as any).lastConnectedTabId = 123;
      expect((service as any).lastConnectedTabId).toBe(123);

      // 调用 destroyAgent
      await (service as any).destroyAgent();

      // 验证已重置
      expect((service as any).lastConnectedTabId).toBeNull();
    });
  });

  describe('connectLastTab 设置 lastConnectedTabId', () => {
    it('当目标标签页已激活时，应该设置 lastConnectedTabId', async () => {
      const tabs = [{ id: '100' }, { id: '200' }];
      const targetTabId = 200;

      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      mockAgent.page.getActiveTabId.mockResolvedValue(targetTabId);

      await (service as any).connectLastTab();

      expect((service as any).lastConnectedTabId).toBe(targetTabId);
      expect(mockAgent.setActiveTabId).not.toHaveBeenCalled();
    });

    it('当需要切换标签页时，应该设置 lastConnectedTabId', async () => {
      const tabs = [{ id: '100' }, { id: '200' }];
      const targetTabId = 200;
      const currentActiveTabId = 100;

      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      mockAgent.page.getActiveTabId.mockResolvedValue(currentActiveTabId);

      await (service as any).connectLastTab();

      expect((service as any).lastConnectedTabId).toBe(targetTabId);
      expect(mockAgent.setActiveTabId).toHaveBeenCalledWith('200');
    });

    it('当无法获取当前激活标签页时，应该仍然设置 lastConnectedTabId', async () => {
      const tabs = [{ id: '100' }, { id: '200' }];
      const targetTabId = 200;

      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      mockAgent.page.getActiveTabId.mockRejectedValue(new Error('获取失败'));

      await (service as any).connectLastTab();

      expect((service as any).lastConnectedTabId).toBe(targetTabId);
      expect(mockAgent.setActiveTabId).toHaveBeenCalledWith('200');
    });

    it('当标签页列表为空时，不应该设置 lastConnectedTabId', async () => {
      mockAgent.getBrowserTabList.mockResolvedValue([]);

      await (service as any).connectLastTab();

      expect((service as any).lastConnectedTabId).toBeNull();
      expect(mockAgent.setActiveTabId).not.toHaveBeenCalled();
    });
  });

  describe('ensureCurrentTabConnection 检测标签页变化', () => {
    beforeEach(() => {
      // 确保服务已启动
      (service as any).state = OperateServiceState.RUNNING;
      mockAgent.page.showStatusMessage.mockResolvedValue(undefined);
    });

    it('当 lastConnectedTabId 为 null 时，应该首次设置', async () => {
      const tabs = [{ id: '100' }, { id: '200' }];
      const latestTabId = 200;

      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      (service as any).lastConnectedTabId = null;

      await (service as any).ensureCurrentTabConnection();

      expect((service as any).lastConnectedTabId).toBe(latestTabId);
      expect(mockAgent.setActiveTabId).not.toHaveBeenCalled();
    });

    it('当 lastConnectedTabId 与最新标签页ID不同时，应该重新连接', async () => {
      const tabs = [{ id: '100' }, { id: '200' }];
      const oldTabId = 100;
      const newTabId = 200;

      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      mockAgent.page.getActiveTabId.mockResolvedValue(newTabId);
      (service as any).lastConnectedTabId = oldTabId;

      // Mock connectLastTab 以避免实际连接逻辑
      const connectLastTabSpy = vi
        .spyOn(service as any, 'connectLastTab')
        .mockResolvedValue(undefined);

      await (service as any).ensureCurrentTabConnection();

      expect(connectLastTabSpy).toHaveBeenCalled();
    });

    it('当 lastConnectedTabId 与最新标签页ID相同时，应该跳过重新连接', async () => {
      const tabs = [{ id: '100' }, { id: '200' }];
      const tabId = 200;

      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      (service as any).lastConnectedTabId = tabId;

      const connectLastTabSpy = vi
        .spyOn(service as any, 'connectLastTab')
        .mockResolvedValue(undefined);

      await (service as any).ensureCurrentTabConnection();

      expect(connectLastTabSpy).not.toHaveBeenCalled();
    });

    it('当检查标签页列表失败时，应该继续执行连接检查', async () => {
      mockAgent.getBrowserTabList.mockRejectedValue(
        new Error('获取标签页列表失败'),
      );
      (service as any).lastConnectedTabId = 100;

      // 不应该抛出错误，应该继续执行
      await expect(
        (service as any).ensureCurrentTabConnection(),
      ).resolves.not.toThrow();

      // 应该继续执行 quickConnectionCheck
      expect(mockAgent.page.showStatusMessage).toHaveBeenCalled();
    });

    it('当标签页列表为空时，不应该修改 lastConnectedTabId', async () => {
      mockAgent.getBrowserTabList.mockResolvedValue([]);
      (service as any).lastConnectedTabId = 100;

      await (service as any).ensureCurrentTabConnection();

      expect((service as any).lastConnectedTabId).toBe(100);
    });
  });

  describe('完整流程测试', () => {
    it('应该正确处理从首次连接到标签页变化的完整流程', async () => {
      // 1. 首次连接
      let tabs = [{ id: '100' }, { id: '200' }];
      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      mockAgent.page.getActiveTabId.mockResolvedValue(200);
      mockAgent.page.showStatusMessage.mockResolvedValue(undefined);

      (service as any).lastConnectedTabId = null;
      await (service as any).ensureCurrentTabConnection();

      expect((service as any).lastConnectedTabId).toBe(200);

      // 2. 标签页变化（新增了一个标签页）
      tabs = [{ id: '100' }, { id: '200' }, { id: '300' }];
      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      mockAgent.page.getActiveTabId.mockResolvedValue(300);

      const connectLastTabSpy = vi
        .spyOn(service as any, 'connectLastTab')
        .mockImplementation(async () => {
          (service as any).lastConnectedTabId = 300;
        });

      await (service as any).ensureCurrentTabConnection();

      expect(connectLastTabSpy).toHaveBeenCalled();
      expect((service as any).lastConnectedTabId).toBe(300);

      // 3. 标签页未变化
      connectLastTabSpy.mockClear();
      await (service as any).ensureCurrentTabConnection();

      expect(connectLastTabSpy).not.toHaveBeenCalled();
      expect((service as any).lastConnectedTabId).toBe(300);
    });

    it('destroyAgent 应该清理所有状态包括 lastConnectedTabId', async () => {
      // 设置一些状态
      (service as any).lastConnectedTabId = 200;
      (service as any).reconnectAttempts = 3;

      await (service as any).destroyAgent();

      expect((service as any).lastConnectedTabId).toBeNull();
      expect(mockAgent.destroy).toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该正确处理标签页ID为字符串的情况', async () => {
      const tabs = [{ id: '100' }, { id: '200' }];
      const targetTabId = 200;

      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      mockAgent.page.getActiveTabId.mockResolvedValue(targetTabId);

      await (service as any).connectLastTab();

      // 应该正确解析字符串ID为数字
      expect((service as any).lastConnectedTabId).toBe(targetTabId);
    });

    it('应该正确处理标签页ID解析失败的情况', async () => {
      const tabs = [{ id: 'invalid' }, { id: '200' }];

      mockAgent.getBrowserTabList.mockResolvedValue(tabs);
      mockAgent.page.getActiveTabId.mockResolvedValue(200);

      await (service as any).connectLastTab();

      // 应该使用最后一个有效标签页
      expect((service as any).lastConnectedTabId).toBe(200);
    });
  });
});
