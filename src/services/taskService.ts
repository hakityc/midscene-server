import { mastra } from '../mastra';
import { OperateService } from './operateService';

export class TaskService {
  private taskAgent = mastra.getAgent('taskAgent');
  private operateService: OperateService;

  constructor() {
    this.operateService = OperateService.getInstance();
  }

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
            rawResponse: textResponse,
          };
        }

        // 验证数组中的每个元素是否包含必要的字段
        const isValid = parsed.every(
          (step) =>
            typeof step === 'object' &&
            step !== null &&
            'action' in step &&
            'verify' in step &&
            typeof step.action === 'string' &&
            typeof step.verify === 'string',
        );

        if (!isValid) {
          return {
            success: false,
            error: '解析结果格式不正确，每个步骤必须包含action和verify字段',
            rawResponse: textResponse,
          };
        }

        console.log('解析后的JSON:', parsed);
        return {
          success: true,
          data: parsed,
          rawResponse: textResponse,
        };
      } else {
        return {
          success: false,
          error: '未找到有效的JSON数组格式',
          rawResponse: textResponse,
        };
      }
    } catch (parseError) {
      return {
        success: false,
        error: `JSON解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        rawResponse: textResponse,
      };
    }
  }

  /**
   * 规划任务步骤
   * @param prompt 用户提示词
   * @returns 任务规划结果
   */
  async plan(prompt: string) {
    try {
      const response = await this.taskAgent.streamVNext(prompt);
      const fullResponse = await this.extractTextFromStream(response);
      return this.parseTaskSteps(fullResponse);
    } catch (error) {
      console.error('任务规划失败:', error);
      return {
        success: false,
        error: `任务规划失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 执行任务
   * @param prompt 用户提示词
   * @returns 任务执行结果
   */
  async execute(prompt: string) {
    try {
      // 解析任务步骤
      const response = await this.taskAgent.streamVNext(prompt);
      const fullResponse = await this.extractTextFromStream(response);
      const parseResult = this.parseTaskSteps(fullResponse);

      if (!parseResult.success || !parseResult.data) {
        return {
          success: false,
          error: parseResult.error || '任务解析失败',
        };
      }

      // 初始化浏览器连接（使用单例模式）
      try {
        if (!this.operateService.isReady()) {
          console.log('🔄 初始化浏览器连接...');
          await this.operateService.start({
            forceSameTabNavigation: true,
          });
        } else {
          console.log('✅ 浏览器连接已就绪');
        }
      } catch (connectError) {
        console.warn('⚠️ 浏览器连接失败，但继续执行任务:', connectError);
        throw new Error(
          connectError instanceof Error
            ? connectError.message
            : String(connectError),
        );
      }

      // 执行任务步骤
      const executedSteps: { action: string; verify: string; error: string }[] =
        [];
      const failedSteps: { action: string; verify: string; error: string }[] =
        [];

      for (let i = 0; i < parseResult.data.length; i++) {
        const step = parseResult.data[i];
        console.log(
          `🔄 执行步骤 ${i + 1}/${parseResult.data.length}: ${step.action}`,
        );

        try {
          if (this.operateService) {
            await this.operateService.execute(step.action);
            console.log(`✅ 步骤 ${i + 1} 执行成功`);

            // 验证步骤
            try {
              await this.operateService.expect(step.verify);
              console.log(`✅ 步骤 ${i + 1} 验证成功`);
              executedSteps.push({ ...step, error: '' });
            } catch (verifyError) {
              console.warn(`⚠️ 步骤 ${i + 1} 验证失败:`, verifyError);
              executedSteps.push({
                ...step,
                error:
                  verifyError instanceof Error
                    ? verifyError.message
                    : String(verifyError),
              });
            }
          } else {
            console.log(`⏭️ 跳过步骤 ${i + 1} (无浏览器连接): ${step.action}`);
            executedSteps.push({ ...step, error: '无浏览器连接' });
          }
        } catch (stepError) {
          console.error(`❌ 步骤 ${i + 1} 执行失败:`, stepError);
          const errorMessage =
            stepError instanceof Error ? stepError.message : String(stepError);
          failedSteps.push({ ...step, error: errorMessage });
          throw new Error(errorMessage);
        }
      }

      return {
        success: true,
        message: `任务执行完成，成功 ${executedSteps.length} 步，失败 ${failedSteps.length} 步`,
        executedSteps: executedSteps.length,
        failedSteps: failedSteps.length,
        details: {
          executed: executedSteps,
          failed: failedSteps,
        },
      };
    } catch (error) {
      console.error('❌ 任务执行失败:', error);
      return {
        success: false,
        error: `任务执行失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
