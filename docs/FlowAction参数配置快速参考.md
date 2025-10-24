# FlowAction 参数配置快速参考

## 📋 主要 Actions API 签名

### 基础操作

#### aiTap
```typescript
// 官方 API
aiTap(locate: string, options?: { deepThink?, xpath?, cacheable? })

// 配置参数
- locate: string (必填) - 元素定位
- deepThink: boolean (可选) - 深度思考
- xpath: string (可选, 仅 Web) - XPath 表达式
- cacheable: boolean (可选) - 可缓存
```

#### aiInput
```typescript
// 官方 API
aiInput(text: string, locate: string, options?: { deepThink?, xpath?, cacheable? })

// 配置参数
- text: string (必填) - 输入内容
- locate: string (必填) - 元素定位
- deepThink: boolean (可选) - 深度思考
- xpath: string (可选, 仅 Web) - XPath 表达式
- cacheable: boolean (可选) - 可缓存
```

#### aiHover
```typescript
// 官方 API
aiHover(locate: string, options?: { deepThink?, xpath?, cacheable? })

// 配置参数
- locate: string (必填) - 元素定位
- deepThink: boolean (可选) - 深度思考
- xpath: string (可选, 仅 Web) - XPath 表达式
- cacheable: boolean (可选) - 可缓存
```

#### aiKeyboardPress
```typescript
// 官方 API
aiKeyboardPress(key: string, locate?: string, options?: { deepThink?, xpath?, cacheable? })

// 配置参数
- key: string (必填) - 按键名称
- locate: string (可选) - 元素定位
- deepThink: boolean (可选) - 深度思考
- xpath: string (可选, 仅 Web) - XPath 表达式
- cacheable: boolean (可选) - 可缓存
```

#### aiDoubleClick
```typescript
// 官方 API
aiDoubleClick(locate: string, options?: { deepThink?, xpath?, cacheable? })

// 配置参数
- locate: string (必填) - 元素定位
- deepThink: boolean (可选) - 深度思考
- xpath: string (可选, 仅 Web) - XPath 表达式
- cacheable: boolean (可选) - 可缓存
```

#### aiRightClick
```typescript
// 官方 API
aiRightClick(locate: string, options?: { deepThink?, xpath?, cacheable? })

// 配置参数
- locate: string (必填) - 元素定位
- deepThink: boolean (可选) - 深度思考
- xpath: string (可选, 仅 Web) - XPath 表达式
- cacheable: boolean (可选) - 可缓存
```

### 高级操作

#### aiAction
```typescript
// 官方 API
aiAction(prompt: string, options?: { cacheable? })

// 配置参数
- prompt: string (必填) - 任务描述
- cacheable: boolean (可选) - 可缓存
```

### 无 Options 的 Actions

```typescript
aiAssert(assertion: string)
aiWaitFor(assertion: string, { timeoutMs?: number })
aiScroll({ direction, distance? })
aiQuery(demand: string)
aiString(prompt: string)
aiNumber(prompt: string)
aiBoolean(prompt: string)
aiLocate(prompt: string)
```

---

## 🎯 Web vs Windows 差异

| 特性 | Web | Windows |
|------|-----|---------|
| xpath 支持 | ✅ 支持 | ❌ 不支持 |
| deepThink | ✅ 支持 | ✅ 支持 |
| cacheable | ✅ 支持 | ✅ 支持 |

---

## 🔧 辅助函数

```typescript
import {
  getFlowActionConfig,
  getMainParams,
  getOptionParams,
  hasOptions,
  supportsXPath,
} from '@/config/clientTypeFlowActions';

// 获取 action 完整配置
const config = getFlowActionConfig('web', 'aiInput');

// 获取主要参数（非 options）
const mainParams = getMainParams('web', 'aiInput');
// => [{ name: 'text', ... }, { name: 'locate', ... }]

// 获取 options 参数
const optionParams = getOptionParams('web', 'aiInput');
// => [{ name: 'deepThink', ... }, { name: 'xpath', ... }, { name: 'cacheable', ... }]

// 检查是否有 options
const hasOpts = hasOptions('web', 'aiInput');
// => true

// 检查是否支持 xpath
const hasXPath = supportsXPath('web');
// => true
const hasXPathWin = supportsXPath('windows');
// => false
```

