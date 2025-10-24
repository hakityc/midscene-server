# FlowAction 配置对齐官方 API 重构文档

## 📋 概述

本次重构将 `clientTypeFlowActions.ts` 中的 Flow Action 配置严格对齐 Midscene.js 官方 API 文档，确保前端能够根据配置正确渲染操作表单。

**修改时间**: 2025-10-15  
**相关文件**: `apps/server/src/config/clientTypeFlowActions.ts`

---

## 🎯 重构目标

### 1. **严格对齐官方 API**
- 参数名称与官方 API 保持一致（如 `locate` 而非 `locator`）
- 参数顺序与官方 API 一致
- 完整支持 `options` 参数

### 2. **区分 Web 和 Windows 版本**
- **Web 版**: 支持 `xpath` 选项
- **Windows 版**: 不支持 `xpath` 选项
- 其他 options 参数相同（`deepThink`, `cacheable`）

### 3. **支持前端动态渲染**
- 区分主要参数和 options 参数
- 提供完整的参数元数据（类型、描述、默认值等）
- 支持前端根据配置自动生成表单

---

## 🔧 主要修改内容

### 1. **增强 FlowActionConfig 接口**

```typescript
export interface FlowActionConfig {
  type: FlowActionType;
  label: string;
  description: string;
  category: 'basic' | 'query' | 'advanced' | 'utility' | 'windows-specific';
  params: {
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    placeholder?: string;
    description?: string;
    isOption?: boolean;      // ✨ 新增：标识是否为 options 参数
    defaultValue?: any;       // ✨ 新增：参数默认值
  }[];
  example?: string;
}
```

### 2. **修正参数命名**

| Action | 旧参数名 | 新参数名 | 说明 |
|--------|---------|---------|-----|
| aiTap | `locator` | `locate` | 对齐官方 API |
| aiInput | `value` | `text` | 对齐官方 API |
| aiInput | `locator` | `locate` | 对齐官方 API |
| aiKeyboardPress | `keyName` | `key` | 对齐官方 API |
| aiDoubleClick | `locator` | `locate` | 对齐官方 API |
| aiRightClick | `locator` | `locate` | 对齐官方 API |
| aiHover | `locator` | `locate` | 对齐官方 API |

### 3. **添加 Options 参数**

#### Web 版 Options（支持 xpath）

所有主要操作（aiTap, aiInput, aiKeyboardPress, aiDoubleClick, aiRightClick, aiHover）都支持：

```typescript
{
  name: 'deepThink',
  label: '深度思考',
  type: 'boolean',
  required: false,
  isOption: true,
  defaultValue: false,
  description: '是否使用深度推理模式（更准确但更慢）',
},
{
  name: 'xpath',
  label: 'XPath 表达式',
  type: 'string',
  required: false,
  isOption: true,
  placeholder: '//button[@id="login"]',
  description: '可选的 XPath 选择器',
},
{
  name: 'cacheable',
  label: '可缓存',
  type: 'boolean',
  required: false,
  isOption: true,
  defaultValue: false,
  description: '是否缓存 AI 结果',
}
```

#### Windows 版 Options（不支持 xpath）

```typescript
{
  name: 'deepThink',
  label: '深度思考',
  type: 'boolean',
  required: false,
  isOption: true,
  defaultValue: false,
  description: '是否使用深度推理模式（更准确但更慢）',
},
{
  name: 'cacheable',
  label: '可缓存',
  type: 'boolean',
  required: false,
  isOption: true,
  defaultValue: false,
  description: '是否缓存 AI 结果',
}
```

### 4. **新增辅助函数**

```typescript
/**
 * 获取 action 的主要参数（非 options）
 */
export function getMainParams(
  clientType: ClientType,
  actionType: FlowActionType,
): FlowActionConfig['params']

/**
 * 获取 action 的 options 参数
 */
export function getOptionParams(
  clientType: ClientType,
  actionType: FlowActionType,
): FlowActionConfig['params']

/**
 * 检查 action 是否有 options 参数
 */
export function hasOptions(
  clientType: ClientType,
  actionType: FlowActionType,
): boolean

/**
 * 检查客户端类型是否支持 xpath
 */
export function supportsXPath(clientType: ClientType): boolean
```

---

## 📝 完整的 Action 配置示例

### aiInput (Web 版)

