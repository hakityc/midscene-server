import { mastra } from '../mastra';

export class TaskController {
  private logger = mastra.getLogger();
  private taskAgent = mastra.getAgent('taskAgent');

  async plan(prompt: string) {
    const response = await this.taskAgent.streamVNext(prompt);
    console.log(response);
    return response;
  }
}