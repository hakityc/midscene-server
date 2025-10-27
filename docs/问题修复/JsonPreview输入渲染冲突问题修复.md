# JsonPreview 输入渲染冲突问题修复

## 问题描述

### 问题现象

用户在 JsonPreview 组件的文本框中输入 JSON 内容时，会出现以下问题：

1. **输入冲突**：用户正在输入时，内容会被意外覆盖
2. **实时渲染干扰**：每次内容变化都会触发重新渲染，影响输入体验
3. **表单更新时机错误**：在用户还在输入时就更新表单，导致数据不一致

### 问题根源

原始的 JsonPreview 组件存在以下设计缺陷：

1. **useEffect 监听 previewParams 变化**：每次 `previewParams` 变化都会重新设置 `jsonString`
2. **输入和渲染冲突**：用户输入时 `handleChange` 设置 `jsonString`，同时 `useEffect` 也可能重新设置它
3. **缺少编辑状态管理**：没有区分用户主动编辑和程序自动更新的状态
4. **双向同步冲突**：JsonPreview 和任务表单之间的双向同步导致内容被意外覆盖

### 双向同步流程分析

**正常流程：**

```
用户修改 JsonPreview → onFormUpdate → updateFromJson → 更新 store.tasks
→ buildMessage → currentMessage → JsonPreview 的 message prop 更新
→ previewParams 更新 → useEffect 重新设置 jsonString
```

**问题场景：**
用户粘贴 JSON 内容后失焦，触发以下流程：

1. 失焦 → `handleBlur` → `onFormUpdate` → 更新 store
2. store 更新 → `previewParams` 变化 → `useEffect` 重新设置 `jsonString`
3. 用户的输入被覆盖，显示为格式化后的内容

## 修复方案

### 核心思路

1. **分离编辑状态**：区分用户编辑状态和程序自动更新状态
2. **失焦验证**：只在用户失焦时才验证并更新表单
3. **防止冲突**：编辑状态下阻止自动渲染更新
4. **双向同步支持**：保持 JsonPreview 和任务表单之间的双向同步

### 技术实现

#### 1. 添加编辑状态管理

```typescript
const isUserEditingRef = useRef(false); // 使用 ref 跟踪用户编辑状态
```

**为什么使用 `useRef` 而不是 `useState`：**

- `useRef` 不会触发重新渲染
- 避免了状态更新导致的渲染循环
- 更适合跟踪编辑状态这种不需要触发 UI 更新的数据

#### 2. 修改 useEffect 逻辑

**修复前：**

```typescript
useEffect(() => {
  // 使用转换后的参数格式化 JSON
  const formatted = formatJsonWithDisabledActions(previewParams);
  setJsonString(formatted);
  setIsValid(true);
  setError('');
}, [previewParams]); // 每次 previewParams 变化都会更新
```

**修复后：**

```typescript
// 只在非用户编辑状态下更新 JSON 字符串
useEffect(() => {
  if (!isUserEditingRef.current) {
    const formatted = formatJsonWithDisabledActions(previewParams);
    setJsonString(formatted);
    setIsValid(true);
    setError('');
  }
}, [previewParams]);
```

#### 3. 修改输入处理逻辑

**修复前：**

```typescript
const handleChange = (value: string) => {
  setJsonString(value);

  if (!editable) return;

  const validation = validateJson(value);
  setIsValid(validation.isValid);
  setError(validation.error || '');

  if (validation.isValid && validation.parsed) {
    // 立即更新表单 - 问题所在
    const updatedMessage = {
      ...message,
      payload: {
        ...message.payload,
        params: validation.parsed,
      },
    };

    if (onEdit) {
      onEdit(updatedMessage);
    }

    if (onFormUpdate) {
      onFormUpdate(validation.parsed);
    }
  }
};
```

**修复后：**

```typescript
const handleChange = (value: string) => {
  setJsonString(value);
  isUserEditingRef.current = true; // 标记为用户编辑状态

  if (!editable) return;

  // 实时验证但不立即更新表单，只在失焦时更新
  const validation = validateJson(value);
  setIsValid(validation.isValid);
  setError(validation.error || '');
};

// 新增：失焦时的处理函数
const handleBlur = () => {
  if (!editable || !isValid) return;

  // 失焦时验证并更新表单
  const validation = validateJson(jsonString);
  if (validation.isValid && validation.parsed) {
    const updatedMessage = {
      ...message,
      payload: {
        ...message.payload,
        params: validation.parsed,
      },
    };

    if (onEdit) {
      onEdit(updatedMessage);
    }

    if (onFormUpdate) {
      onFormUpdate(validation.parsed);
    }
  }

  // 编辑状态会在 message 变化时自动重置
};
```

#### 4. 添加 message 变化监听

```typescript
// 监听 message 变化，如果是外部更新则重置编辑状态
useEffect(() => {
  // 如果 message 变化了，说明是外部更新，重置编辑状态
  if (isUserEditingRef.current) {
    isUserEditingRef.current = false;
  }
}, [message]);
```

**关键改进：**

