# Flow Action API 格式优化文档

## 概述

本次优化完善了 `flowActionToApiFormat` 函数，根据 Midscene 官方文档规范，为各种 AI 操作添加了完整的可选配置参数支持。

## 修改内容

### 1. 类型定义优化 (`apps/web/src/types/debug.ts`)

为所有 AI 操作的类型接口添加了可选参数：

#### 通用可选参数

对于以下操作类型，添加了这些可选参数：

- `aiTap`
- `aiInput`
- `aiHover`
- `aiScroll`
- `aiKeyboardPress`

**新增的可选参数：**

- `deepThink?: boolean` - 是否使用深度思考来精确定位元素，默认值为 `false`
- `xpath?: string` - 目标元素的 XPath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素
- `cacheable?: boolean` - 当启用缓存功能时，是否允许缓存当前 API 调用结果，默认值为 `true`

#### 特定操作参数

##### aiAssert

- `errorMessage?: string` - 断言失败时打印的错误信息
- `name?: string` - 给断言一个名称，会在 JSON 输出中作为 key 使用

##### aiScroll

- `xpath?: string` - 目标元素的 XPath 路径

### 2. 转换函数优化 (`apps/web/src/utils/messageBuilder.ts`)

#### 新增辅助函数

```typescript
function filterUndefined<T extends Record<string, unknown>>(obj: T): Partial<T>
```

此函数用于过滤对象中值为 `undefined` 的属性，确保只传递实际定义的参数到 API。

#### flowActionToApiFormat 函数优化

重构了 `flowActionToApiFormat` 函数，现在：

1. **直接使用 action 对象**：不再使用解构 `const { type, ...rest } = action`，而是直接访问 `action.type` 和相关属性，避免 TypeScript 类型推断问题

2. **完整的参数传递**：每个操作类型的 case 现在都会传递所有可选参数

3. **自动过滤 undefined**：使用 `filterUndefined` 函数自动过滤未定义的参数，避免在 API 请求中发送不必要的 `undefined` 值

## 各操作支持的参数

### aiTap

```typescript
{
  aiTap: string,           // 元素描述（必需）
  xpath?: string,          // XPath 路径
  deepThink?: boolean,     // 深度思考
  cacheable?: boolean      // 可缓存
}
```

### aiInput

```typescript
{
  aiInput: string,         // 输入内容（必需）
  locate: string,          // 元素定位（必需）
  xpath?: string,          // XPath 路径
  deepThink?: boolean,     // 深度思考
  cacheable?: boolean      // 可缓存
}
```

### aiHover

```typescript
{
  aiHover: string,         // 元素描述（必需）
  xpath?: string,          // XPath 路径
  deepThink?: boolean,     // 深度思考
  cacheable?: boolean      // 可缓存
}
```

### aiScroll

```typescript
{
  aiScroll: {
    direction: string,     // 滚动方向（必需）
    scrollType: string,    // 滚动类型（必需）
    distance?: number,     // 滚动距离
    locate?: string,       // 元素定位
    xpath?: string,        // XPath 路径
    deepThink?: boolean    // 深度思考
  },
  cacheable?: boolean      // 可缓存
}
```

### aiKeyboardPress

```typescript
{
  aiKeyboardPress: {
    key: string,           // 按键名称（必需）
    locate?: string,       // 元素定位
    deepThink?: boolean    // 深度思考
  },
  xpath?: string,          // XPath 路径
  cacheable?: boolean      // 可缓存
}
```

### aiAssert

```typescript
{
  aiAssert: string,        // 断言描述（必需）
  errorMessage?: string,   // 错误信息
  name?: string            // 断言名称
}
```

### aiWaitFor

```typescript
{
  aiWaitFor: {
    assertion: string,     // 等待条件（必需）
    timeoutMs?: number,    // 超时时间(ms)
    checkIntervalMs?: number  // 检查间隔(ms)
  }
}
```

### sleep

```typescript
{
  sleep: number            // 延迟时间(ms)（必需）
}
```

## 优化效果

1. **完整性**：现在支持官方文档中定义的所有可选参数
2. **类型安全**：TypeScript 类型定义完整，避免类型错误
3. **灵活性**：用户可以根据需要选择使用深度思考、XPath 路径、缓存等特性
4. **代码质量**：通过 `filterUndefined` 函数确保 API 请求的数据结构简洁

## 兼容性

本次优化向后兼容，所有新增参数都是可选的，不会影响现有代码的使用。

## 参考文档

- Midscene 官方文档 - YAML 模式配置参考
