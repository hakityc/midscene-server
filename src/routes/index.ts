import type { Context, Hono } from "hono"
import { requestLogger } from "../middleware/logger"
import { OperateService } from "../services/operateService"
import { setupHealthRoutes } from "./health"
import { operateRouter } from "./modules/operate"

const initAppRoute = (c: Context) => {
  const operateService = OperateService.getInstance()
  operateService.initialize()
  return c.json({
    message: "欢迎使用 MidScene Server API",
    version: "1.0.0",
    endpoints: {
      task: "/task",
      operate: "/operate",
      ws: "/ws",
    },
  })
}

export const setupRouter = (app: Hono) => {
  // 全局中间件
  app.use("/operate", requestLogger)

  app.route("/operate", operateRouter)

  // 设置健康检查路由
  setupHealthRoutes(app)

  // 根路径
  app.get("/", (c: Context) => {
    return initAppRoute(c)
  })
}