```typescript
{
  type: 'aiInput',
  label: 'AI 输入',
  description: '在指定元素输入文本',
  category: 'basic',
  params: [
    {
      name: 'text',                    // 主要参数
      label: '输入内容',
      type: 'string',
      required: true,
      placeholder: '要输入的文本',
      description: '要输入的文本内容',
    },
    {
      name: 'locate',                  // 主要参数
      label: '元素定位',
      type: 'string',
      required: true,
      placeholder: '例如：用户名输入框',
      description: '用自然语言描述目标输入框',
    },
    {
      name: 'deepThink',               // options 参数
      label: '深度思考',
      type: 'boolean',
      required: false,
      isOption: true,
      defaultValue: false,
      description: '是否使用深度推理模式',
    },
    {
      name: 'xpath',                   // options 参数（仅 web）
      label: 'XPath 表达式',
      type: 'string',
      required: false,
      isOption: true,
      placeholder: '//input[@name="username"]',
      description: '可选的 XPath 选择器',
    },
    {
      name: 'cacheable',               // options 参数
      label: '可缓存',
      type: 'boolean',
      required: false,
      isOption: true,
      defaultValue: false,
      description: '是否缓存 AI 结果',
    },
  ],
  example: 'await agent.aiInput("admin", "用户名输入框", { xpath: "//input[@name=\'username\']" })',
}
```

### aiInput (Windows 版)

```typescript
{
  type: 'aiInput',
  label: 'AI 输入',
  description: '在指定元素输入文本',
  category: 'basic',
  params: [
    {
      name: 'text',                    // 主要参数
      label: '输入内容',
      type: 'string',
      required: true,
      placeholder: '要输入的文本',
      description: '要输入的文本内容',
    },
    {
      name: 'locate',                  // 主要参数
      label: '元素定位',
      type: 'string',
      required: true,
      placeholder: '例如：搜索框',
      description: '用自然语言描述目标输入框',
    },
    {
      name: 'deepThink',               // options 参数
      label: '深度思考',
      type: 'boolean',
      required: false,
      isOption: true,
      defaultValue: false,
      description: '是否使用深度推理模式',
    },
    {
      name: 'cacheable',               // options 参数
      label: '可缓存',
      type: 'boolean',
      required: false,
      isOption: true,
      defaultValue: false,
      description: '是否缓存 AI 结果',
    },
    // 注意：Windows 版没有 xpath 参数
  ],
  example: 'await agent.aiInput("notepad", "搜索框")',
}
```

---

## 🎨 前端渲染指南

### 1. **基本渲染逻辑**

```typescript
import { 
  getFlowActionConfig, 
  getMainParams, 
  getOptionParams,
  hasOptions,
  supportsXPath 
} from '@/config/clientTypeFlowActions';

function renderFlowActionForm(clientType: ClientType, actionType: FlowActionType) {
  const config = getFlowActionConfig(clientType, actionType);
  const mainParams = getMainParams(clientType, actionType);
  const optionParams = getOptionParams(clientType, actionType);
  
  return (
    <form>
      {/* 主要参数 */}
      <div className="main-params">
        {mainParams.map(param => renderParamInput(param))}
      </div>
      
      {/* Options 参数（可折叠） */}
      {hasOptions(clientType, actionType) && (
        <Collapsible title="高级选项">
          {optionParams.map(param => renderParamInput(param))}
        </Collapsible>
      )}
    </form>
  );
}
```

### 2. **参数输入组件渲染**

```typescript
function renderParamInput(param: FlowActionConfig['params'][0]) {
  switch (param.type) {
    case 'string':
      return (
        <Input
          name={param.name}
          label={param.label}
          placeholder={param.placeholder}
          required={param.required}
          description={param.description}
          defaultValue={param.defaultValue}
        />
      );
    
    case 'boolean':
      return (
        <Checkbox
          name={param.name}
          label={param.label}
          defaultChecked={param.defaultValue}
          description={param.description}
        />
      );
    
    case 'number':
      return (
        <NumberInput
          name={param.name}
          label={param.label}
          placeholder={param.placeholder}
          required={param.required}
          defaultValue={param.defaultValue}
        />
      );
    
    default:
      return null;
  }
}
```

### 3. **构建 API 调用**

```typescript
function buildApiCall(
  actionType: FlowActionType,
  formData: Record<string, any>,
  config: FlowActionConfig
) {
  const mainParams = config.params.filter(p => !p.isOption);
  const optionParams = config.params.filter(p => p.isOption);
  
  // 构建主要参数
  const args = mainParams.map(p => formData[p.name]);
  
  // 构建 options 对象（只包含非空值）
  const options: Record<string, any> = {};
  optionParams.forEach(p => {
    const value = formData[p.name];
    if (value !== undefined && value !== null && value !== '') {
      options[p.name] = value;
    }
  });
  
  // 如果有 options，添加到参数列表
  if (Object.keys(options).length > 0) {
    args.push(options);
  }
  
  // 生成调用代码
  const optionsStr = Object.keys(options).length > 0 
    ? `, ${JSON.stringify(options)}` 
    : '';
  
  return `await agent.${actionType}(${args.map(a => JSON.stringify(a)).join(', ')}${optionsStr})`;
}
```

