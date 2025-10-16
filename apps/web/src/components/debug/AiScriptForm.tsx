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
import { BookmarkPlus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ClientType, Task } from '@/types/debug';
import { addTemplate, createTemplateFromTasks } from '@/utils/templateStorage';
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

  // 保存为模板的对话框状态
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const nameId = useId();
  const descId = useId();

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

  // 保存为模板
  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      alert('请输入模板名称');
      return;
    }

    if (tasks.length === 0) {
      alert('任务列表为空，无法保存为模板');
      return;
    }

    const template = createTemplateFromTasks(
      tasks,
      templateName.trim(),
      templateDescription.trim() || '自定义任务模板',
      enableLoadingShade,
    );

    addTemplate(template);

    // 重置表单
    setTemplateName('');
    setTemplateDescription('');
    setShowSaveDialog(false);

    // 触发自定义事件通知模板列表刷新
    window.dispatchEvent(new Event('templates-updated'));

    alert('模板保存成功！');
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

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Button
            onClick={addTask}
            className="rounded-none border-2 border-black bg-cyan-300 text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000]"
          >
            <Plus className="h-4 w-4 mr-1" />
            添加任务
          </Button>
          <Button
            onClick={() => setShowSaveDialog(true)}
            disabled={tasks.length === 0}
            variant="outline"
            className="rounded-none border-2 border-black bg-yellow-200 text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000] disabled:opacity-50"
          >
            <BookmarkPlus className="h-4 w-4 mr-1" />
            保存为模板
          </Button>
        </div>
      </div>

      {/* 保存模板对话框 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存为模板</DialogTitle>
            <DialogDescription>
              将当前任务列表保存为可复用的快速模板
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={nameId}>模板名称 *</Label>
              <Input
                id={nameId}
                placeholder="例如：登录流程"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={descId}>模板描述</Label>
              <Textarea
                id={descId}
                placeholder="简要描述这个模板的用途..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveAsTemplate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
