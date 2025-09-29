import { PinoLogger } from '@mastra/loggers';

export const logger = new PinoLogger({
  name: 'Midscene-Server',
  level: 'info', // 设置为 info 级别，避免过多的 debug 信息
  formatters: {
    level: (label) => {
      return { level: label };
    },
    log: (object) => {
      const _timestamp = new Date().toISOString();
      const level = (object.level as string)?.toUpperCase() || 'INFO';
      const message = object.msg || '';

      // 过滤掉过于详细的 API 执行信息，但保留 MCP 相关的错误信息
      if (
        typeof message === 'string' &&
        (message.includes('Logger updated') ||
          message.includes('component=') ||
          message.includes('supportsStructuredOutputs') ||
          message.includes('~standard') ||
          message.includes('vendor') ||
          message.includes('zod'))
      ) {
        return object; // 跳过这些详细的技术信息
      }

      // 专门处理 MCP 相关的日志
      const isMCPLog =
        typeof message === 'string' &&
        (message.includes('MCP') ||
          message.includes('mcp') ||
          message.includes('🔧') ||
          message.includes('🚀') ||
          message.includes('✅') ||
          message.includes('❌') ||
          message.includes('⚠️'));

      // 根据日志级别设置颜色
      let color = '\x1b[37m'; // 默认白色
      switch (level) {
        case 'DEBUG':
          color = '\x1b[36m'; // 青色
          break;
        case 'INFO':
          color = '\x1b[32m'; // 绿色
          break;
        case 'WARN':
          color = '\x1b[33m'; // 黄色
          break;
        case 'ERROR':
          color = '\x1b[31m'; // 红色
          break;
      }

      const reset = '\x1b[0m';
      const bold = '\x1b[1m';

      // 简化时间戳格式
      const timeStr = new Date().toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // 格式化输出 - 只显示 MCP 相关的日志
      if (isMCPLog) {
        console.log(
          `${color}${bold}[${timeStr}] ${level}${reset} ${color}${message}${reset}`,
        );

        // 显示 MCP 相关的额外数据
        if (object && typeof object === 'object') {
          const { level: _, msg: __, time: ___, ...data } = object;

          // 对于 MCP 日志，显示详细信息
          if (Object.keys(data).length > 0) {
            console.log(`${color}📊 MCP 详细信息:${reset}`);
            console.log(JSON.stringify(data, null, 2));
          }
        }
      }

      return object;
    },
  },
});
