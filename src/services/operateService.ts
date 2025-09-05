import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';

export class OperateService {
  private agent: AgentOverChromeBridge | null = null;
  private isConnected = false;
  private retryCount = 0;
  private maxRetries = 3;

  constructor() {
    this.initializeAgent();
  }

  private async initializeAgent() {
    try {
      this.agent = new AgentOverChromeBridge({
        closeNewTabsAfterDisconnect: true,
        cacheId: 'midscene',
      });
      console.log('✅ Midscene Agent 初始化成功');
    } catch (error) {
      console.error('❌ Midscene Agent 初始化失败:', error);
      this.agent = null;
    }
  }

  private async ensureConnection(): Promise<boolean> {
    if (!this.agent) {
      console.log('🔄 重新初始化 Agent...');
      await this.initializeAgent();
      if (!this.agent) {
        return false;
      }
    }

    if (this.isConnected) {
      return true;
    }

    try {
      await this.agent.connectCurrentTab({ forceSameTabNavigation: true });
      this.isConnected = true;
      this.retryCount = 0;
      console.log('✅ Midscene Agent 连接成功');
      return true;
    } catch (error) {
      console.error('❌ Midscene Agent 连接失败:', error);
      this.isConnected = false;
      this.retryCount++;
      
      if (this.retryCount < this.maxRetries) {
        console.log(`🔄 重试连接 (${this.retryCount}/${this.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * this.retryCount));
        return this.ensureConnection();
      }
      
      return false;
    }
  }

  async connectCurrentTab(option: { forceSameTabNavigation: boolean }) {
    try {
      const connected = await this.ensureConnection();
      if (!connected) {
        throw new Error('无法建立 Midscene Agent 连接');
      }
    } catch (error) {
      console.error('❌ 连接当前标签页失败:', error);
      throw error;
    }
  }

  async execute(prompt: string) {
    try {
      const connected = await this.ensureConnection();
      if (!connected) {
        throw new Error('Midscene Agent 未连接');
      }

      await this.agent!.ai(prompt);
    } catch (error) {
      console.error('❌ 执行操作失败:', error);
      this.isConnected = false; // 标记连接断开，下次重试
      throw error;
    }
  }

  async expect(prompt: string) {
    try {
      const connected = await this.ensureConnection();
      if (!connected) {
        throw new Error('Midscene Agent 未连接');
      }

      return await this.agent!.aiAssert(prompt);
    } catch (error) {
      console.error('❌ 验证操作失败:', error);
      this.isConnected = false; // 标记连接断开，下次重试
      throw error;
    }
  }

  async destroy() {
    try {
      if (this.agent) {
        await this.agent.destroy();
        this.agent = null;
        this.isConnected = false;
        console.log('✅ Midscene Agent 已销毁');
      }
    } catch (error) {
      console.error('❌ 销毁 Agent 失败:', error);
    }
  }
}
