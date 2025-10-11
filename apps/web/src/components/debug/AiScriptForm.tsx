import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Task } from '@/types/debug';
import { TaskItem } from './TaskItem';

interface AiScriptFormProps {
  tasks: Task[];
  enableLoadingShade: boolean;
  onTasksChange: (tasks: Task[]) => void;
  onLoadingShadeChange: (enabled: boolean) => void;
}

export function AiScriptForm({
  tasks,
  enableLoadingShade,
  onTasksChange,
  onLoadingShadeChange,
}: AiScriptFormProps) {
  const addTask = () => {
    const newTask: Task = {
      id: uuidv4(),
      name: '新任务',
      continueOnError: false,
      flow: [],
    };
    onTasksChange([...tasks, newTask]);
  };

  const updateTask = (taskIndex: number, task: Task) => {
    const newTasks = [...tasks];
    newTasks[taskIndex] = task;
    onTasksChange(newTasks);
  };

  const removeTask = (taskIndex: number) => {
    onTasksChange(tasks.filter((_, i) => i !== taskIndex));
  };

  return (
    <div className="space-y-4">
      {/* 任务列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-extrabold">任务列表</Label>
          <span className="text-xs text-gray-500 font-medium">
            {tasks.length} 个任务
          </span>
        </div>

        <div className="space-y-3">
          {tasks.map((task, taskIndex) => (
            <TaskItem
              key={task.id}
              task={task}
              index={taskIndex}
              onChange={(updatedTask) => updateTask(taskIndex, updatedTask)}
              onRemove={() => removeTask(taskIndex)}
            />
          ))}
        </div>

        <Button
          onClick={addTask}
          className="w-full mt-3 rounded-none border-2 border-black bg-cyan-300 text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000]"
        >
          <Plus className="h-4 w-4 mr-1" />
          添加任务
        </Button>
      </div>

      {/* 选项 */}
      <div className="p-3 bg-blue-50 border-2 border-black rounded-none shadow-[3px_3px_0_0_#000]">
        <Label className="text-sm font-extrabold mb-3 block">执行选项</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={enableLoadingShade}
            onCheckedChange={onLoadingShadeChange}
          />
          <Label className="text-xs font-bold">启用 Loading 遮罩</Label>
        </div>
        <p className="text-xs text-gray-600 mt-2 font-medium">
          启用后会在浏览器页面显示加载动画
        </p>
      </div>
    </div>
  );
}
