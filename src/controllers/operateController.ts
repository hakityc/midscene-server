import { OperateService } from '../services/operateService';

export class OperateController {
  private operateService: OperateService;

  constructor() {
    this.operateService = new OperateService();
  }

  async connectCurrentTab(option: { forceSameTabNavigation: boolean }) {
    await this.operateService.connectCurrentTab(option);
  }

  async execute(prompt: string) {
    await this.operateService.execute(prompt);
  }

  async expect(prompt: string) {
    return await this.operateService.expect(prompt);
  }

  async executeTasks(tasks: { action: string; verify: string }[]) {
    for (const task of tasks) {
      await this.operateService.execute(task.action);
      const result = await this.operateService.expect(task.verify);
      console.log("result", result);
    }
  }

  async destroy() {
    await this.operateService.destroy();
  }
}
