import type { FlowAction, Task } from '@/types/debug';

/**
 * 变量转换规则：
 * - UI输入: "点击${测试搜索词}" (保持原样)
 * - 发送后端: "点击测试搜索词" (去掉 ${})
 * - JSON预览: "点击lbxx" (替换为占位符)
 */

const PLACEHOLDER = 'lbxx'; // 统一占位符

export function useVariableTransform() {
  /**
   * 转换为运行时值（发送后端用）
   * 示例: "${测试搜索词}" -> "测试搜索词"
   */
  const toRuntime = (text: string): string => {
    return text.replace(/\$\{([^}]+)\}/g, '$1');
  };

  /**
   * 转换为占位符（JSON预览用）
   * 示例: "${测试搜索词}" -> "lbxx"
   */
  const toPlaceholder = (text: string): string => {
    return text.replace(/\$\{([^}]+)\}/g, PLACEHOLDER);
  };

  /**
   * 检查字符串是否包含变量
   */
  const hasVariables = (text: string): boolean => {
    return /\$\{[^}]+\}/.test(text);
  };

  /**
   * 获取 FlowAction 中所有可能包含变量的字段名
   */
  const getActionVariableFields = (action: FlowAction): string[] => {
    const fields: string[] = [];

    switch (action.type) {
      case 'aiTap':
        if (action.locate) fields.push('locate');
        break;
      case 'aiInput':
        fields.push('value', 'locate');
        break;
      case 'aiAssert':
        fields.push('assertion');
        if (action.errorMessage) fields.push('errorMessage');
        break;
      case 'aiHover':
      case 'aiDoubleClick':
      case 'aiRightClick':
        fields.push('locate');
        break;
      case 'aiWaitFor':
        fields.push('assertion');
        break;
      case 'aiKeyboardPress':
        if (action.locate) fields.push('locate');
        fields.push('key');
        break;
      case 'aiQuery':
        fields.push('demand');
        if (action.name) fields.push('name');
        break;
      case 'aiString':
      case 'aiNumber':
      case 'aiBoolean':
      case 'aiAction':
      case 'aiLocate':
        fields.push('prompt');
        break;
      case 'screenshot':
        if (action.name) fields.push('name');
        break;
      case 'logText':
        fields.push('text');
        break;
      case 'logScreenshot':
        if (action.title) fields.push('title');
        if (action.content) fields.push('content');
        break;
      case 'javascript':
        fields.push('code');
        if (action.name) fields.push('name');
        break;
      case 'setClipboard':
        fields.push('text');
        break;
      case 'activateWindow':
        fields.push('windowHandle');
        break;
      // sleep, getClipboard, getWindowList 没有字符串字段需要处理
    }

    return fields;
  };

  /**
   * 处理 FlowAction：转换所有字符串字段中的变量
   */
  const transformAction = (
    action: FlowAction,
    mode: 'runtime' | 'placeholder',
  ): FlowAction => {
    const transform = mode === 'runtime' ? toRuntime : toPlaceholder;
    const fields = getActionVariableFields(action);
    const processed = { ...action };

    fields.forEach((field) => {
      const value = (action as any)[field];
      if (typeof value === 'string' && hasVariables(value)) {
        (processed as any)[field] = transform(value);
      }
    });

    return processed;
  };

  /**
   * 处理整个任务列表：转换所有任务中的所有动作
   */
  const transformTasks = (
    tasks: Task[],
    mode: 'runtime' | 'placeholder',
  ): Task[] => {
    return tasks.map((task) => ({
      ...task,
      flow: task.flow.map((action) => transformAction(action, mode)),
    }));
  };

  return {
    toRuntime,
    toPlaceholder,
    hasVariables,
    transformAction,
    transformTasks,
  };
}
