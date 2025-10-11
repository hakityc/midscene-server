import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WsInboundMessage } from '@/types/debug';
import { validateJson } from '@/utils/messageBuilder';
import { CheckCircle2, Copy, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface JsonPreviewProps {
  message: WsInboundMessage;
  editable?: boolean;
  onEdit?: (message: WsInboundMessage) => void;
}

export function JsonPreview({ message, editable = false, onEdit }: JsonPreviewProps) {
  const [jsonString, setJsonString] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const formatted = JSON.stringify(message, null, 2);
    setJsonString(formatted);
    setIsValid(true);
    setError('');
  }, [message]);

  const handleChange = (value: string) => {
    setJsonString(value);
    const validation = validateJson(value);
    setIsValid(validation.isValid);
    setError(validation.error || '');

    if (validation.isValid && validation.parsed && onEdit) {
      onEdit(validation.parsed as WsInboundMessage);
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">JSON 预览</Label>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
          >
            <Copy className="h-3 w-3 mr-1" />
            {copied ? '已复制!' : '复制'}
          </Button>
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border ${
              isValid ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400'
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
        <p className="text-xs text-muted-foreground">
          💡 编辑 JSON 会同步更新表单
        </p>
      )}
    </div>
  );
}
