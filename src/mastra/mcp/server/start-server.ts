#!/usr/bin/env tsx

import { mcpServer } from './index';

/**
 * 启动 MCP Server
 * 支持两种传输方式：
 * 1. stdio - 用于命令行工具
 * 2. SSE - 用于 HTTP 服务器集成
 */

async function startServer() {
  const transport = process.argv[2] || 'stdio';
  
  try {
    switch (transport) {
      case 'stdio':
        console.log('🚀 启动 MCP Server (stdio 传输)...');
        await mcpServer.startStdio();
        break;
        
      case 'sse':
        console.log('🚀 启动 MCP Server (SSE 传输)...');
        // 这里需要集成到你的 HTTP 服务器中
        console.log('请使用 startSSE() 方法集成到你的 HTTP 服务器');
        break;
        
      case 'http':
        console.log('🚀 启动 MCP Server (HTTP 传输)...');
        // 这里需要集成到你的 HTTP 服务器中
        console.log('请使用 startHTTP() 方法集成到你的 HTTP 服务器');
        break;
        
      default:
        console.error('❌ 不支持的传输方式:', transport);
        console.log('支持的传输方式: stdio, sse, http');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 启动 MCP Server 失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭 MCP Server...');
  await mcpServer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 正在关闭 MCP Server...');
  await mcpServer.close();
  process.exit(0);
});

// 启动服务器
startServer().catch((error) => {
  console.error('❌ 启动失败:', error);
  process.exit(1);
});
