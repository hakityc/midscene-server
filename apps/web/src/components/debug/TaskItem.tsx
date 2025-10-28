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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import type { ClientType, FlowAction, Task } from '@/types/debug';
import { addTemplate, createTemplateFromTasks } from '@/utils/templateStorage';
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

  // 确保所有动作都有稳定的 ID
  const flowWithIds = useMemo(() => {
    return task.flow.map((action): FlowAction & { id: string } => ({
      ...action,
      id: action.id || uuidv4(),
    }));
  }, [task.flow]);

  // 任务拖拽 hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 动作拖拽传感器配置
  const actionSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const updateTask = (field: keyof Task, value: unknown) => {
    onChange({ ...task, [field]: value });
  };

  const addAction = () => {
    const newAction: FlowAction = {
      id: uuidv4(),
      type: 'aiTap',
      locate: '',
      enabled: true,
    };
    updateTask('flow', [...flowWithIds, newAction]);
  };

  const updateAction = (
    actionIndex: number,
    action: FlowAction & { id: string },
  ) => {
    const newFlow = [...flowWithIds];
    newFlow[actionIndex] = action;
    updateTask('flow', newFlow);
  };

  const removeAction = (actionIndex: number) => {
    updateTask(
      'flow',
      flowWithIds.filter((_, i) => i !== actionIndex),
    );
  };

  // 处理动作拖拽结束
  const handleActionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = flowWithIds.findIndex(
        (action) => action.id === active.id,
      );
      const newIndex = flowWithIds.findIndex((action) => action.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        updateTask('flow', arrayMove(flowWithIds, oldIndex, newIndex));
      }
    }
  };

  // 保存为模板
  const handleSaveAsTemplate = () => {
    if (!task.name.trim()) {
      toast.warning('保存失败', '请输入任务名称');
      return;
    }

    if (task.flow.length === 0) {
      toast.warning('保存失败', '任务流程为空，无法保存为模板');
      return;
    }

    // 创建包含单个任务的模板
    const template = createTemplateFromTasks(
      [task], // 单个任务数组
      task.name.trim(), // 使用任务名称作为模板名称
      `基于任务"${task.name}"的流程模板`, // 自动生成描述
      false, // 默认不启用加载遮罩
      clientType, // 传入客户端类型
    );

    addTemplate(template);

    // 触发自定义事件通知模板列表刷新
    window.dispatchEvent(new Event('templates-updated'));

    toast.success('模板保存成功', `任务"${task.name}"已保存为模板`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 bg-amber-50 border-2 border-black rounded-none shadow-[4px_4px_0_0_#000]"
    >
      {/* 任务头部 */}
      <div className="flex items-start gap-3 mb-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center justify-center h-6 w-6 hover:bg-amber-200 rounded"
        >
          <GripVertical className="h-4 w-4 text-gray-600" />
        </div>
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
              onClick={handleSaveAsTemplate}
              className="rounded-none border-2 border-black bg-yellow-200   h-6 px-2 text-xs font-bold shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] ml-auto"
            >
              <BookmarkPlus className="h-4 w-4 mr-1" />
              保存为模板
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRemove}
              className="rounded-none border-2 border-black bg-red-200 h-6 px-2 text-xs font-bold shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000]"
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
                    {flowWithIds.length} 个动作
                  </span>
                </div>

                <DndContext
                  sensors={actionSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleActionDragEnd}
                >
                  <SortableContext
                    items={flowWithIds.map((action) => action.id as string)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {flowWithIds.map((action, actionIndex) => (
                        <FlowActionItem
                          key={action.id}
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
                  </SortableContext>
                </DndContext>

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
