# Midscene 报告查看器功能

## 功能概述

在 Web 端的消息监控面板中，新增了**报告**按钮，点击后可以在浏览器新标签页中打开最新的 Midscene 执行报告。

## 功能说明

### 前端功能

在 `MessageMonitor` 组件中新增了**报告**按钮（原导出按钮仍保留）：

- **报告按钮**：点击后向后端请求最新的 report 文件，并在新标签页中打开
- **导出按钮**：导出当前的消息记录为 JSON 文件
- 按钮带有加载状态，避免重复点击
- 如果获取失败会显示友好的错误提示

### 后端 API

新增了 `/api/report` 路由，提供以下接口：

#### 1. 获取最新报告信息

```
GET /api/report/latest
```

返回最新的 report 文件信息：

```json
{
  "fileName": "windows-2025-10-15_12-02-25-e5ac46b9.html",
  "filePath": "/path/to/midscene_run/report/windows-2025-10-15_12-02-25-e5ac46b9.html",
  "timestamp": 1729000000000
}
```

#### 2. 获取指定报告文件内容

```
GET /api/report/file/:filename
```

直接返回 HTML 文件内容，可在浏览器中显示。

#### 3. 获取所有报告列表

```
GET /api/report/list
```

返回所有 report 文件列表：

```json
{
  "total": 10,
  "files": [
    {
      "name": "windows-2025-10-15_12-02-25-e5ac46b9.html",
      "path": "/path/to/file",
      "mtime": 1729000000000,
      "size": 12345
    }
  ]
}
```

## 技术实现

### 后端

1. **路由文件**：`apps/server/src/routes/modules/report.ts`
   - 读取 `midscene_run/report` 目录下的 HTML 文件
   - 按修改时间排序，返回最新的文件

2. **路由注册**：在 `apps/server/src/routes/index.ts` 中注册 `/api/report` 路由

### 前端

1. **API 工具**：`apps/web/src/utils/api.ts`
   - 封装了与后端 report API 通信的函数
   - 支持获取最新报告和构建访问 URL

2. **组件更新**：`apps/web/src/components/debug/MessageMonitor.tsx`
   - 新增 `openLatestReport` 函数处理报告打开逻辑
   - 使用 `window.open()` 在新标签页中打开报告
   - 添加加载状态和错误处理

## 使用场景

1. 执行 Windows AI 任务后，想快速查看执行报告
2. 调试时需要查看详细的执行步骤和截图
3. 团队协作时分享最新的执行结果

## 注意事项

- 确保后端服务正常运行
- 报告文件存储在 `midscene_run/report` 目录
- 如果没有生成过报告，点击按钮会显示错误提示
- API 默认地址为 `http://localhost:3000`，可通过环境变量 `VITE_API_BASE_URL` 配置
- 使用 Toast 通知替代了原生 alert，提供更好的用户体验

## 已解决的问题

### 1. 前端提示优化
- ✅ 替换了原生 `alert` 为自定义 Toast 组件
- ✅ 支持成功、错误、警告、信息四种类型的提示
- ✅ 自动消失和手动关闭功能
- ✅ 优雅的动画效果

### 2. 后端 API 验证
- ✅ 后端 API 工作正常，可以正确获取报告文件
- ✅ 支持获取最新报告、指定报告文件和报告列表
- ✅ 返回正确的文件路径和时间戳信息

### 3. CORS 跨域问题修复
- ✅ 添加了全局 CORS 配置，支持前端跨域请求
- ✅ 配置允许的源：`http://localhost:5173`, `http://localhost:3000`, `http://localhost:3001`
- ✅ 支持所有必要的 HTTP 方法和请求头
- ✅ 测试确认跨域请求正常工作

