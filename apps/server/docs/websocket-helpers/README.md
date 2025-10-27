# WebSocket 客户端命令辅助工具

## 概述

`clientCommandHelper.ts` 提供了两种方式来控制客户端行为：

1. **函数式 API** - 简洁，适合单一功能场景
2. **类 API** - 功能丰富，适合需要多种控制的场景

---

## 🎯 函数式 API - 遮罩控制

适用场景：只需要简单的遮罩显示/隐藏控制

### 使用方式

```typescript
import { createMaskController } from '@/websocket/helpers/clientCommandHelper'

// 创建遮罩控制器
const maskController = createMaskController(message, send, true)

// 方式1：手动控制
maskController.start()  // 显示遮罩
// ... 执行操作
maskController.stop()   // 隐藏遮罩

// 方式2：自动控制（推荐）
await maskController.withMask(async () => {
  // 你的异步操作
  // 遮罩会在操作前显示，操作后自动隐藏
  // 即使发生异常也会自动隐藏
  await someOperation()
})
```

### 参数说明

- `message`: WebSocket 入站消息
- `send`: 消息发送函数
- `enableMask`: 是否启用遮罩（默认 `true`），设为 `false` 时所有操作都不会执行

---

## 🚀 类 API - 完整功能控制

适用场景：需要多种客户端控制功能（遮罩、加载、提示、高亮等）

### 使用方式

```typescript
import { createClientCommandHelper } from '@/websocket/helpers/clientCommandHelper'
// 或者直接导入类
import { ClientCommandHelper } from '@/websocket/helpers/clientCommandHelper'

// 创建辅助实例
const helper = createClientCommandHelper(message, send)
// 或者
const helper = new ClientCommandHelper(message, send)
```

### 可用方法

#### 1. 遮罩控制

```typescript
// 显示全屏遮罩
helper.showFullMask()

// 隐藏全屏遮罩
helper.hideFullMask()

// 在遮罩保护下执行操作
await helper.executeWithMask(async () => {
  await someOperation()
}, { enabled: true })  // enabled 可选，默认 true
```

#### 2. 加载状态

```typescript
// 显示加载动画
helper.showLoading()
helper.showLoading('正在处理...')

// 隐藏加载动画
helper.hideLoading()
```

#### 3. 提示消息

```typescript
// 显示不同类型的提示
helper.showToast('操作成功', 'success')
helper.showToast('警告信息', 'warning')
helper.showToast('错误信息', 'error')
helper.showToast('提示信息', 'info')  // 默认类型
```

#### 4. 元素高亮

```typescript
// 高亮指定元素
helper.highlightElement('#my-button')

// 清除高亮
helper.clearHighlight()
```

---

## 📋 实际应用示例

### 示例 1：简单的遮罩控制

```typescript
// executeScript.ts
export function executeScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const maskController = createMaskController(message, send)

    try {
      await maskController.withMask(async () => {
        await operateService.executeScript(script)
      })

      const response = createSuccessResponse(message, '操作完成')
      send(response)
    } catch (error) {
      const response = createErrorResponse(message, error)
      send(response)
    }
  }
}
```

### 示例 2：复杂的客户端交互

```typescript
export function complexOperationHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const helper = createClientCommandHelper(message, send)

    try {
      // 显示加载状态
      helper.showLoading('正在准备...')
      await prepare()
      helper.hideLoading()

      // 高亮要操作的元素
      helper.highlightElement('#target-element')

      // 在遮罩保护下执行主要操作
      await helper.executeWithMask(async () => {
        await mainOperation()
      })

      // 清除高亮
      helper.clearHighlight()

      // 显示成功提示
      helper.showToast('操作成功！', 'success')

      const response = createSuccessResponse(message, '完成')
      send(response)
    } catch (error) {
      helper.hideLoading()
      helper.clearHighlight()
      helper.showToast('操作失败', 'error')

      const response = createErrorResponse(message, error)
      send(response)
    }
  }
}
```

### 示例 3：条件性遮罩

```typescript
export function conditionalMaskHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { enableMask } = message.payload

    // 根据参数决定是否启用遮罩
    const maskController = createMaskController(message, send, enableMask)

    await maskController.withMask(async () => {
      // 只有当 enableMask 为 true 时才会显示遮罩
      await operation()
    })
  }
}
```

---

## 🔧 扩展性设计

### 添加新的客户端命令

如需添加新的客户端控制功能，只需在 `ClientCommandHelper` 类中添加新方法：

```typescript
export class ClientCommandHelper {
  // ... 现有方法

  /**
   * 你的新功能
   */
  yourNewFeature(param: string): void {
    this.sendCommand('yourCommand', { param })
  }
}
```

### 创建专门的控制器

如果某个功能很常用，可以创建专门的函数式 API：

```typescript
export const createLoadingController = (
  message: WsInboundMessage<string>,
  send: (message: WsOutboundMessage<string>) => boolean,
) => {
  const show = (text?: string) => {
    const command = createCommandMessage(message, 'showLoading', text ? { text } : undefined)
    send(command)
  }

  const hide = () => {
    const command = createCommandMessage(message, 'hideLoading')
    send(command)
  }

  return { show, hide }
}
```

---

## 💡 最佳实践

1. **简单场景用函数式 API**：如果只需要遮罩控制，使用 `createMaskController`
2. **复杂场景用类 API**：如果需要多种控制功能，使用 `ClientCommandHelper`
3. **使用 withMask 方法**：优先使用 `withMask` 而不是手动 `start/stop`，它能自动处理异常情况
4. **清理资源**：在 catch 块中确保清理客户端状态（隐藏 loading、清除高亮等）
5. **条件性控制**：通过参数控制是否启用某些功能，提高灵活性

---

## 🏗️ 架构优势

- ✅ **职责分离**：客户端控制逻辑独立，易于维护
- ✅ **易于测试**：独立的函数和类便于单元测试
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **可扩展性**：类设计便于添加新功能
- ✅ **简洁性**：函数式 API 提供简洁的使用方式
- ✅ **灵活性**：支持两种使用方式，适应不同场景
