import { CheckCircle2, Clipboard, Copy, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WsInboundMessage } from '@/types/debug';
import { validateJson } from '@/utils/messageBuilder';

/**
 * 格式化 JSON，将未启用的动作注释掉
 */
function formatJsonWithDisabledActions(params: any): string {
  if (!params || typeof params !== 'object') {
    return JSON.stringify(params, null, 2);
  }

  // 如果有 tasks 数组，处理每个 task 中的 flow
  if (Array.isArray(params.tasks)) {
    const formattedTasks = params.tasks.map((task: any) => {
      if (!task.flow || !Array.isArray(task.flow)) {
        return task;
      }

      const lines: string[] = [];
      lines.push(`    {`);
      lines.push(`      "name": ${JSON.stringify(task.name)},`);
      lines.push(`      "continueOnError": ${task.continueOnError},`);
      lines.push(`      "flow": [`);

      // 收集有效的动作行
      const actionLines: string[] = [];

      task.flow.forEach((action: any) => {
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

      // 添加带逗号的动作行
      actionLines.forEach((line, index) => {
        lines.push(line + (index < actionLines.length - 1 ? ',' : ''));
      });

      lines.push(`      ]`);
      lines.push(`    }`);
      return lines.join('\n');
    });

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
  const [jsonString, setJsonString] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 只展示 payload.params 部分
    const params = message.payload?.params || {};
    const formatted = formatJsonWithDisabledActions(params);
    setJsonString(formatted);
    setIsValid(true);
    setError('');
  }, [message]);

  const handleChange = (value: string) => {
    setJsonString(value);

    if (!editable) return;

    const validation = validateJson(value);
    setIsValid(validation.isValid);
    setError(validation.error || '');

    if (validation.isValid && validation.parsed) {
      // 只更新 params 部分
      const updatedMessage = {
        ...message,
        payload: {
          ...message.payload,
          params: validation.parsed,
        },
      };

      // 更新消息
      if (onEdit) {
        onEdit(updatedMessage);
      }

      // 解析并更新表单
      if (onFormUpdate) {
        onFormUpdate(validation.parsed);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
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
        handleChange(text);
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
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
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
            💡 编辑参数 JSON 会同步更新表单
          </p>
          <p className="text-xs text-muted-foreground">
            📋 点击"粘贴"按钮可以快速从剪贴板导入参数并更新表单
          </p>
          <p className="text-xs text-amber-600 font-medium">
            ⚠️ 被注释掉的动作（以 {'//'} 开头）不会被执行
          </p>
        </div>
      )}

      {!editable && jsonString.includes('//') && (
        <div className="p-2 rounded-md border border-amber-500 bg-amber-50 text-amber-700 text-xs font-medium">
          ℹ️ 注意：被注释掉的动作（以 {'//'} 开头）已被禁用，不会被执行
        </div>
      )}
    </div>
  );
}
