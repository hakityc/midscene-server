import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';
import { AppError } from '../utils/error';
import { ConnectCurrentTabOption } from '../types/operate';
import { serviceLogger } from '../utils/logger';

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
      serviceLogger.info({ option }, '浏览器标签页连接成功');
    } catch (error: any) {
      serviceLogger.error({ error }, '浏览器标签页连接失败');

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
      serviceLogger.info({ prompt }, 'AI执行成功');
    } catch (error: any) {
      // 处理AI执行错误
      if (error.message && error.message.includes('ai')) {
        serviceLogger.error({ error }, 'AI执行失败');
        throw new AppError(`AI execution failed: ${error.message}`, 500);
      }
      // 处理其他执行错误
      serviceLogger.error({ error }, '操作执行错误');
      throw new AppError(`Operation execution error: ${error.message}`, 500);
    }
  }

  async expect(prompt: string) {
    try {
      await this.agent.aiAssert(prompt);
      serviceLogger.info({ prompt }, 'AI断言成功');
    } catch (error: any) {
      // 处理AI断言错误
      if (error.message && error.message.includes('ai')) {
        serviceLogger.error({ error }, 'AI断言失败');
        throw new AppError(`AI assertion failed: ${error.message}`, 500);
      }
      // 处理其他断言错误
      serviceLogger.error({ error }, '断言执行错误');
      throw new AppError(`Assertion execution error: ${error.message}`, 500);
    }
  }

  async destroy() {
    try {
      await this.agent.destroy();
      serviceLogger.info('浏览器标签页销毁成功');
    } catch (error: any) {
      // 处理销毁错误
      serviceLogger.error({ error }, '浏览器标签页销毁失败');
      throw new AppError(`Failed to destroy agent: ${error.message}`, 500);
    }
  }
}
