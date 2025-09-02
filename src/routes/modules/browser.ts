import { Hono } from 'hono';
import { mastra } from '../../mastra';

// 提取 MCP 相关的错误详细信息
function extractMCPErrorDetails(error: unknown): any {
  if (!error) return null;

  const errorStr = error instanceof Error ? error.message : String(error);
  const errorObj = error instanceof Error ? error : null;

  // 尝试解析 MCP 错误信息
  const mcpErrorInfo: any = {
    originalMessage: errorStr,
    isTimeout: errorStr.includes('timeout') || errorStr.includes('Request timed out'),
    isMCPError: errorStr.includes('MCP error') || errorStr.includes('mcp'),
    errorCode: null,
    toolArgs: null,
    model: null
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

const browserRouter = new Hono().post('/demo', async (c) => {
  const logger = mastra.getLogger();
  const browserAgent = mastra.getAgent('browserAgent');

  // 从请求体中获取 prompt
  const body = await c.req.json();
  const prompt = body.prompt;

  if (!prompt) {
    return c.json({
      error: '缺少必要参数',
      message: '请提供 prompt 参数'
    }, 400);
  }

  logger.info('🚀 开始执行浏览器任务', { prompt });

  try {

    // 使用流式响应来实时显示大模型的输出
    const response = await browserAgent.streamVNext(prompt);

    let fullResponse = '';
    let chunkCount = 0;
    let hasError = false;
    let errorDetails: any = null;

    logger.info('🔄 开始流式响应处理');

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
      logger.error('❌ 流式响应处理过程中发生错误', {
        streamError: streamError instanceof Error ? streamError.message : String(streamError),
        mcpError: errorDetails
      });
    }

    logger.info('✅ 流式响应完成', {
      totalChunks: chunkCount,
      totalLength: fullResponse.length,
      hasError
    });

    return c.json({
      response: fullResponse,
      metadata: {
        chunkCount,
        totalLength: fullResponse.length,
        timestamp: new Date().toISOString(),
        hasError,
        errorDetails: hasError ? errorDetails : undefined
      }
    });

  } catch (error) {
    // 详细记录错误信息，包括 MCP 工具调用的详细信息
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      // 尝试提取 MCP 相关的错误信息
      mcpError: extractMCPErrorDetails(error),
      timestamp: new Date().toISOString()
    };

    logger.error('❌ 浏览器任务执行失败', errorDetails);

    return c.json({
      error: '任务执行失败',
      details: errorDetails
    }, 500);
  }
});

export { browserRouter };
