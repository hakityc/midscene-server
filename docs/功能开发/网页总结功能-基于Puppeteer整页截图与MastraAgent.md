## 网页总结功能（基于 Puppeteer 整页截图 + Mastra Agent）

### 背景与目标
- 通过服务端 Puppeteer 复用用户浏览器会话，稳定获取网页“所见即所得”的整页截图；
- 将截图发给 Mastra 的文档总结 Agent，输出结构化摘要；
- 同时保留 PDF 导出能力，便于文本型文档的高质量摘要。

### 变更概览
- 服务新增：
  - `apps/server/src/services/puppeteerPdfService.ts`
    - `exportPagePdf(options)`：预编排 + `printToPDF`
    - `exportPageScreenshot(options)`：整页截图，支持超长页分段拼接
  - `apps/server/src/services/summarizeService.ts`
    - `summarizeWebPage(params)`：整页截图 → DataURL → 调用 `documentSummaryAgent`
- Mastra Agent：
  - `apps/server/src/mastra/agents/modules/document-summary-agent.ts`
  - 在 `apps/server/src/mastra/index.ts` 注册为 `documentSummaryAgent`
- 路由：
  - `POST /api/export/pdf` 与 `POST /api/export/screenshot`
  - 文件：`apps/server/src/routes/modules/export.ts`
- WebSocket 动作：
  - 新增 `summerize`（整页截图总结）
  - 文件：`apps/server/src/websocket/actions/summerize.ts`
  - 枚举新增：`WebSocketAction.SUMMERIZE`

### 环境变量与会话复用（macOS / Windows）
- 优先连接已开启远程调试的 Chrome：
  - `CHROME_REMOTE_DEBUGGING_URL` 或 `CHROME_REMOTE_DEBUGGING_PORT`
- 否则启动新实例：
  - `CHROME_EXECUTABLE_PATH`（可选）
  - `CHROME_USER_DATA_DIR`（可选） + `CHROME_PROFILE_NAME`（默认 `Default`）
- 默认 userDataDir：
  - macOS: `~/Library/Application Support/Google/Chrome/<Profile>`
  - Windows: `%LOCALAPPDATA%/Google/Chrome/User Data/<Profile>`

### 预编排与稳定性策略（服务内部已处理）
- 注入打印样式/隐藏浮层与粘性元素；
- 自动滚动触发懒加载；
- 等待字体与图片加载；
- 截图可设 `deviceScaleFactor`，支持超长页分段拼接（sharp 合成）。

### HTTP 接口
1) `POST /api/export/pdf`
   - 请求示例：
   ```json
   { "url": "https://example.com", "pageRanges": "1-30" }
   ```
   - 响应：`application/pdf` 二进制流

2) `POST /api/export/screenshot`
   - 请求示例：
   ```json
   { "url": "https://example.com", "deviceScaleFactor": 2, "segmentHeight": 4000, "type": "png" }
   ```
   - 响应：`image/png` 或 `image/jpeg` 二进制流

### WebSocket 动作：summarize（网页总结）
- 动作名：`summarize`
- 入参（`payload.params`）：
  - `url`: string（必填）
  - `deviceScaleFactor?`: number（默认 2）
  - `segmentHeight?`: number（启用分段拼接时的每段高度）
  - `type?`: `png|jpeg`（默认 `png`）
  - `quality?`: number（仅 jpeg 生效）
- 返回：`{ summary: string, imageSize: number }`

### 关键文件参考
```1:20:apps/server/src/services/summarizeService.ts
import { mastra } from '../mastra';
import { exportPageScreenshot } from './puppeteerPdfService';

export async function summarizeWebPage(params) {
  const image = await exportPageScreenshot(params);
  const dataUrl = 'data:image/...;base64,' + Buffer.from(image).toString('base64');
  const agent = mastra.getAgent('documentSummaryAgent');
  const result = await agent.generate({ messages: [
    { role: 'user', content: '请对这张网页整页截图进行结构化总结。' },
    { role: 'user', content: dataUrl },
  ]});
  return { summary: result.text || result.output, imageSize: image.byteLength };
}
```

```1:24:apps/server/src/websocket/actions/summerize.ts
export function createSummerizeHandler() {
  return async ({ send }, message) => {
    const { url, deviceScaleFactor, segmentHeight, type, quality } = message.payload.params;
    const { summary, imageSize } = await summarizeWebPage({ url, deviceScaleFactor, segmentHeight, type, quality });
    send(createSuccessResponse(message, { summary, imageSize }, WebSocketAction.SUMMERIZE as any));
  };
}
```

### 使用示例
1) HTTP 截图导出
```bash
curl -X POST -H 'Content-Type: application/json' \
  --data '{"url":"https://example.com","segmentHeight":4000}' \
  -o screenshot.png \
  http://localhost:3000/api/export/screenshot
```

2) WebSocket 调用 summarize（示意）
```json
{
  "action": "summarize",
  "params": { "url": "https://example.com", "segmentHeight": 4000 }
}
```

### 注意事项
- 登录态依赖本机 Chrome 配置目录或远程调试连接；
- 超长页建议使用分段拼接，避免单图过大；
- 截图为位图，体积较大且需模型具备多模态能力；
- 对禁止截图/反自动化页面，需评估合规策略或回退方案。

### 后续计划
- 可选：将总结结果持久化到报告或关联到任务流水；
- 可选：支持截图直接发送到 Agent 存储（对象存储/CDN），减少消息体体积；
- 可选：PDF 与截图的自动选择策略（按页面特征或失败回退）。


