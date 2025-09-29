import { serve } from "@hono/node-server";
import "dotenv/config";
import { Hono } from "hono";
import { setupRouter } from "./routes/index.js";
import { setupError } from "./utils/error.js";
import { setupGlobalErrorHandlers } from "./utils/globalErrorHandler.js";
import { serverLogger } from "./utils/logger.js";
import { setupWebSocket } from "./websocket/index.js";
import { setupHealthRoutes } from './routes/health.js';
const initApp = () => {
    const app = new Hono();
    setupRouter(app);
    setupError(app);
    setupHealthRoutes(app); // 添加健康检查路由
    return app;
};
const startServer = async () => {
    // 设置全局错误处理
    setupGlobalErrorHandlers();
    const port = Number(process.env.PORT || "3000");
    // 预初始化 OperateService
    try {
        console.log("�� 预初始化 OperateService...");
        // TODO: 使用 MCP 就不需要这里初始化了
        // const operateService = OperateService.getInstance()
        // await operateService.start()
        console.log("✅ OperateService 预初始化完成");
    }
    catch (error) {
        console.error("❌ OperateService 预初始化失败:", error);
        // 不退出服务，让后续请求时重试
    }
    // 创建应用
    const app = initApp();
    // 设置 WebSocket
    const { injectWebSocket } = setupWebSocket(app);
    // 启动服务器
    const server = serve({
        fetch: app.fetch,
        port: port,
    });
    // 注入 WebSocket
    injectWebSocket(server);
    serverLogger.info({ port }, "服务启动成功");
};
startServer();
