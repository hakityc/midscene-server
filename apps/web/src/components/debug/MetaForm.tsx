import { Monitor, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClientType, MessageMeta } from '@/types/debug';

interface MetaFormProps {
  meta: MessageMeta;
  onChange: (meta: MessageMeta) => void;
  onRefreshMessageId: () => void;
}

export function MetaForm({
  meta,
  onChange,
  onRefreshMessageId,
}: MetaFormProps) {
  const updateField = (field: keyof MessageMeta, value: string | number) => {
    onChange({ ...meta, [field]: value });
  };

  const updateClientType = (value: ClientType | 'auto') => {
    if (value === 'auto') {
      // 移除 clientType，让服务端自动识别为 web
      const { clientType: _clientType, ...restMeta } = meta;
      onChange(restMeta as MessageMeta);
    } else {
      onChange({ ...meta, clientType: value });
    }
  };

  const getClientTypeIcon = () => {
    const clientType = meta.clientType || 'web';
    return clientType === 'windows' ? (
      <Monitor className="h-4 w-4" />
    ) : (
      <Smartphone className="h-4 w-4" />
    );
  };

  return (
    <div className="p-4 bg-muted/50 border rounded-lg space-y-3">
      <Label className="text-sm font-semibold block">消息元数据</Label>

      <div>
        <Label className="text-xs font-medium flex items-center gap-2">
          客户端类型
          {getClientTypeIcon()}
        </Label>
        <Select
          value={meta.clientType || 'auto'}
          onValueChange={(value) =>
            updateClientType(value as ClientType | 'auto')
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择客户端类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">
              <div className="flex items-center gap-2">
                <Smartphone className="h-3 w-3" />
                <span>自动（Web）</span>
              </div>
            </SelectItem>
            <SelectItem value="web">
              <div className="flex items-center gap-2">
                <Smartphone className="h-3 w-3" />
                <span>Web 端</span>
              </div>
            </SelectItem>
            <SelectItem value="windows">
              <div className="flex items-center gap-2">
                <Monitor className="h-3 w-3" />
                <span>Windows 端</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          💡 选择目标客户端类型（自动 = Web）
        </p>
      </div>

      <div>
        <Label className="text-xs font-medium">Conversation ID</Label>
        <Input
          value={meta.conversationId}
          onChange={(e) => updateField('conversationId', e.target.value)}
          placeholder="会话 ID"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          💡 用于关联同一对话的多个消息
        </p>
      </div>

      <div>
        <Label className="text-xs font-medium">Message ID</Label>
        <div className="flex gap-2 mt-1">
          <Input value={meta.messageId} readOnly className="flex-1 bg-muted" />
          <Button
            size="sm"
            variant="outline"
            onClick={onRefreshMessageId}
            className="px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          💡 每条消息的唯一标识（自动生成）
        </p>
      </div>

      <div>
        <Label className="text-xs font-medium">Timestamp</Label>
        <Input
          value={new Date(meta.timestamp).toLocaleString('zh-CN')}
          readOnly
          className="mt-1 bg-muted"
        />
      </div>
    </div>
  );
}
