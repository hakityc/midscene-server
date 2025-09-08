import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';
import { AppError } from '../server/error';
import { ConnectCurrentTabOption } from '../types/operate';

export class OperateService {
  private agent: AgentOverChromeBridge;

  constructor() {
    this.agent = new AgentOverChromeBridge({
      closeNewTabsAfterDisconnect: true,
      cacheId: 'midscene',
    });
  }

  async connectCurrentTab(option: ConnectCurrentTabOption) {
    try {
      await this.agent.connectCurrentTab(option);
      console.log('✅ 浏览器标签页连接成功');
    } catch (error: any) {
      console.error('❌ 浏览器连接失败:', error);

      // 处理浏览器连接错误
      if (error.message && error.message.includes('connect')) {
        throw new AppError('Failed to connect to browser', 503);
      }
      // 处理其他连接错误
      throw new AppError(`Browser connection error: ${error.message}`, 500);
    }
  }

  async execute(prompt: string) {
    try {
      await this.agent.ai(prompt);
    } catch (error: any) {
      // 处理AI执行错误
      if (error.message && error.message.includes('ai')) {
        throw new AppError(`AI execution failed: ${error.message}`, 500);
      }
      // 处理其他执行错误
      throw new AppError(`Operation execution error: ${error.message}`, 500);
    }
  }

  async expect(prompt: string) {
    try {
      await this.agent.aiAssert(prompt);
    } catch (error: any) {
      // 处理AI断言错误
      if (error.message && error.message.includes('ai')) {
        throw new AppError(`AI assertion failed: ${error.message}`, 500);
      }
      // 处理其他断言错误
      throw new AppError(`Assertion execution error: ${error.message}`, 500);
    }
  }

  async destroy() {
    try {
      await this.agent.destroy();
    } catch (error: any) {
      // 处理销毁错误
      throw new AppError(`Failed to destroy agent: ${error.message}`, 500);
    }
  }
}
