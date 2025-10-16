import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ClientType, Task } from '@/types/debug';
import { TaskItem } from './TaskItem';

interface AiScriptFormProps {
  tasks: Task[];
  enableLoadingShade: boolean;
  onTasksChange: (tasks: Task[]) => void;
  onLoadingShadeChange: (enabled: boolean) => void;
  clientType: ClientType;
}

export function AiScriptForm({
  tasks,
  enableLoadingShade,
  onTasksChange,
  onLoadingShadeChange,
  clientType,
}: AiScriptFormProps) {
  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  // 处理拖拽结束事件
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id);
      const newIndex = tasks.findIndex((task) => task.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onTasksChange(arrayMove(tasks, oldIndex, newIndex));
      }
    }
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {tasks.map((task, taskIndex) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={taskIndex}
                  onChange={(updatedTask) => updateTask(taskIndex, updatedTask)}
                  onRemove={() => removeTask(taskIndex)}
                  clientType={clientType}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex mt-3 w-full">
          <Button
            onClick={addTask}
            className="rounded-none border-2 flex-1 border-black bg-cyan-300 text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000]"
          >
            <Plus className="h-4 w-4 mr-1" />
            添加任务
          </Button>
        </div>
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