### 4. **示例：aiInput 渲染效果**

```tsx
// Web 版渲染结果
<form>
  {/* 主要参数 */}
  <Input name="text" label="输入内容" required placeholder="要输入的文本" />
  <Input name="locate" label="元素定位" required placeholder="例如：用户名输入框" />
  
  {/* 高级选项（可折叠） */}
  <Collapsible title="高级选项">
    <Checkbox name="deepThink" label="深度思考" defaultChecked={false} />
    <Input name="xpath" label="XPath 表达式" placeholder="//input[@name='username']" />
    <Checkbox name="cacheable" label="可缓存" defaultChecked={false} />
  </Collapsible>
</form>

// Windows 版渲染结果（无 xpath）
<form>
  {/* 主要参数 */}
  <Input name="text" label="输入内容" required placeholder="要输入的文本" />
  <Input name="locate" label="元素定位" required placeholder="例如：搜索框" />
  
  {/* 高级选项（可折叠） */}
  <Collapsible title="高级选项">
    <Checkbox name="deepThink" label="深度思考" defaultChecked={false} />
    <Checkbox name="cacheable" label="可缓存" defaultChecked={false} />
  </Collapsible>
</form>
```

---

## 📊 涉及的 Actions 列表

### Web 和 Windows 共同支持（有差异）

| Action | Web Options | Windows Options | 差异 |
|--------|-------------|----------------|------|
| aiTap | deepThink, xpath, cacheable | deepThink, cacheable | Windows 无 xpath |
| aiInput | deepThink, xpath, cacheable | deepThink, cacheable | Windows 无 xpath |
| aiHover | deepThink, xpath, cacheable | deepThink, cacheable | Windows 无 xpath |
| aiKeyboardPress | deepThink, xpath, cacheable | deepThink, cacheable | Windows 无 xpath |
| aiDoubleClick | deepThink, xpath, cacheable | deepThink, cacheable | Windows 无 xpath |
| aiRightClick | deepThink, xpath, cacheable | deepThink, cacheable | Windows 无 xpath |
| aiAction | cacheable | cacheable | 相同 |

### 仅查询类（无 options）

- aiAssert
- aiWaitFor
- aiScroll
- aiQuery
- aiString
- aiNumber
- aiBoolean
- aiLocate

### 工具方法（无 options）

- sleep
- screenshot
- logText

### Windows 特有（无 options）

- getClipboard
- setClipboard
- getWindowList
- activateWindow

---

## ✅ 验证清单

- [x] 所有参数名称与官方 API 一致
- [x] Web 版支持 xpath，Windows 版不支持
- [x] 所有主要操作都添加了完整的 options 配置
- [x] 参数添加了 `isOption` 标识
- [x] 参数添加了 `defaultValue`
- [x] 添加了辅助函数支持前端渲染
- [x] 更新了 example 示例代码
- [x] 无 lint 错误

---

## 🚀 后续工作

### 前端适配

1. **更新表单渲染逻辑**
   - 区分主要参数和 options 参数
   - options 参数使用可折叠面板显示
   - 根据 clientType 动态显示/隐藏 xpath

2. **更新 API 调用构建**
   - 主要参数作为位置参数
   - options 参数组合为对象作为最后一个参数
   - 过滤空值的 options

3. **UI 优化**
   - 为 options 参数添加说明文案
   - 添加默认值提示
   - 支持快速切换常用选项

### 测试验证

1. **配置验证**
   - 验证所有 action 的参数配置
   - 验证 Web 和 Windows 版本差异
   - 验证辅助函数输出

2. **前端渲染测试**
   - 测试表单正确渲染
   - 测试参数收集和 API 调用构建
   - 测试不同 clientType 的差异

3. **集成测试**
   - 测试生成的代码能否正确执行
   - 测试 options 参数是否生效
   - 测试 xpath 在 Web 版的正确性

---

## 📚 相关资源

- **官方文档**: [Midscene.js API Documentation](https://midscenejs.com/api.html)
- **配置文件**: `apps/server/src/config/clientTypeFlowActions.ts`
- **前端组件**: `apps/web/src/components/debug/FlowActionItem.tsx`

---

## 💡 总结

本次重构确保了 Flow Action 配置与 Midscene.js 官方 API 完全对齐，为前端提供了完整的参数元数据，支持动态渲染表单。关键改进包括：

1. ✅ 参数命名标准化（`locate` vs `locator`）
2. ✅ 完整的 options 支持（deepThink, xpath, cacheable）
3. ✅ Web/Windows 版本差异处理（xpath）
4. ✅ 前端辅助函数（getMainParams, getOptionParams）
5. ✅ 详细的参数描述和默认值

这为前端实现精确的表单渲染和 API 调用构建提供了坚实基础。

