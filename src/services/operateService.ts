import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';

export class OperateService {
  private agent: AgentOverChromeBridge;

  constructor() {
    this.agent = new AgentOverChromeBridge({
      closeNewTabsAfterDisconnect: true,
      cacheId: 'midscene',
    });
  }

  async connectCurrentTab(option: { forceSameTabNavigation: boolean }) {
    await this.agent.connectCurrentTab(option);
  }

  async execute(prompt: string) {
    await this.agent.ai(prompt);
  }

  async expect(prompt: string) {
    await this.agent.aiAssert(prompt);
  }

  async destroy() {
    await this.agent.destroy();
  }
}
