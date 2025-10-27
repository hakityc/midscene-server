# 如何测试 Windows Operate Service

## 快速开始 (任何环境)

```bash
# 运行模拟测试 - 不需要真实 Windows 设备
npm run test:windows:mock
```

## 完整测试 (需要 Windows 环境)

### 1. 在 Windows 上安装依赖

```bash
cd apps/server
npm install
```

### 2. 启动服务

```bash
npm run dev
```

### 3. 运行 Windows 客户端

在另一个终端:

```bash
node src/services/customMidsceneDevice/windows-client-example.js
```

### 4. 运行测试

```bash
# 快速功能测试
npm run test:windows:quick

# 完整功能测试 (包括 AI 任务)
npm run test:windows:full
```

## 可用的测试命令

| 命令 | 说明 | 环境要求 |
|------|------|----------|
| `npm run test:windows:mock` | 模拟测试 (推荐开发时使用) | 任意 |
| `npm run test:windows:quick` | 快速功能测试 | Windows/macOS + nut-js |
| `npm run test:windows:full` | 完整功能测试 | Windows/macOS + nut-js + 客户端连接 |

## 测试覆盖

✅ **已测试功能:**

- 服务生命周期管理 (启动、停止、重启)
- 单例模式
- 错误处理
- 连接管理
- 设备信息获取
- 截图功能
- AI 任务执行 (需要真实连接)
- 事件系统

## 测试结果

当前测试结果: ✅ **5/5 通过 (100%)**

详细测试报告请查看: [WINDOWS_SERVICE_TEST_SUMMARY.md](./WINDOWS_SERVICE_TEST_SUMMARY.md)

## 故障排除

### nut-js 环境配置

**依赖**: 项目已升级到 @nut-tree/nut-js，支持 Apple Silicon

**优势**:

- ✅ 支持 macOS M1/M2/M3
- ✅ 跨平台支持更好
- ✅ API 更现代

**快速测试**:

```bash
npm run test:windows:mock
```

### 找不到 Windows 客户端

**错误**: `没有可用的 Windows 客户端`

**解决方案**:

1. 确保服务已启动
2. 运行 Windows 客户端示例代码
3. 检查 WebSocket 连接

## 相关文档

- [测试总结](./WINDOWS_SERVICE_TEST_SUMMARY.md) - 详细测试结果
- [快速开始](./src/services/customMidsceneDevice/QUICKSTART.md) - 完整使用指南
- [WebSocket 集成](./src/services/customMidsceneDevice/WEBSOCKET_INTEGRATION.md) - WebSocket 协议说明
