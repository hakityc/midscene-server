import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { browserAgent } from "./agents/browser-agent";

// TODO：
// 高优先级:
// 存储配置 (必需)
// 环境变量管理 (必需)
// 中优先级:
// 内存管理 (推荐)
// 错误处理增强 (推荐)
export const mastra = new Mastra({
  agents: { browserAgent },
  logger: new PinoLogger({
    name: 'Midscene-Server',
    level: 'info', // 设置为 info 级别，避免过多的 debug 信息
    formatters: {
      level: (label) => {
        return { level: label };
      },
      log: (object) => {
        const timestamp = new Date().toISOString();
        const level = (object.level as string)?.toUpperCase() || 'INFO';
        const message = object.msg || '';

        // 过滤掉过于详细的 API 执行信息，但保留 MCP 相关的错误信息
        if (typeof message === 'string' && (
            message.includes('Logger updated') ||
            message.includes('component=') ||
            message.includes('supportsStructuredOutputs') ||
            message.includes('~standard') ||
            message.includes('vendor') ||
            message.includes('zod'))) {
          return object; // 跳过这些详细的技术信息
        }

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
          second: '2-digit'
        });

        // 格式化输出
        console.log(
          `${color}${bold}[${timeStr}] ${level}${reset} ${color}${message}${reset}`
        );

        // 显示重要的额外数据，特别关注 MCP 工具执行相关的信息
        if (object && typeof object === 'object') {
          const { level: _, msg: __, time: ___, ...data } = object;
          
          // 对于错误日志，显示更详细的信息
          if (level === 'ERROR') {
            console.log(`${color}🔍 详细错误信息:${reset}`);
            console.log(JSON.stringify(data, null, 2));
          } else {
            // 过滤掉技术性的字段，但保留 MCP 相关的重要信息
            const filteredData = Object.fromEntries(
              Object.entries(data).filter(([key, value]) => {
                // 保留 MCP 相关的字段
                if (key.includes('mcp') || key.includes('MCP') || 
                    key.includes('tool') || key.includes('Tool') ||
                    key.includes('error') || key.includes('Error') ||
                    key.includes('args') || key.includes('Args') ||
                    key.includes('timeout') || key.includes('Timeout')) {
                  return true;
                }
                
                // 过滤掉技术性的字段
                return !key.includes('~standard') &&
                       !key.includes('vendor') &&
                       !key.includes('zod') &&
                       !key.includes('supportsStructuredOutputs') &&
                       typeof value !== 'object' ||
                       (typeof value === 'object' && value !== null && Object.keys(value).length < 5);
              })
            );

            if (Object.keys(filteredData).length > 0) {
              console.log(`${color}📊 ${reset}`, JSON.stringify(filteredData, null, 2));
            }
          }
        }

        return object;
      },
    },
  }),
});