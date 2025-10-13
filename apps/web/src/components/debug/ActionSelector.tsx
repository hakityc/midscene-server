import { AlertCircle, Loader2, Monitor, Smartphone } from 'lucide-react';
import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientTypeActions } from '@/hooks/useClientTypeActions';
import type { ClientType, WebSocketAction } from '@/types/debug';

interface ActionSelectorProps {
  value: WebSocketAction;
  onChange: (value: WebSocketAction) => void;
  clientType: ClientType;
}

export function ActionSelector({
  value,
  onChange,
  clientType,
}: ActionSelectorProps) {
  const {
    loading,
    error,
    getActionsForClientType,
    getActionsByCategory,
    isActionSupported,
  } = useClientTypeActions();

  // 获取当前客户端类型的可用 actions
  const availableActions = useMemo(
    () => getActionsForClientType(clientType),
    [clientType, getActionsForClientType],
  );

  // 按类别分组
  const actionsByCategory = useMemo(
    () => getActionsByCategory(clientType),
    [clientType, getActionsByCategory],
  );

  // 当前选中的 action 配置
  const selectedAction = useMemo(
    () => availableActions.find((act) => act.action === value),
    [value, availableActions],
  );

  // 检查当前选中的 action 是否被支持
  const isCurrentActionSupported = isActionSupported(clientType, value);

  // 获取客户端图标
  const getClientIcon = () => {
    return clientType === 'windows' ? (
      <Monitor className="h-3 w-3" />
    ) : (
      <Smartphone className="h-3 w-3" />
    );
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-semibold">选择 Action 类型</Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            加载可用操作...
          </span>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-semibold">选择 Action 类型</Label>
        <div className="flex items-center gap-2 p-3 border rounded-md border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">
            加载失败: {error}
          </span>
        </div>
      </div>
    );
  }

  // 如果当前 action 不被支持，显示警告
  const showWarning = !isCurrentActionSupported && value;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold flex items-center gap-2">
        选择 Action 类型
        {getClientIcon()}
        <span className="text-xs font-normal text-muted-foreground">
          ({clientType} 端)
        </span>
      </Label>

      <Select
        value={value}
        onValueChange={(val) => onChange(val as WebSocketAction)}
      >
        <SelectTrigger>
          <SelectValue placeholder="选择一个 Action" />
        </SelectTrigger>
        <SelectContent>
          {/* 基础操作 */}
          {actionsByCategory.basic.length > 0 && (
            <SelectGroup>
              <SelectLabel>基础操作</SelectLabel>
              {actionsByCategory.basic.map((action) => (
                <SelectItem key={action.action} value={action.action}>
                  {action.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* 高级操作 */}
          {actionsByCategory.advanced.length > 0 && (
            <SelectGroup>
              <SelectLabel>高级操作</SelectLabel>
              {actionsByCategory.advanced.map((action) => (
                <SelectItem key={action.action} value={action.action}>
                  {action.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* 系统操作 */}
          {actionsByCategory.system.length > 0 && (
            <SelectGroup>
              <SelectLabel>系统操作</SelectLabel>
              {actionsByCategory.system.map((action) => (
                <SelectItem key={action.action} value={action.action}>
                  {action.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>

      {/* 显示选中 action 的描述 */}
      {selectedAction && !showWarning && (
        <p className="text-xs text-muted-foreground mt-1">
          💡 {selectedAction.description}
        </p>
      )}

      {/* 显示不支持警告 */}
      {showWarning && (
        <div className="flex items-start gap-2 p-2 border rounded-md border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-yellow-700">
            <p className="font-medium">
              当前 Action "{value}" 不支持 {clientType} 端
            </p>
            <p className="mt-1">
              请选择其他 Action 或切换客户端类型
            </p>
          </div>
        </div>
      )}

      {/* 显示可用操作数量 */}
      <p className="text-xs text-muted-foreground">
        📊 {clientType} 端支持 {availableActions.length} 个操作
      </p>
    </div>
  );
}
