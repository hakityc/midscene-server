# 腾讯云CLS日志配置说明

## 环境变量配置

在 `.env` 文件中添加以下配置来启用腾讯云CLS日志上报：

```bash
# 基础配置
NODE_ENV=development
LOG_LEVEL=debug
APP_ID=midscene-server

# 腾讯云CLS配置（可选）
# 如果配置了以下环境变量，将启用腾讯云CLS日志上报
CLS_ENDPOINT=https://ap-beijing.cls.tencentcloudapi.com
CLS_TOPIC_ID=your-topic-id-here
CLS_MAX_COUNT=100
CLS_MAX_SIZE=0.1
```

## 配置说明

- `CLS_ENDPOINT`: 腾讯云CLS服务端点
- `CLS_TOPIC_ID`: 日志主题ID
- `CLS_MAX_COUNT`: 单次上报日志数量（默认：100）
- `CLS_MAX_SIZE`: 触发上报的缓冲区大小，单位MB（默认：0.1）

## 使用方式

配置完成后，现有的logger会自动将日志上报到腾讯云CLS，无需修改现有代码。

```typescript
import { serverLogger } from './utils/logger.js';

// 这些日志会自动上报到腾讯云CLS
serverLogger.info('服务器启动成功');
serverLogger.error('发生错误', { error: 'test error' });
```
