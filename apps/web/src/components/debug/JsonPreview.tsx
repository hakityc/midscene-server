import { CheckCircle2, Clipboard, Copy, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVariableTransform } from '@/hooks/useVariableTransform';
import type { WsInboundMessage } from '@/types/debug';
import { validateJson } from '@/utils/messageBuilder';

/**
 * Task 字段配置
 * 
 * 采用配置驱动的方式，提升可扩展性：
 * 1. 新增字段只需在 fieldOrder 中添加，即可自动渲染
 * 2. 如果字段有特殊验证需求，可在 fieldValidators 中配置
 * 3. 未知字段会自动发现并渲染（向后兼容）
 * 
 * 使用示例：
 * - 添加新字段：在 fieldOrder 数组中添加字段名
 * - 添加验证器：在 fieldValidators 对象中添加验证函数
 * - 排除前端字段：在 frontendOnlyFields 中添加字段名
 */
const TASK_FIELD_CONFIG = {
  // 前端专用字段，不在 JSON 中显示
  frontendOnlyFields: new Set(['id']),
  // 字段显示顺序（按此顺序渲染），新增字段只需在此添加
  fieldOrder: ['name', 'continueOnError', 'maxRetriesForConnection', 'aiActionContext'],
  // 特殊字段，需要自定义渲染逻辑（会在最后渲染）
  specialFields: new Set(['flow']),
  // 字段值的验证函数（可选字段需要验证，确保只显示有效值）
  // 格式：字段名 -> (value: unknown) => boolean
  fieldValidators: {
    aiActionContext: (value: unknown): boolean => {
      return typeof value === 'string' && value.trim().length > 0;
    },
  },
} as const;

/**
 * 格式化 flow 动作数组
 */
function formatFlowActions(flow: any[]): string[] {
  const actionLines: string[] = [];

  flow.forEach((action: any) => {
    const isEnabled = action.enabled !== false;
    // 移除前端专用字段（id, enabled）
    // biome-ignore lint/correctness/noUnusedVariables: 解构是为了移除字段
    const { id, enabled, ...cleanAction } = action;

    // 检查是否为空对象（移除字段后没有任何内容）
    const isEmptyAction = Object.keys(cleanAction).length === 0;
    if (isEmptyAction) {
      return; // 跳过空对象
    }

    const actionStr = JSON.stringify(cleanAction, null, 2);
    const indentedAction = actionStr
      .split('\n')
      .map((line) => '        ' + line)
      .join('\n');

    if (!isEnabled) {
      // 将未启用的动作注释掉
      const commented = indentedAction
        .split('\n')
        .map((line) => '// ' + line)
        .join('\n');
      actionLines.push(commented);
    } else {
      actionLines.push(indentedAction);
    }
  });

  return actionLines;
}

/**
 * 格式化单个 Task 对象
 */
function formatTask(task: any): string {
  const lines: string[] = [];
  lines.push(`    {`);

  // 按照配置的顺序渲染标准字段（可扩展：新增字段只需在配置中添加）
  const standardFields: string[] = [];
  const processedFields = new Set<string>();
  
  // 1. 处理配置中定义的字段（按顺序）
  for (const fieldName of TASK_FIELD_CONFIG.fieldOrder) {
    if (fieldName in task && !TASK_FIELD_CONFIG.frontendOnlyFields.has(fieldName)) {
      processedFields.add(fieldName);
      const value = task[fieldName];
      const validator = TASK_FIELD_CONFIG.fieldValidators[fieldName as keyof typeof TASK_FIELD_CONFIG.fieldValidators];
      
      // 如果有验证器，使用验证器判断是否应该包含
      if (validator) {
        if (validator(value)) {
          standardFields.push(`      "${fieldName}": ${JSON.stringify(value)},`);
        }
      } else if (value !== undefined && value !== null) {
        // 默认情况：值存在就包含
        standardFields.push(`      "${fieldName}": ${JSON.stringify(value)},`);
      }
    }
  }

  // 2. 自动发现并渲染未知字段（不在配置中的字段，提升向后兼容性）
  const allFields = new Set(Object.keys(task));
  for (const fieldName of allFields) {
    // 跳过已处理的字段、前端专用字段和特殊字段
    if (
      processedFields.has(fieldName) ||
      TASK_FIELD_CONFIG.frontendOnlyFields.has(fieldName) ||
      TASK_FIELD_CONFIG.specialFields.has(fieldName)
    ) {
      continue;
    }

    const value = task[fieldName];
    if (value !== undefined && value !== null) {
      standardFields.push(`      "${fieldName}": ${JSON.stringify(value)},`);
    }
  }

  // 渲染标准字段
  standardFields.forEach((line) => lines.push(line));

  // 3. 处理特殊字段 flow（最后渲染）
  if (task.flow && Array.isArray(task.flow)) {
    lines.push(`      "flow": [`);
    
    const actionLines = formatFlowActions(task.flow);
    
    // 添加带逗号的动作行
    actionLines.forEach((line, index) => {
      lines.push(line + (index < actionLines.length - 1 ? ',' : ''));
    });

    lines.push(`      ]`);
  }

  lines.push(`    }`);
  return lines.join('\n');
}

/**
 * 格式化 JSON，将未启用的动作注释掉
 */
