import { MCPClient } from "@mastra/mcp"
import "dotenv/config"

// 创建 MCP 客户端并添加日志记录
export const mcpClient = new MCPClient({
  servers: {
    "mcp-midscene": {
      command: "npx",
      args: ["-y", "@midscene/mcp"],
      env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
        MIDSCENE_MODEL_NAME: process.env.MIDSCENE_MODEL_NAME || "",
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "",
        // MIDSCENE_USE_QWEN_VL: process.env.MIDSCENE_USE_QWEN_VL || '',
        MIDSCENE_USE_VLM_UI_TARS: process.env.MIDSCENE_USE_VLM_UI_TARS || "",
        MIDSCENE_CACHE: process.env.MIDSCENE_CACHE || "",
        DEBUG: "midscene:ai:call",
        MCP_SERVER_REQUEST_TIMEOUT: "800000",
      },
    },
    // "taskmaster-ai": {
    //     "command": "npx",
    //     "args": ["-y", "--package=task-master-ai", "task-master-ai"],
    //     "env": {
    //       "OPENAI_API_KEY": process.env.TASK_OPENAI_BASE_URL || '',
    //       "MODEL": process.env.TASK_MIDSCENE_MODEL_NAME || '',
    //       "MAX_TOKENS": "64000",
    //     }
    //   }
  },
})

// // 添加 MCP 工具调用的日志记录
// const originalGetTools = mcpClient.getTools.bind(mcpClient);
// mcpClient.getTools = async function() {
//   try {
//     logger.info('🔧 正在获取 MCP 工具列表...');
//     const tools = await originalGetTools();

//     if (tools && Object.keys(tools).length > 0) {
//       logger.info('✅ MCP 工具获取成功', {
//         toolCount: Object.keys(tools).length,
//         toolNames: Object.keys(tools)
//       });
//     } else {
//       logger.warn('⚠️ MCP 工具列表为空');
//     }

//     return tools;
//   } catch (error) {
//     logger.error('❌ MCP 工具获取失败', {
//       error: error instanceof Error ? error.message : String(error)
//     });
//     throw error;
//   }
// };

// 注意：MCPClient 可能没有直接的 callTool 方法
// 工具调用通常通过 Agent 的 streamVNext 方法进行
// 这里我们主要记录工具获取和初始化的日志