- 使用 `useRef` 而不是 `useState` 来跟踪编辑状态
- 监听 `message` 变化来自动重置编辑状态
- 避免了 `setTimeout` 的不优雅解决方案

#### 5. 添加失焦事件处理

```typescript
<Textarea
  value={jsonString}
  onChange={(e) => handleChange(e.target.value)}
  onBlur={handleBlur} // 新增：失焦事件
  readOnly={!editable}
  className={`font-mono text-xs min-h-[400px] ${
    !isValid ? 'border-destructive' : ''
  } ${!editable ? 'bg-muted/50' : ''}`}
  spellCheck={false}
/>
```

#### 6. 优化粘贴处理

```typescript
const handlePaste = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text.trim()) {
      handleChange(text);
      // 粘贴后立即验证并更新表单（因为用户明确想要粘贴内容）
      const validation = validateJson(text);
      if (validation.isValid && validation.parsed) {
        const updatedMessage = {
          ...message,
          payload: {
            ...message.payload,
            params: validation.parsed,
          },
        };

        if (onEdit) {
          onEdit(updatedMessage);
        }

        if (onFormUpdate) {
          onFormUpdate(validation.parsed);
        }
      }
    }
  } catch (error) {
    console.error('Failed to paste:', error);
  }
};
```

## 修复效果

### 用户体验改进

1. **流畅输入**：用户输入时不会被意外打断
2. **实时验证**：输入过程中实时显示 JSON 有效性
3. **失焦更新**：只在用户完成输入（失焦）时才更新表单
4. **粘贴优化**：粘贴操作立即生效，提供更好的用户体验

### 技术改进

1. **状态管理清晰**：明确区分编辑状态和显示状态
2. **性能优化**：减少不必要的渲染和更新
3. **数据一致性**：确保表单数据与用户输入一致
4. **错误处理**：更好的错误状态管理

## 测试验证

### 测试场景

1. **正常输入流程**
   - 用户开始输入 → 标记为编辑状态
   - 输入过程中 → 实时验证，但不更新表单
   - 用户失焦 → 验证有效后更新表单

2. **预览参数变化**
   - 编辑状态下 → 忽略预览参数变化
   - 非编辑状态下 → 正常更新 JSON 显示

3. **粘贴操作**
   - 粘贴内容 → 立即验证并更新表单
   - 提供即时反馈

### 测试结果

```
=== JsonPreview 组件修复验证 ===

1. 初始状态：设置预览参数
✅ 非编辑状态：更新 JSON 字符串

2. 用户开始输入（模拟编辑状态）
❌ 实时验证：JSON 无效 - Unterminated string in JSON

3. 预览参数变化（应该被忽略）
⏸️ 编辑状态：跳过 JSON 字符串更新

4. 用户继续输入
✅ 实时验证：JSON 有效

5. 用户失焦（应该更新表单）
✅ 失焦：JSON 有效，更新表单

6. 失焦后，预览参数变化（应该生效）
✅ 非编辑状态：更新 JSON 字符串
```

## 关键改进点

### 1. 编辑状态管理

- **问题**：没有区分用户编辑和程序更新
- **解决**：添加 `isEditing` 状态标记
- **效果**：防止编辑过程中的意外覆盖

### 2. 失焦验证机制

- **问题**：实时更新表单导致数据不一致
- **解决**：只在失焦时验证并更新表单
- **效果**：确保用户完成输入后才更新

### 3. 渲染冲突解决

- **问题**：useEffect 和用户输入冲突
- **解决**：编辑状态下阻止自动渲染
- **效果**：流畅的输入体验

### 4. 粘贴操作优化

- **问题**：粘贴后需要手动失焦才能生效
- **解决**：粘贴后立即验证并更新
- **效果**：更好的用户体验

## 注意事项

### 1. 状态同步

确保 `isEditing` 状态在各种情况下都能正确更新：

- 输入时设置为 `true`
- 失焦时设置为 `false`
- 粘贴时根据情况决定

### 2. 错误处理

保持实时验证功能，让用户能够及时发现 JSON 格式错误。

### 3. 性能考虑

避免在编辑状态下进行不必要的计算和更新。

### 4. 用户体验

保持验证状态的视觉反馈，让用户知道当前输入是否有效。

## 相关文件

### 修改文件

- `apps/web/src/components/debug/JsonPreview.tsx` - 主要修复文件

### 相关组件

- `apps/web/src/components/ui/textarea.tsx` - 文本框组件
- `apps/web/src/utils/messageBuilder.ts` - JSON 验证工具

## 总结

通过这次修复，JsonPreview 组件现在能够：

1. ✅ **提供流畅的输入体验**：用户输入时不会被意外打断
2. ✅ **正确的验证时机**：只在失焦时更新表单，避免数据不一致
3. ✅ **防止渲染冲突**：编辑状态下阻止自动更新
4. ✅ **优化粘贴体验**：粘贴操作立即生效
5. ✅ **保持实时反馈**：输入过程中显示验证状态

这个修复解决了用户在使用 JSON 编辑器时遇到的核心问题，提供了更好的用户体验和数据一致性。
