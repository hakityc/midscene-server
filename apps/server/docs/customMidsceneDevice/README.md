# Custom Midscene Device - Windows 实现

基于 Midscene.js 官方推荐的最佳实践，实现 Windows 桌面应用的 AI 自动化操作。

## 架构设计

```
┌─────────────────────────────────────┐
│   WindowsOperateService (服务层)    │  ← 单例服务，生命周期管理
│   - 重连机制                         │
│   - 任务执行                         │
│   - 状态管理                         │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   AgentOverWindows (Agent 层)       │  ← 继承 Agent 基类
│   - AI 任务编排                      │
│   - 任务生命周期                     │
│   - 报告生成                         │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   WindowsDevice (设备层)            │  ← 实现 AbstractInterface
│   - 截图                             │
│   - 输入操作                         │
│   - 动作空间定义                     │
└─────────────────────────────────────┘
```

## 核心文件说明

### 1. WindowsDevice.ts

**职责**: 设备接口层，实现 `AbstractInterface`

**功能**:

- 提供截图能力 (`screenshotBase64()`)
- 提供屏幕尺寸信息 (`size()`)
- 定义动作空间 (`actionSpace()`)
  - `tap`: 点击操作
  - `keyboardPress`: 键盘输入

**最佳实践**:

- ✅ 实现了 `AbstractInterface` 接口
- ✅ 提供了清晰的设备描述 (`describe()`)
- ✅ 支持调试模式
- ✅ 资源管理（`destroy()`）

**当前状态**: Mock 实现，返回模拟数据

### 2. AgentOverWindows.ts

**职责**: Agent 层，继承 `Agent` 基类

**功能**:

- 封装 WindowsDevice，提供统一的 AI 操作接口
- 实现特定于 Windows 的方法
- 管理 Agent 生命周期

**最佳实践**:

- ✅ 继承自 `Agent<WindowsDevice>`，复用核心能力
- ✅ 构造函数中创建 WindowsDevice 实例
- ✅ 实现了 `aiAction()` 等高级方法
- ✅ 完整的生命周期管理 (`destroy()`)

**参考**: 官方 `AgentOverChromeBridge` 实现

### 3. WindowsOperateService.ts

**职责**: 服务层，提供完整的业务逻辑

**功能**:

- 单例模式管理 Agent 实例
- 自动重连机制
- 任务执行与重试
- 状态监控

**最佳实践**:

- ✅ 单例模式，确保全局唯一
- ✅ 完整的生命周期管理（start/stop）
- ✅ 自动重连机制
- ✅ 统一的错误处理
- ✅ EventEmitter 事件通知
- ✅ 任务回调绑定 (`onTaskStartTip`)

**参考**: 项目中的 `WebOperateService` 实现

## 使用示例

### 基础使用

```typescript
import { WindowsOperateService } from './services/windowsOperateService'

// 获取服务实例
const service = WindowsOperateService.getInstance()

// 启动服务
await service.start()

// 执行 AI 任务
await service.execute('点击开始菜单')
await service.execute('打开记事本')
await service.execute('输入"Hello World"')

// 执行断言
await service.expect('记事本窗口已打开')

// 停止服务
await service.stop()
```

### 高级使用

```typescript
// 监听任务事件
service.on('taskStartTip', (tip: string) => {
  console.log('任务开始:', tip)
})

// 监听重连事件
service.on('reconnected', () => {
  console.log('服务已重新连接')
})

// 执行 YAML 脚本
const yamlScript = `
tasks:
  - name: 打开应用
    type: action
    prompt: 点击开始菜单
  - name: 验证
    type: assert
    prompt: 开始菜单已打开
`
await service.executeScript(yamlScript)

// 获取设备信息
const info = await service.getDeviceInfo()
console.log('屏幕尺寸:', info.width, 'x', info.height)

// 截图
const screenshot = await service.screenshot()
console.log('截图 Base64:', screenshot)
```

### 直接使用 Agent

```typescript
import AgentOverWindows from './customMidsceneDevice/agentOverWindows'
import WindowsDevice from './customMidsceneDevice/WindowsDevice'

// 创建设备
const device = new WindowsDevice({
  deviceName: 'My Windows',
  debug: true
})

// 创建 Agent
const agent = new AgentOverWindows({
  deviceOptions: { deviceName: 'My Windows', debug: true }
})

// 启动
await agent.setDestroyOptionsAfterConnect()

// 执行任务
await agent.aiAction('点击开始按钮')

// 断言
await agent.aiAssert('开始菜单已显示')

// 查询
const result = await agent.aiQuery('获取当前窗口标题')

// 销毁
await agent.destroy()
```

## 与 WebOperateService 的对比

| 特性 | WebOperateService | WindowsOperateService |
|------|-------------------|----------------------|
| 底层 Agent | AgentOverChromeBridge | AgentOverWindows |
| 底层设备 | Chrome Extension Bridge | WindowsDevice |
| 标签页管理 | ✅ getBrowserTabList | ❌ 不适用 |
| 连接检查 | showStatusMessage | 设备状态检查 |
| 重连机制 | ✅ | ✅ |
| 任务执行 | ✅ | ✅ |
| YAML 脚本 | ✅ | ✅ |
| 事件通知 | ✅ | ✅ |

## 下一步：真实实现

当前是 Mock 实现，真实实现需要：

### 1. WindowsDevice 真实化

```typescript
// 需要实现的功能
- 真实截图 API（如使用 screenshot-desktop）
- 真实输入模拟（如使用 robotjs）
- 窗口管理（如使用 node-window-manager）
```

### 2. 可选的增强功能

```typescript
// WindowsDevice 增强
- 多显示器支持
- 窗口枚举
- 进程管理
- 剪贴板操作

// AgentOverWindows 增强
- 应用列表获取
- 窗口切换
- 快捷键支持
```

### 3. 推荐的 npm 包

- **截图**: `screenshot-desktop` 或 `@daydreamsai/windows-screenshot`
- **输入模拟**: `robotjs` 或 `@nut-tree/nut-js`
- **窗口管理**: `node-window-manager`
- **系统信息**: `systeminformation`

## 最佳实践总结

1. **分层清晰**: Device → Agent → Service
2. **继承优先**: 继承 Agent 而非重新实现
3. **单例模式**: Service 层使用单例
4. **错误处理**: 统一的 AppError
5. **生命周期**: 完整的 start/stop/destroy
6. **重连机制**: 自动重连 + 手动重连
7. **事件驱动**: EventEmitter 通知外部
8. **类型安全**: 完整的 TypeScript 类型

## 参考资源

- [Midscene.js 官方文档](https://midscenejs.com)
- [Agent 基类源码](https://github.com/web-infra-dev/midscene/tree/main/packages/core/src/agent)
- [AgentOverChromeBridge 参考](https://github.com/web-infra-dev/midscene/tree/main/packages/web/src/bridge-mode)
