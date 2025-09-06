import { OperateService } from '../services/operateService';

export class OperateController {
  private operateService: OperateService;

  constructor() {
    this.operateService = new OperateService();
  }

  async connectCurrentTab(option: { forceSameTabNavigation: boolean, tabId: number }) {
    await this.operateService.connectCurrentTab(option);
  }

  async execute(prompt: string) {
    await this.operateService.execute(prompt);
  }

  async destroy() {
    await this.operateService.destroy();
  }
}