function formatJsonWithDisabledActions(params: any): string {
  if (!params || typeof params !== 'object') {
    return JSON.stringify(params, null, 2);
  }

  // 如果有 tasks 数组，处理每个 task
  if (Array.isArray(params.tasks)) {
    const formattedTasks = params.tasks.map((task: any) => formatTask(task));
    return `{\n  "tasks": [\n${formattedTasks.join(',\n')}\n  ]\n}`;
  }

  return JSON.stringify(params, null, 2);
}

interface JsonPreviewProps {
  message: WsInboundMessage;
  editable?: boolean;
  onEdit?: (message: WsInboundMessage) => void;
  onFormUpdate?: (formData: any) => void;
}

export function JsonPreview({
  message,
  editable = false,
  onEdit,
  onFormUpdate,
}: JsonPreviewProps) {
  // 局部变量：编辑时只修改这个，失焦时再同步到全局
  const [localJsonString, setLocalJsonString] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { transformTasks } = useVariableTransform();

  // 用于防止 handleBlur 后立即触发 useEffect 重新格式化
  const skipNextEffectRef = useRef(false);

  // 转换变量为占位符后的参数（用于预览）
  const previewParams = useMemo(() => {
    const params = message.payload?.params || {};

    // 如果是 aiScript 类型且有 tasks，转换变量为占位符
    if (
      message.payload?.action === 'aiScript' &&
      typeof params === 'object' &&
      params !== null &&
      'tasks' in params &&
      Array.isArray(params.tasks)
    ) {
      return {
        ...params,
        tasks: transformTasks(params.tasks, 'placeholder'),
      };
    }

    return params;
  }, [message, transformTasks]);

  // 全局 message 变化 → 同步到局部变量
  useEffect(() => {
    // 如果标志位为 true，跳过本次更新（用户刚刚手动编辑并提交）
    if (skipNextEffectRef.current) {
      skipNextEffectRef.current = false;
      return;
    }

    const formatted = formatJsonWithDisabledActions(previewParams);
    setLocalJsonString(formatted);
    setIsValid(true);
    setError('');
  }, [previewParams]);

  // 用户输入 → 只修改局部变量
  const handleChange = (value: string) => {
    setLocalJsonString(value);

    if (!editable) return;

    // 实时验证但不立即更新全局，只在失焦时更新
    const validation = validateJson(value);
    setIsValid(validation.isValid);
    setError(validation.error || '');
  };

  // 失焦 → 同步局部变量到全局
  const handleBlur = () => {
    if (!editable || !isValid) return;

    // 失焦时验证并更新全局 store
    const validation = validateJson(localJsonString);
    if (validation.isValid && validation.parsed) {
      // 只更新 params 部分
      const updatedMessage = {
        ...message,
        payload: {
          ...message.payload,
          params: validation.parsed,
        },
      };

      // 更新消息（如果需要）
      if (onEdit) {
        onEdit(updatedMessage);
      }

      // 同步到全局 store（表单）
      if (onFormUpdate) {
        // 设置标志：跳过下一次 useEffect 更新
        skipNextEffectRef.current = true;
        onFormUpdate(validation.parsed);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localJsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        // 更新局部变量
        setLocalJsonString(text);

        // 粘贴后立即验证并同步到全局（因为用户明确想要粘贴内容）
        const validation = validateJson(text);
        setIsValid(validation.isValid);
        setError(validation.error || '');

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
            // 设置标志：跳过下一次 useEffect 更新
            skipNextEffectRef.current = true;
            onFormUpdate(validation.parsed);
          }
        }
      }
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">参数 JSON</Label>
          <p className="text-xs text-muted-foreground mt-0.5">payload.params</p>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <Button size="sm" variant="outline" onClick={handlePaste}>
              <Clipboard className="h-3 w-3 mr-1" />
              粘贴
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-1" />
            {copied ? '已复制!' : '复制'}
          </Button>
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border ${
              isValid
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400'
                : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400'
            }`}
          >
            {isValid ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                有效
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                无效
              </>
            )}
          </div>
        </div>
      </div>

      <Textarea
        value={localJsonString}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        readOnly={!editable}
        className={`font-mono text-xs min-h-[400px] ${
          !isValid ? 'border-destructive' : ''
        } ${!editable ? 'bg-muted/50' : ''}`}
        spellCheck={false}
      />

      {!isValid && error && (
        <div className="p-2 rounded-md border border-destructive bg-destructive/10 text-destructive text-xs font-medium">
          ❌ {error}
        </div>
      )}

      {editable && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            💡 编辑参数 JSON 后失焦会同步更新表单
          </p>
          <p className="text-xs text-muted-foreground">
            📋 点击"粘贴"按钮可以快速从剪贴板导入参数并更新表单
          </p>
          <p className="text-xs text-amber-600 font-medium">
            ⚠️ 被注释掉的动作（以 {'//'} 开头）不会被执行
          </p>
        </div>
      )}

      {!editable && localJsonString.includes('//') && (
        <div className="p-2 rounded-md border border-amber-500 bg-amber-50 text-amber-700 text-xs font-medium">
          ℹ️ 注意：被注释掉的动作（以 {'//'} 开头）已被禁用，不会被执行
        </div>
      )}
    </div>
  );
}
