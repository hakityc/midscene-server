# OperateService 单例模式使用说明

## 🎯 概述

`OperateService` 现在采用单例模式，确保全局只有一个 `AgentOverChromeBridge` 实例，避免端口冲突问题。

## 🔧 主要特性

### 1. 单例模式
- 全局只能有一个 `OperateService` 实例
- 避免多个 `AgentOverChromeBridge` 同时运行导致的端口冲突
- 自动管理实例生命周期

### 2. 初始化管理
- 提供 `initialize()` 方法确保连接只初始化一次
- 自动检测是否已初始化，避免重复初始化
- 提供 `isReady()` 方法检查服务状态

### 3. 错误处理
- 改进的错误处理和日志记录
- 在未初始化时调用方法会抛出明确错误
- 提供 `resetInstance()` 方法用于测试或强制重新初始化

## 📝 使用方法

### 基本使用

```typescript
import { OperateService } from './services/operateService';

// 获取单例实例
const operateService = OperateService.getInstance();

// 初始化连接（只需要调用一次）
await operateService.initialize({ forceSameTabNavigation: true });

// 执行操作
await operateService.execute('点击登录按钮');
await operateService.expect('页面显示欢迎信息');

// 检查服务状态
if (operateService.isReady()) {
  console.log('服务已就绪');
}
```

### 在 Controller 中使用

```typescript
import { OperateController } from './controllers/operateController';

export class MyController {
  private operateController: OperateController;

  constructor() {
    // 自动获取单例实例
    this.operateController = new OperateController();
  }

  async doSomething() {
    // 确保服务已初始化
    if (!this.operateController.isReady()) {
      await this.operateController.initialize();
    }

    // 执行操作
    await this.operateController.execute('执行某个操作');
  }
}
```

### 在 WebSocket 中使用

```typescript
// WebSocket 消息处理
case 'connectTab':
  const operateController = new OperateController();
  
  // 初始化连接
  operateController.initialize({
    forceSameTabNavigation: true,
  }).then(() => {
    // 连接成功
    sendMessage(ws, { /* 成功消息 */ });
  }).catch((error) => {
    // 连接失败
    sendMessage(ws, { /* 错误消息 */ });
  });
  break;
```

## 🛠️ API 参考

### OperateService 方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getInstance()` | 获取单例实例 | 无 | `OperateService` |
| `initialize(option)` | 初始化连接 | `{ forceSameTabNavigation: boolean }` | `Promise<void>` |
| `connectCurrentTab(option)` | 连接当前标签页 | `{ forceSameTabNavigation: boolean }` | `Promise<void>` |
| `execute(prompt)` | 执行命令 | `string` | `Promise<void>` |
| `expect(prompt)` | 执行断言 | `string` | `Promise<void>` |
| `destroy()` | 销毁实例 | 无 | `Promise<void>` |
| `isReady()` | 检查是否已初始化 | 无 | `boolean` |
| `resetInstance()` | 重置单例实例 | 无 | `void` |

### OperateController 方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `initialize(option)` | 初始化连接 | `{ forceSameTabNavigation: boolean }` | `Promise<void>` |
| `connectCurrentTab(option)` | 连接当前标签页 | `{ forceSameTabNavigation: boolean }` | `Promise<void>` |
| `execute(prompt)` | 执行命令 | `string` | `Promise<void>` |
| `expect(prompt)` | 执行断言 | `string` | `Promise<void>` |
| `executeTasks(tasks)` | 执行任务列表 | `Array<{action: string, verify: string}>` | `Promise<void>` |
| `destroy()` | 销毁实例 | 无 | `Promise<void>` |
| `isReady()` | 检查是否已初始化 | 无 | `boolean` |

## ⚠️ 注意事项

1. **初始化顺序**: 在使用任何操作方法之前，必须先调用 `initialize()` 方法
2. **错误处理**: 如果服务未初始化就调用操作方法，会抛出错误
3. **资源管理**: 使用 `destroy()` 方法正确清理资源
4. **测试**: 在测试中可以使用 `resetInstance()` 重置单例实例

## 🔍 故障排除

### 端口冲突问题
如果仍然遇到端口冲突，可以：
1. 检查是否有其他 midscene 进程在运行：`ps aux | grep midscene`
2. 终止所有相关进程：`pkill -f midscene`
3. 重置单例实例：`OperateService.resetInstance()`

### 初始化失败
如果初始化失败：
1. 检查浏览器是否已打开
2. 检查网络连接
3. 查看详细错误日志

## 🎉 优势

- ✅ 避免端口冲突
- ✅ 资源使用更高效
- ✅ 状态管理更清晰
- ✅ 错误处理更完善
- ✅ 代码更易维护
