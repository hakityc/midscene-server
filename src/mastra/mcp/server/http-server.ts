import http from 'http';
import { mcpServer } from './index';

/**
 * HTTP 服务器集成示例
 * 展示如何将 MCP Server 集成到现有的 HTTP 服务器中
 */

const PORT = process.env.MCP_SERVER_PORT || 3001;

// 创建 HTTP 服务器
const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`);

  try {
    // SSE 端点
    if (url.pathname === '/sse') {
      console.log('📡 收到 SSE 连接请求');
      await mcpServer.startSSE({
        url: new URL(req.url || '', `http://localhost:${PORT}`),
        ssePath: '/sse',
        messagePath: '/message',
        req,
        res,
      });
    }
    // 消息端点
    else if (url.pathname === '/message') {
      console.log('📨 收到消息请求');
      // 消息处理由 startSSE 自动处理
      res.writeHead(404);
      res.end('Not Found');
    }
    // HTTP 端点
    else if (url.pathname === '/mcp') {
      console.log('🌐 收到 HTTP 请求');
      await mcpServer.startHTTP({
        url: new URL(req.url || '', `http://localhost:${PORT}`),
        httpPath: '/mcp',
        req,
        res,
      });
    }
    // 健康检查端点
    else if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        server: mcpServer.getServerInfo(),
        timestamp: new Date().toISOString(),
      }));
    }
    // 服务器信息端点
    else if (url.pathname === '/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mcpServer.getServerDetail(), null, 2));
    }
    // 工具列表端点
    else if (url.pathname === '/tools') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mcpServer.getToolListInfo(), null, 2));
    }
    // 404
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not Found',
        availableEndpoints: [
          '/sse - Server-Sent Events endpoint',
          '/message - Message endpoint for SSE',
          '/mcp - HTTP endpoint',
          '/health - Health check',
          '/info - Server information',
          '/tools - Available tools list',
        ],
      }));
    }
  } catch (error) {
    console.error('❌ 处理请求时出错:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
});

// 启动服务器
httpServer.listen(PORT, () => {
  console.log(`🚀 MCP Server HTTP 服务器已启动`);
  console.log(`📡 SSE 端点: http://localhost:${PORT}/sse`);
  console.log(`🌐 HTTP 端点: http://localhost:${PORT}/mcp`);
  console.log(`❤️  健康检查: http://localhost:${PORT}/health`);
  console.log(`ℹ️  服务器信息: http://localhost:${PORT}/info`);
  console.log(`🔧 工具列表: http://localhost:${PORT}/tools`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭 HTTP 服务器...');
  await mcpServer.close();
  httpServer.close(() => {
    console.log('✅ HTTP 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 正在关闭 HTTP 服务器...');
  await mcpServer.close();
  httpServer.close(() => {
    console.log('✅ HTTP 服务器已关闭');
    process.exit(0);
  });
});

export { httpServer };
