import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ClientType, FlowAction, Task } from '@/types/debug';
import { FlowActionItem } from './FlowActionItem';

interface TaskItemProps {
  task: Task;
  index: number;
  onChange: (task: Task) => void;
  onRemove: () => void;
  clientType: ClientType;
}

export function TaskItem({
  task,
  index,
  onChange,
  onRemove,
  clientType,
}: TaskItemProps) {
  const [collapsed, setCollapsed] = useState(false);

  const updateTask = (field: keyof Task, value: unknown) => {
    onChange({ ...task, [field]: value });
  };

  const addAction = () => {
    const newAction: FlowAction = {
      type: 'aiTap',
      locate: '',
    };
    updateTask('flow', [...task.flow, newAction]);
  };

  const updateAction = (actionIndex: number, action: FlowAction) => {
    const newFlow = [...task.flow];
    newFlow[actionIndex] = action;
    updateTask('flow', newFlow);
  };

  const removeAction = (actionIndex: number) => {
    updateTask(
      'flow',
      task.flow.filter((_, i) => i !== actionIndex),
    );
  };

  return (
    <div className="p-4 bg-amber-50 border-2 border-black rounded-none shadow-[4px_4px_0_0_#000]">
      {/* 任务头部 */}
      <div className="flex items-start gap-3 mb-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCollapsed(!collapsed)}
          className="h-6 w-6 p-0 hover:bg-amber-200"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold">任务 {index + 1}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={onRemove}
              className="rounded-none border-2 border-black bg-red-200 h-6 px-2 text-xs font-bold shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] ml-auto"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              删除任务
            </Button>
          </div>

          {!collapsed && (
            <>
              <div>
                <Label className="text-xs font-bold">任务名称 *</Label>
                <Input
                  value={task.name}
                  onChange={(e) => updateTask('name', e.target.value)}
                  placeholder="例如：搜索文档"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={task.continueOnError}
                  onCheckedChange={(checked) =>
                    updateTask('continueOnError', checked)
                  }
                />
                <Label className="text-xs font-bold">失败时继续执行</Label>
              </div>

              {/* 动作列表 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold">动作流程</Label>
                  <span className="text-xs text-gray-500 font-medium">
                    {task.flow.length} 个动作
                  </span>
                </div>

                <div className="space-y-2">
                  {task.flow.map((action, actionIndex) => (
                    <FlowActionItem
                      key={actionIndex}
                      action={action}
                      index={actionIndex}
                      onChange={(updatedAction) =>
                        updateAction(actionIndex, updatedAction)
                      }
                      onRemove={() => removeAction(actionIndex)}
                      clientType={clientType}
                    />
                  ))}
                </div>

                <Button
                  onClick={addAction}
                  className="w-full mt-3 rounded-none border-2 border-black bg-lime-300 text-black font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] h-8 text-xs"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加动作
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
