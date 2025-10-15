import { CheckCircle2, Clipboard, Copy, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WsInboundMessage } from '@/types/debug';
import { validateJson } from '@/utils/messageBuilder';

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
    const formatted = JSON.stringify(params, null, 2);
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
        </div>
      )}
    </div>
  );
}
