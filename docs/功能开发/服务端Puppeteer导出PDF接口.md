## 服务端 Puppeteer 导出 PDF 接口

### 目的

- 在服务端复用本机 Chrome 会话，稳定导出页面 PDF（避免未渲染/懒加载问题），并返回给调用方；后续可选发送至 Agent。

### 路由

- POST `/api/export/pdf`

请求体（JSON）：

```json
{
  "url": "https://example.com/doc",
  "pageRanges": "1-30",
  "sendToAgent": false
}
```

响应：

- `Content-Type: application/pdf` 的二进制流；当 `sendToAgent=true` 时返回 `{ ok: true, size }`（Agent 集成待后续任务）。

### 使用示例（curl）

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  --data '{"url":"https://example.com"}' \
  -o page.pdf \
  http://localhost:3000/api/export/pdf
```

### 会话与可执行路径（macOS / Windows）

- 优先尝试连接已开启远程调试的 Chrome：
  - `CHROME_REMOTE_DEBUGGING_URL` 或 `CHROME_REMOTE_DEBUGGING_PORT`
- 若无法连接则启动新实例：
  - `CHROME_EXECUTABLE_PATH`（可选）
  - `CHROME_USER_DATA_DIR`（可选）
  - `CHROME_PROFILE_NAME`（默认 `Default`）

默认 userDataDir：

- macOS: `~/Library/Application Support/Google/Chrome/<Profile>`
- Windows: `%LOCALAPPDATA%/Google/Chrome/User Data/<Profile>`

### 渲染稳定性策略

- 注入打印样式，隐藏导航/浮层/粘性元素，启用 `printBackground`。
- 自动滚动触发懒加载，等待字体与图片加载完成。

### 注意事项

- 若页面禁止打印，可在后续启用“滚动截图兜底”。
- Agent 发送通道单独集成（任务：`路由中可选发送 PDF 到 Agent`）。
