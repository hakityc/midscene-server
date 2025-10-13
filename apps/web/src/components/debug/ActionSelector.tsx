import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WebSocketAction } from '@/types/debug';

interface ActionSelectorProps {
  value: WebSocketAction;
  onChange: (value: WebSocketAction) => void;
}

const actionOptions: Array<{
  value: WebSocketAction;
  label: string;
  description: string;
}> = [
  {
    value: 'aiScript',
    label: 'AI Script',
    description: '执行复杂的 AI 任务流程，支持多个步骤和条件',
  },
  {
    value: 'ai',
    label: 'AI (简单)',
    description: '执行简单的 AI 指令',
  },
  {
    value: 'siteScript',
    label: 'Site Script',
    description: '在网站上执行 JavaScript 代码',
  },
  {
    value: 'command',
    label: 'Command',
    description: '执行控制命令 (start, stop 等)',
  },
  {
    value: 'connectTab',
    label: 'Connect Tab',
    description: '连接到浏览器标签页',
  },
  {
    value: 'agent',
    label: 'Agent',
    description: '执行 Agent 任务',
  },
];

export function ActionSelector({ value, onChange }: ActionSelectorProps) {
  const selectedOption = actionOptions.find((opt) => opt.value === value);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">选择 Action 类型</Label>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as WebSocketAction)}
      >
        <SelectTrigger>
          <SelectValue placeholder="选择一个 Action" />
        </SelectTrigger>
        <SelectContent>
          {actionOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedOption && (
        <p className="text-xs text-muted-foreground mt-1">
          💡 {selectedOption.description}
        </p>
      )}
    </div>
  );
}
