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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { FlowAction, FlowActionType } from '@/types/debug';
import { GripVertical, Trash2 } from 'lucide-react';

interface FlowActionItemProps {
  action: FlowAction;
  index: number;
  onChange: (action: FlowAction) => void;
  onRemove: () => void;
}

const actionTypeOptions: Array<{ value: FlowActionType; label: string }> = [
  { value: 'aiTap', label: 'AI 点击 (aiTap)' },
  { value: 'aiInput', label: 'AI 输入 (aiInput)' },
  { value: 'aiAssert', label: 'AI 断言 (aiAssert)' },
  { value: 'sleep', label: '等待 (sleep)' },
  { value: 'aiHover', label: 'AI 悬停 (aiHover)' },
  { value: 'aiScroll', label: 'AI 滚动 (aiScroll)' },
  { value: 'aiWaitFor', label: 'AI 等待条件 (aiWaitFor)' },
  { value: 'aiKeyboardPress', label: 'AI 按键 (aiKeyboardPress)' },
];

export function FlowActionItem({ action, index, onChange, onRemove }: FlowActionItemProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...action, [field]: value } as FlowAction);
  };

  const renderFields = () => {
    switch (action.type) {
      case 'aiTap':
        return (
          <>
            <div>
              <Label className="text-xs font-bold">描述 *</Label>
              <Input
                value={action.locate || ''}
                onChange={(e) => updateField('locate', e.target.value)}
                placeholder="例如：搜索图标"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">XPath (可选)</Label>
              <Input
                value={action.xpath || ''}
                onChange={(e) => updateField('xpath', e.target.value)}
                placeholder="//*[@id='...']"
                className="mt-1 h-8 text-xs"
              />
            </div>
          </>
        );

      case 'aiInput':
        return (
          <>
            <div>
              <Label className="text-xs font-bold">输入内容 *</Label>
              <Input
                value={action.value || ''}
                onChange={(e) => updateField('value', e.target.value)}
                placeholder="要输入的文本"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">定位描述 *</Label>
              <Input
                value={action.locate || ''}
                onChange={(e) => updateField('locate', e.target.value)}
                placeholder="例如：搜索输入框"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">XPath (可选)</Label>
              <Input
                value={action.xpath || ''}
                onChange={(e) => updateField('xpath', e.target.value)}
                placeholder="//*[@id='...']"
                className="mt-1 h-8 text-xs"
              />
            </div>
          </>
        );

      case 'aiAssert':
        return (
          <div>
            <Label className="text-xs font-bold">断言描述 *</Label>
            <Textarea
              value={action.assertion || ''}
              onChange={(e) => updateField('assertion', e.target.value)}
              placeholder="例如：页面包含搜索结果"
              className="mt-1 text-xs min-h-[60px]"
            />
          </div>
        );

      case 'sleep':
        return (
          <div>
            <Label className="text-xs font-bold">延迟时间 (毫秒) *</Label>
            <Input
              type="number"
              value={action.duration || 0}
              onChange={(e) => updateField('duration', Number(e.target.value))}
              placeholder="2000"
              min="0"
              className="mt-1 h-8 text-xs"
            />
          </div>
        );

      case 'aiHover':
        return (
          <>
            <div>
              <Label className="text-xs font-bold">描述 *</Label>
              <Input
                value={action.locate || ''}
                onChange={(e) => updateField('locate', e.target.value)}
                placeholder="例如：菜单按钮"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">XPath (可选)</Label>
              <Input
                value={action.xpath || ''}
                onChange={(e) => updateField('xpath', e.target.value)}
                placeholder="//*[@id='...']"
                className="mt-1 h-8 text-xs"
              />
            </div>
          </>
        );

      case 'aiScroll':
        return (
          <>
            <div>
              <Label className="text-xs font-bold">滚动方向 *</Label>
              <Select
                value={action.direction || 'down'}
                onValueChange={(val) => updateField('direction', val)}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">向上</SelectItem>
                  <SelectItem value="down">向下</SelectItem>
                  <SelectItem value="left">向左</SelectItem>
                  <SelectItem value="right">向右</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">滚动类型 *</Label>
              <Select
                value={action.scrollType || 'once'}
                onValueChange={(val) => updateField('scrollType', val)}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">滚动固定距离</SelectItem>
                  <SelectItem value="untilBottom">滚动到底部</SelectItem>
                  <SelectItem value="untilTop">滚动到顶部</SelectItem>
                  <SelectItem value="untilLeft">滚动到最左</SelectItem>
                  <SelectItem value="untilRight">滚动到最右</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {action.scrollType === 'once' && (
              <div>
                <Label className="text-xs font-bold">滚动距离 (像素)</Label>
                <Input
                  type="number"
                  value={action.distance || 0}
                  onChange={(e) => updateField('distance', Number(e.target.value))}
                  placeholder="500"
                  className="mt-1 h-8 text-xs"
                />
              </div>
            )}
            <div>
              <Label className="text-xs font-bold">定位描述 (可选)</Label>
              <Input
                value={action.locate || ''}
                onChange={(e) => updateField('locate', e.target.value)}
                placeholder="滚动的容器元素"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={action.deepThink || false}
                onCheckedChange={(checked) => updateField('deepThink', checked)}
              />
              <Label className="text-xs font-bold">深度思考模式</Label>
            </div>
          </>
        );

      case 'aiWaitFor':
        return (
          <>
            <div>
              <Label className="text-xs font-bold">等待条件 *</Label>
              <Textarea
                value={action.assertion || ''}
                onChange={(e) => updateField('assertion', e.target.value)}
                placeholder="例如：页面加载完成"
                className="mt-1 text-xs min-h-[60px]"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">超时时间 (毫秒)</Label>
              <Input
                type="number"
                value={action.timeoutMs || 15000}
                onChange={(e) => updateField('timeoutMs', Number(e.target.value))}
                placeholder="15000"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">检查间隔 (毫秒)</Label>
              <Input
                type="number"
                value={action.checkIntervalMs || 3000}
                onChange={(e) => updateField('checkIntervalMs', Number(e.target.value))}
                placeholder="3000"
                className="mt-1 h-8 text-xs"
              />
            </div>
          </>
        );

      case 'aiKeyboardPress':
        return (
          <>
            <div>
              <Label className="text-xs font-bold">按键 *</Label>
              <Input
                value={action.key || ''}
                onChange={(e) => updateField('key', e.target.value)}
                placeholder="Enter, Tab, Escape..."
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">定位描述 (可选)</Label>
              <Input
                value={action.locate || ''}
                onChange={(e) => updateField('locate', e.target.value)}
                placeholder="在哪个元素上按键"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={action.deepThink || false}
                onCheckedChange={(checked) => updateField('deepThink', checked)}
              />
              <Label className="text-xs font-bold">深度思考模式</Label>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-3 bg-white border-2 border-black rounded-none shadow-[3px_3px_0_0_#000]">
      <div className="flex items-center gap-2 mb-3">
        <GripVertical className="h-4 w-4 text-gray-400 cursor-move flex-shrink-0" />
        <span className="text-xs font-bold text-gray-500 flex-shrink-0">#{index + 1}</span>
        <Select
          value={action.type}
          onValueChange={(val) =>
            onChange({ type: val } as FlowAction)
          }
        >
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {actionTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={onRemove}
          className="rounded-none border-2 border-black bg-red-200 h-7 px-2 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] flex-shrink-0"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-2">{renderFields()}</div>
    </div>
  );
}

