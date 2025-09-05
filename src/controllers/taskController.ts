import { mastra } from '../mastra';

export class TaskController {
  private logger = mastra.getLogger();
  private taskAgent = mastra.getAgent('taskAgent');

  async plan(prompt: string) {
    try {
      const response = await this.taskAgent.streamVNext(prompt);

      // 从流式响应中提取文本内容
      let fullResponse = '';
      for await (const chunk of response.textStream) {
        fullResponse += chunk;
      }

      console.log('原始响应:', fullResponse);

      // 尝试解析JSON数组
      try {
        const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('解析后的JSON:', parsed);
          return {
            success: true,
            data: parsed,
            rawResponse: fullResponse
          };
        } else {
          return {
            success: false,
            error: '未找到有效的JSON数组格式',
            rawResponse: fullResponse
          };
        }
      } catch (parseError) {
        return {
          success: false,
          error: 'JSON解析失败: ' + (parseError instanceof Error ? parseError.message : String(parseError)),
          rawResponse: fullResponse
        };
      }
    } catch (error) {
      console.error('任务规划失败:', error);
      return {
        success: false,
        error: '任务规划失败: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }
}