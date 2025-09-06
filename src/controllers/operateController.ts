import { OperateService } from '../services/operateService';

export class OperateController {
  private operateService: OperateService;

  constructor() {
    // 使用单例模式获取 OperateService 实例
    this.operateService = OperateService.getInstance();
  }

  /**
   * 初始化连接（确保 AgentOverChromeBridge 已连接）
   */
  async initialize(option: { forceSameTabNavigation: boolean } = { forceSameTabNavigation: true }) {
    await this.operateService.initialize(option);
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

  /**
   * 检查服务是否已准备就绪
   */
  isReady(): boolean {
    return this.operateService.isReady();
  }
}
