import { mastra } from '../mastra';

// 解析 AI 输出的 JSON 内容
function parseAIResponse(response: string): {
  parsed: any | null;
  error: string | null;
} {
  if (!response.trim()) {
    return { parsed: null, error: '响应内容为空' };
  }

  try {
    // 方法1: 尝试直接解析整个响应
    const directParse = JSON.parse(response.trim());
    if (typeof directParse === 'object' && directParse !== null) {
      return { parsed: directParse, error: null };
    }
  } catch {
    // 直接解析失败，继续尝试其他方法
  }

  try {
    // 方法2: 查找 JSON 代码块
    const jsonBlockMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonBlockMatch) {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      return { parsed, error: null };
    }
  } catch {
    // JSON 代码块解析失败
  }

  try {
    // 方法3: 查找任何 JSON 对象
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { parsed, error: null };
    }
  } catch {
    // JSON 对象解析失败
  }

  return { parsed: null, error: '未找到有效的 JSON 格式内容' };
}

// 验证解析后的 JSON 是否符合预期格式
function validateAIResponse(parsed: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!parsed || typeof parsed !== 'object') {
    errors.push('响应不是有效的对象');
    return { valid: false, errors };
  }

  // 检查必要字段
  if (!parsed.analysis) {
    errors.push('缺少 analysis 字段');
  } else if (typeof parsed.analysis !== 'object') {
    errors.push('analysis 字段不是对象类型');
  }

  if (!parsed.actions) {
    errors.push('缺少 actions 字段');
  } else if (!Array.isArray(parsed.actions)) {
    errors.push('actions 字段不是数组类型');
  }

  // 检查 actions 数组中的每个元素
  if (Array.isArray(parsed.actions)) {
    parsed.actions.forEach((action: any, index: number) => {
      if (!action.type) {
        errors.push(`actions[${index}] 缺少 type 字段`);
      }
      if (!action.params) {
        errors.push(`actions[${index}] 缺少 params 字段`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

// 提取 MCP 相关的错误详细信息
function extractMCPErrorDetails(error: unknown): any {
  if (!error) return null;

  const errorStr = error instanceof Error ? error.message : String(error);
  const errorObj = error instanceof Error ? error : null;

  // 尝试解析 MCP 错误信息
  const mcpErrorInfo: any = {
    originalMessage: errorStr,
    isTimeout:
      errorStr.includes('timeout') || errorStr.includes('Request timed out'),
    isMCPError: errorStr.includes('MCP error') || errorStr.includes('mcp'),
    errorCode: null,
    toolArgs: null,
    model: null,
  };

  // 尝试从错误消息中提取 JSON 信息
  try {
    // 查找 JSON 格式的错误信息
    const jsonMatch = errorStr.match(/\{.*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      mcpErrorInfo.parsedError = parsed;

      // 提取特定字段
      if (parsed.details) {
        mcpErrorInfo.errorCode = parsed.details.code || parsed.code;
        mcpErrorInfo.toolArgs = parsed.details.details?.argsJson;
        mcpErrorInfo.model = parsed.details.details?.model;
      }
    }
  } catch (parseError) {
    // JSON 解析失败，忽略
  }

  // 尝试从错误对象的属性中提取信息
  if (errorObj && typeof errorObj === 'object') {
    const errorAny = errorObj as any;
    if (errorAny.code) mcpErrorInfo.errorCode = errorAny.code;
    if (errorAny.args) mcpErrorInfo.toolArgs = errorAny.args;
    if (errorAny.model) mcpErrorInfo.model = errorAny.model;
  }

  return mcpErrorInfo;
}

// 浏览器任务执行结果接口
export interface BrowserTaskResult {
  success: boolean;
  data?: any;
  error?: string;
  details?: any;
  metadata: {
    chunkCount: number;
    totalLength: number;
    timestamp: string;
    hasError: boolean;
    parseError?: boolean;
  };
}

// 浏览器控制器类
export class BrowserController {
  private logger = mastra.getLogger();
  private browserAgent = mastra.getAgent('browserAgent');

  /**
   * 执行浏览器任务
   * @param prompt 用户输入的提示词
   * @returns 任务执行结果
   */
  async executeBrowserTask(prompt: string): Promise<BrowserTaskResult> {
    this.logger.info('🚀 开始执行浏览器任务', { prompt });

    try {
      // 记录 MCP 工具调用开始
      this.logger.info('🚀 开始执行浏览器任务，准备调用 MCP 工具', {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        promptLength: prompt.length,
      });

      // 使用流式响应来实时显示大模型的输出
      const response = await this.browserAgent.streamVNext(prompt, {
        onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
          console.log({ text, toolCalls, toolResults, finishReason, usage });
        },
      });

      let fullResponse = '';
      let chunkCount = 0;
      let hasError = false;
      let errorDetails: any = null;

      this.logger.info('🔄 开始流式响应处理');

      try {
        for await (const chunk of response.textStream) {
          chunkCount++;
          fullResponse += chunk;

          // 实时输出到控制台
          process.stdout.write(chunk);
        }
      } catch (streamError) {
        hasError = true;
        errorDetails = extractMCPErrorDetails(streamError);
        this.logger.error('❌ 流式响应处理过程中发生错误', {
          streamError:
            streamError instanceof Error
              ? streamError.message
              : String(streamError),
          mcpError: errorDetails,
        });
      }

      // 若出现 MCP 超时类错误，进行一次性带指引的重试
      if (hasError && errorDetails?.isTimeout) {
        this.logger.warn('⏳ 检测到 MCP 请求超时，准备进行一次性带指引的重试');

        const retryHint = `请先导航到百度首页并等待搜索框出现，使用稳定选择器 input#kw 或 input[name=wd] 定位，再输入搜索词并执行搜索。若遇到广告结果，请优先选择"官网/Official Site"。`;
        const retryPrompt = `${retryHint}\n\n原始指令：${prompt}\n\n【请严格按步骤执行：】\n1) 打开 https://www.baidu.com\n2) 等待搜索框出现（input#kw 或 input[name=wd]）\n3) 输入搜索词并提交\n4) 识别官网链接并打开`;

        try {
          const retryResponse = await this.browserAgent.streamVNext(retryPrompt);
          for await (const chunk of retryResponse.textStream) {
            chunkCount++;
            fullResponse += chunk;
            process.stdout.write(chunk);
          }
          // 重试成功后清除错误标记
          hasError = false;
          errorDetails = null;
          this.logger.info('✅ 重试成功，已补全流式输出');
        } catch (retryErr) {
          const retryErrDetails = extractMCPErrorDetails(retryErr);
          this.logger.error('❌ 重试仍然失败', {
            retryError:
              retryErr instanceof Error ? retryErr.message : String(retryErr),
            mcpError: retryErrDetails,
          });
          // 保留首次错误标记与详情
        }
      }

      this.logger.info('✅ 流式响应完成', {
        totalChunks: chunkCount,
        totalLength: fullResponse.length,
        hasError,
      });

      // 解析 AI 输出的 JSON 格式
      let parsedResponse = null;
      let parseError = null;
      let validationErrors: string[] = [];

      if (!hasError && fullResponse.trim()) {
        const parseResult = parseAIResponse(fullResponse);

        if (parseResult.parsed) {
          // 验证解析后的 JSON 格式
          const validation = validateAIResponse(parseResult.parsed);

          if (validation.valid) {
            parsedResponse = parseResult.parsed;
            this.logger.info('✅ 成功解析并验证 AI 输出的 JSON 格式', {
              hasAnalysis: !!parsedResponse.analysis,
              hasActions: !!parsedResponse.actions,
              actionsCount: parsedResponse.actions?.length || 0,
              hasReasoning: !!parsedResponse.reasoning,
              hasFallback: !!parsedResponse.fallback,
            });
          } else {
            parseError = `JSON 格式验证失败: ${validation.errors.join(', ')}`;
            validationErrors = validation.errors;
            this.logger.warn('⚠️ AI 输出的 JSON 格式验证失败', {
              errors: validation.errors,
              responsePreview: fullResponse.substring(0, 200),
            });
          }
        } else {
          parseError = parseResult.error || '未知的解析错误';
          this.logger.warn('⚠️ AI 输出解析失败', {
            error: parseError,
            responsePreview: fullResponse.substring(0, 200),
          });
        }
      }

      // 记录 MCP 任务执行结果
      if (!hasError) {
        this.logger.info('✅ MCP 浏览器任务执行成功', {
          responseLength: fullResponse.length,
          chunkCount: chunkCount,
          responsePreview:
            fullResponse.substring(0, 200) +
            (fullResponse.length > 200 ? '...' : ''),
          jsonParsed: !!parsedResponse,
          parseError: parseError,
        });
      } else {
        this.logger.error('❌ MCP 浏览器任务执行失败', {
          errorDetails: errorDetails,
          partialResponse:
            fullResponse.substring(0, 200) +
            (fullResponse.length > 200 ? '...' : ''),
        });
      }

      // 返回结构化的响应
      if (hasError) {
        return {
          success: false,
          error: '任务执行失败',
          details: errorDetails,
          metadata: {
            chunkCount,
            totalLength: fullResponse.length,
            timestamp: new Date().toISOString(),
            hasError: true,
          },
        };
      }

      if (parseError) {
        return {
          success: false,
          error: 'AI 输出格式解析失败',
          details: parseError,
          data: {
            validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
            rawResponse: fullResponse,
          },
          metadata: {
            chunkCount,
            totalLength: fullResponse.length,
            timestamp: new Date().toISOString(),
            hasError: false,
            parseError: true,
          },
        };
      }

      // 成功解析，返回结构化的 JSON 响应
      return {
        success: true,
        data: parsedResponse,
        metadata: {
          chunkCount,
          totalLength: fullResponse.length,
          timestamp: new Date().toISOString(),
          hasError: false,
          parseError: false,
        },
      };
    } catch (error) {
      // 详细记录错误信息，包括 MCP 工具调用的详细信息
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        // 尝试提取 MCP 相关的错误信息
        mcpError: extractMCPErrorDetails(error),
        timestamp: new Date().toISOString(),
      };

      this.logger.error('❌ 浏览器任务执行失败', errorDetails);

      return {
        success: false,
        error: '任务执行失败',
        details: errorDetails,
        metadata: {
          chunkCount: 0,
          totalLength: 0,
          timestamp: new Date().toISOString(),
          hasError: true,
        },
      };
    }
  }
}

// 导出控制器实例
export const browserController = new BrowserController();
