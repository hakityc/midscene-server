import { OperateService } from '../services/operateService';
import { ConnectCurrentTabOption } from '../types/operate';

export class OperateController {
  private operateService: OperateService;

  constructor() {
    this.operateService = new OperateService();
  }

  async connectCurrentTab(option: ConnectCurrentTabOption) {
    await this.operateService.connectCurrentTab(option);
  }

  async execute(prompt: string) {
    await this.operateService.execute(prompt);
  }

  async destroy() {
    await this.operateService.destroy();
  }
}