---

## 📝 示例：构建 API 调用

```typescript
// 用户输入
const formData = {
  text: 'admin',
  locate: '用户名输入框',
  deepThink: true,
  xpath: '//input[@name="username"]',
  cacheable: false,
};

// 区分主要参数和 options
const mainParams = ['text', 'locate'];
const optionParams = ['deepThink', 'xpath', 'cacheable'];

// 构建主要参数
const args = mainParams.map(p => formData[p]);
// => ['admin', '用户名输入框']

// 构建 options（过滤空值）
const options = {};
optionParams.forEach(p => {
  if (formData[p] !== undefined && formData[p] !== null && formData[p] !== '') {
    options[p] = formData[p];
  }
});
// => { deepThink: true, xpath: '//input[@name="username"]' }

// 生成代码
const code = `await agent.aiInput(${JSON.stringify(args[0])}, ${JSON.stringify(args[1])}, ${JSON.stringify(options)})`;
// => await agent.aiInput("admin", "用户名输入框", {"deepThink":true,"xpath":"//input[@name=\"username\"]"})
```

---

## 🎨 前端渲染模板

```tsx
function FlowActionForm({ clientType, actionType }) {
  const mainParams = getMainParams(clientType, actionType);
  const optionParams = getOptionParams(clientType, actionType);
  const supportsXpath = supportsXPath(clientType);
  
  return (
    <form>
      {/* 主要参数 */}
      <div className="space-y-4">
        {mainParams.map(param => (
          <FormField key={param.name} param={param} />
        ))}
      </div>
      
      {/* Options（可折叠） */}
      {optionParams.length > 0 && (
        <Collapsible title="高级选项">
          {optionParams
            .filter(p => p.name !== 'xpath' || supportsXpath) // 过滤 xpath
            .map(param => (
              <FormField key={param.name} param={param} />
            ))}
        </Collapsible>
      )}
    </form>
  );
}
```

---

## ⚡ 常见问题

### Q: 如何判断参数是主要参数还是 options？
**A**: 使用 `isOption` 字段：
```typescript
param.isOption === true  // options 参数
param.isOption !== true  // 主要参数
```

### Q: Windows 版如何处理 xpath？
**A**: 使用 `supportsXPath(clientType)` 检查：
```typescript
if (supportsXPath(clientType)) {
  // 显示 xpath 输入框
} else {
  // 隐藏 xpath 输入框
}
```

### Q: options 为空时如何处理？
**A**: 不传递 options 参数：
```typescript
// ✅ 正确：options 为空时不传递
await agent.aiInput("text", "locate")

// ❌ 错误：不要传递空对象
await agent.aiInput("text", "locate", {})
```

### Q: 如何获取参数的默认值？
**A**: 使用 `defaultValue` 字段：
```typescript
const defaultValue = param.defaultValue;
// 例如：deepThink 的 defaultValue 是 false
```

---

## 📚 完整配置示例

```typescript
// aiInput (Web 版)
{
  type: 'aiInput',
  label: 'AI 输入',
  description: '在指定元素输入文本',
  category: 'basic',
  params: [
    // 主要参数
    { name: 'text', label: '输入内容', type: 'string', required: true },
    { name: 'locate', label: '元素定位', type: 'string', required: true },
    // options 参数
    { name: 'deepThink', label: '深度思考', type: 'boolean', required: false, isOption: true, defaultValue: false },
    { name: 'xpath', label: 'XPath 表达式', type: 'string', required: false, isOption: true },
    { name: 'cacheable', label: '可缓存', type: 'boolean', required: false, isOption: true, defaultValue: false },
  ],
}

// aiInput (Windows 版)
{
  type: 'aiInput',
  label: 'AI 输入',
  description: '在指定元素输入文本',
  category: 'basic',
  params: [
    // 主要参数
    { name: 'text', label: '输入内容', type: 'string', required: true },
    { name: 'locate', label: '元素定位', type: 'string', required: true },
    // options 参数（无 xpath）
    { name: 'deepThink', label: '深度思考', type: 'boolean', required: false, isOption: true, defaultValue: false },
    { name: 'cacheable', label: '可缓存', type: 'boolean', required: false, isOption: true, defaultValue: false },
  ],
}
```

