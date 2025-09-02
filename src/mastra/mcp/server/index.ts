import { MCPServer } from '@mastra/mcp';
import { browserAgent } from '../../agents/browser-agent';
import { browserTool } from '../../tools/browser-tool';

// 创建 MCP Server 实例
export const mcpServer = new MCPServer({
  name: 'Midscene Browser MCP Server',
  version: '1.0.0',
  description: '提供浏览器自动化功能的 MCP 服务器，支持页面操作和截图等功能',
  
  // 暴露工具
  tools: {
    browserTool, // 你的浏览器工具
  },
  
  // 暴露代理（可选）- 暂时注释掉，等类型问题解决
  // agents: {
  //   browserAgent, // 你的浏览器代理
  // },
  
  // 可选：仓库信息
  repository: {
    url: 'https://github.com/your-org/midscene-server',
    source: 'github',
    id: 'midscene-server',
  },
  
  // 可选：发布信息
  releaseDate: new Date().toISOString(),
  isLatest: true,
  
  // 可选：包信息
  packageCanonical: 'npm',
  packages: [
    {
      name: '@midscene/mcp-server',
      version: '1.0.0',
      registry_name: 'npm',
    },
  ],
});
