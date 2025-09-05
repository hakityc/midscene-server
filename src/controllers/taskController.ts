import { mastra } from '../mastra';
import { OperateController } from './operateController';

export class TaskController {
  private logger = mastra.getLogger();
  private taskAgent = mastra.getAgent('taskAgent');

  /**
   * 从流式响应中提取文本内容
   * @param response 流式响应对象
   * @returns 完整的文本响应
   */
  private async extractTextFromStream(response: any): Promise<string> {
    let fullResponse = '';
    for await (const chunk of response.textStream) {
      fullResponse += chunk;
    }
    return fullResponse;
  }

  /**
   * 解析JSON数组格式的任务步骤
   * @param textResponse 文本响应
   * @returns 解析结果
   */
  private parseTaskSteps(textResponse: string): {
    success: boolean;
    data?: Array<{ action: string; verify: string }>;
    error?: string;
    rawResponse: string;
  } {
    console.log('原始响应:', textResponse);

    try {
      // 尝试匹配JSON数组格式
      const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // 验证解析结果是否为数组
        if (!Array.isArray(parsed)) {
          return {
            success: false,
            error: '解析结果不是数组格式',
            rawResponse: textResponse
          };
        }

        // 验证数组中的每个元素是否包含必要的字段
        const isValid = parsed.every(step =>
          typeof step === 'object' &&
          step !== null &&
          'action' in step &&
          'verify' in step &&
          typeof step.action === 'string' &&
          typeof step.verify === 'string'
        );

        if (!isValid) {
          return {
            success: false,
            error: '解析结果格式不正确，每个步骤必须包含action和verify字段',
            rawResponse: textResponse
          };
        }

        console.log('解析后的JSON:', parsed);
        return {
          success: true,
          data: parsed,
          rawResponse: textResponse
        };
      } else {
        return {
          success: false,
          error: '未找到有效的JSON数组格式',
          rawResponse: textResponse
        };
      }
    } catch (parseError) {
      return {
        success: false,
        error: 'JSON解析失败: ' + (parseError instanceof Error ? parseError.message : String(parseError)),
        rawResponse: textResponse
      };
    }
  }

  async plan(prompt: string) {
    try {
      const response = await this.taskAgent.streamVNext(prompt);
      const fullResponse = await this.extractTextFromStream(response);
      return this.parseTaskSteps(fullResponse);
    } catch (error) {
      console.error('任务规划失败:', error);
      return {
        success: false,
        error: '任务规划失败: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }

  async execute(prompt: string) {
    try {
      const operateController = new OperateController();
      const response = await this.taskAgent.streamVNext(prompt);
      const fullResponse = await this.extractTextFromStream(response);
      const parseResult = this.parseTaskSteps(fullResponse);
      operateController.connectCurrentTab({ forceSameTabNavigation: true });
      if (parseResult.success && parseResult.data) {
        // 执行任务步骤
        for (const step of parseResult.data) {
          console.log(`执行步骤: ${step.action}`);
          operateController.executeTasks(parseResult.data);
        }

        return {
          success: true,
          message: '任务执行完成',
          executedSteps: parseResult.data.length
        };
      } else {
        return {
          success: false,
          error: parseResult.error || '任务解析失败'
        };
      }
    } catch (error) {
      console.error('任务执行失败:', error);
      return {
        success: false,
        error: '任务执行失败: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }
}
