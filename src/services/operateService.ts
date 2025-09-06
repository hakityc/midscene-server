import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';

export class OperateService {
  private static instance: OperateService | null = null;
  private agent: AgentOverChromeBridge;
  private isInitialized: boolean = false;

  private constructor() {
    this.agent = new AgentOverChromeBridge({
      closeNewTabsAfterDisconnect: true,
      cacheId: 'midscene',
    });
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): OperateService {
    if (!OperateService.instance) {
      OperateService.instance = new OperateService();
    }
    return OperateService.instance;
  }

  /**
   * 初始化连接（确保只初始化一次）
   */
  async initialize(option: { forceSameTabNavigation: boolean } = { forceSameTabNavigation: true }) {
    if (this.isInitialized) {
      console.log('🔄 AgentOverChromeBridge 已经初始化，跳过重复初始化');
      return;
    }

    try {
      await this.agent.connectCurrentTab(option);
      this.isInitialized = true;
      console.log('✅ AgentOverChromeBridge 初始化成功');
    } catch (error) {
      console.error('❌ AgentOverChromeBridge 初始化失败:', error);
      throw error;
    }
  }

  async connectCurrentTab(option: { forceSameTabNavigation: boolean }) {
    try {
      await this.agent.connectCurrentTab(option);
    } catch (error) {
      console.error('连接标签页失败:', error);
      throw error;
    }
  }

  async execute(prompt: string) {
    if (!this.isInitialized) {
      throw new Error('AgentOverChromeBridge 未初始化，请先调用 initialize() 方法');
    }

    try {
      await this.agent.ai(prompt);
    } catch (error) {
      console.error('执行命令失败:', error);
      throw error;
    }
  }

  async expect(prompt: string) {
    if (!this.isInitialized) {
      throw new Error('AgentOverChromeBridge 未初始化，请先调用 initialize() 方法');
    }

    try {
      await this.agent.aiAssert(prompt);
    } catch (error) {
      console.error('断言失败:', error);
      throw error;
    }
  }

  async destroy() {
    try {
      await this.agent.destroy();
      this.isInitialized = false;
      console.log('✅ AgentOverChromeBridge 已销毁');
    } catch (error) {
      console.error('销毁失败:', error);
      throw error;
    }
  }

  /**
   * 重置单例实例（用于测试或强制重新初始化）
   */
  public static resetInstance() {
    if (OperateService.instance) {
      OperateService.instance.destroy().catch(console.error);
      OperateService.instance = null;
    }
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}
