import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  ChevronDown,
  GripVertical,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { VariableInput } from '@/components/ui/variable-input';
import { VariableTextarea } from '@/components/ui/variable-textarea';
import {
  type FlowActionConfig,
  useClientTypeFlowActions,
} from '@/hooks/useClientTypeFlowActions';
import type { ClientType, FlowAction } from '@/types/debug';

interface FlowActionItemProps {
  action: FlowAction;
  index: number;
  onChange: (action: FlowAction) => void;
  onRemove: () => void;
  clientType: ClientType;
}

export function FlowActionItem({
  action,
  index,
  onChange,
  onRemove,
  clientType,
}: FlowActionItemProps) {
  const {
    loading,
    error,
    getFlowActionsByCategory,
    getCategoryLabel,
    getFlowActionConfig,
    getMainParams,
    getOptionParams,
    hasOptions: checkHasOptions,
  } = useClientTypeFlowActions();

  // 使用 useSortable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id || `action-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 按类别分组
  const actionsByCategory = useMemo(
    () => getFlowActionsByCategory(clientType),
    [clientType, getFlowActionsByCategory],
  );

  // 获取当前 action 的配置
  const actionConfig = useMemo(
    () => getFlowActionConfig(clientType, action.type),
    [clientType, action.type, getFlowActionConfig],
  );

  // 获取主要参数和 options 参数
  const mainParams = useMemo(
    () => getMainParams(clientType, action.type),
    [clientType, action.type, getMainParams],
  );

  const optionParams = useMemo(
    () => getOptionParams(clientType, action.type),
    [clientType, action.type, getOptionParams],
  );

  const hasOptionsParams = useMemo(
    () => checkHasOptions(clientType, action.type),
    [clientType, action.type, checkHasOptions],
  );

  // 控制 options 面板展开/收起
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  // 验证错误状态
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const updateField = (field: string, value: unknown) => {
    onChange({ ...action, [field]: value } as FlowAction);
    // 清除该字段的验证错误
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 验证必填字段
  const validateField = (param: FlowActionConfig['params'][0]) => {
    if (!param.required) return;

    const value = (action as any)[param.name];
    const isEmpty = value === undefined || value === null || value === '';

    if (isEmpty) {
      setValidationErrors((prev) => ({
        ...prev,
        [param.name]: `${param.label}不能为空`,
      }));
    } else {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[param.name];
        return newErrors;
      });
    }
  };

  /**
   * 根据参数配置渲染单个输入框
   */
  const renderParamInput = (param: FlowActionConfig['params'][0]) => {
    const value = (action as any)[param.name];
    const label = `${param.label}${param.required ? ' *' : ''}`;
    const hasError = !!validationErrors[param.name];

    switch (param.type) {
      case 'string':
        // 对于较长的文本，使用 VariableTextarea（支持变量）
        if (
          param.name === 'assertion' ||
          param.description?.includes('描述') ||
          param.name === 'code'
        ) {
          return (
            <div key={param.name}>
              <Label className="text-xs font-bold">{label}</Label>
              <VariableTextarea
                value={value || ''}
                onChange={(newValue) => {
                  // 非必填字段：空字符串转为 undefined
                  // 必填字段：保留空字符串（让验证逻辑处理）
                  const finalValue =
                    !param.required && newValue === '' ? undefined : newValue;
                  updateField(param.name, finalValue);
                }}
                placeholder={param.placeholder}
                className={`mt-1 font-mono text-xs ${
                  hasError
                    ? 'border-red-500 [&>div]:focus-within:ring-red-500'
                    : ''
                }`}
                rows={param.name === 'code' ? 8 : 3}
              />
              {hasError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors[param.name]}
                </p>
              )}
              {!hasError && param.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {param.description}
                </p>
              )}
            </div>
          );
        }
        // 普通文本输入 - 使用 VariableInput（支持变量）
        return (
          <div key={param.name}>
            <Label className="text-xs font-bold">{label}</Label>
            <VariableInput
              value={value || ''}
              onChange={(newValue) => {
                // 非必填字段：空字符串转为 undefined
                // 必填字段：保留空字符串（让验证逻辑处理）
                const finalValue =
                  !param.required && newValue === '' ? undefined : newValue;
                updateField(param.name, finalValue);
              }}
              placeholder={param.placeholder}
              className={`mt-1 ${
                hasError
                  ? 'border-red-500 [&>div]:focus-within:ring-red-500'
                  : ''
              }`}
            />
            {hasError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors[param.name]}
              </p>
            )}
            {!hasError && param.description && (
              <p className="text-xs text-gray-500 mt-1">{param.description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={param.name}>
            <Label className="text-xs font-bold">{label}</Label>
            <Input
              type="number"
              value={value ?? ''}
              onChange={(e) => {
                const inputValue = e.target.value;
                // 如果输入为空，设置为 undefined（不传该字段给后端）
                if (inputValue === '') {
                  updateField(param.name, undefined);
                } else {
                  updateField(param.name, Number(inputValue));
                }
              }}
              onBlur={() => validateField(param)}
              placeholder={param.placeholder}
              min="0"
              className={`mt-1 h-8 text-xs ${
                hasError ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            {hasError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors[param.name]}
              </p>
            )}
            {!hasError && param.description && (
              <p className="text-xs text-gray-500 mt-1">{param.description}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={param.name} className="flex items-center gap-2">
            <Switch
              checked={value ?? param.defaultValue ?? false}
              onCheckedChange={(checked) => {
                // 如果值等于默认值，设置为 undefined（不传给后端）
                // 否则传递实际值
                const finalValue =
                  checked === (param.defaultValue ?? false)
                    ? undefined
                    : checked;
                updateField(param.name, finalValue);
              }}
            />
            <Label className="text-xs font-bold">{label}</Label>
            {param.description && (
              <p className="text-xs text-gray-500 ml-2">{param.description}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  /**
   * 渲染所有字段（使用配置驱动）
   */
  const renderFields = () => {
    if (!actionConfig) return null;

    return (
      <>
        {/* 主要参数 */}
        <div className="space-y-2">
          {mainParams.map((param) => renderParamInput(param))}
        </div>

        {/* Options 参数（可折叠） */}
        {hasOptionsParams && optionParams.length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={() => setOptionsExpanded(!optionsExpanded)}
              className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-gray-900"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  optionsExpanded ? 'rotate-180' : ''
                }`}
              />
              高级选项
            </button>
            {optionsExpanded && (
              <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                {optionParams.map((param) => renderParamInput(param))}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  const isEnabled = action.enabled !== false; // 默认为 true

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 border-2 border-black rounded-none shadow-[3px_3px_0_0_#000] ${
        isEnabled ? 'bg-white' : 'bg-gray-200 opacity-75'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center justify-center"
        >
          <GripVertical className="h-4 w-4 text-gray-600 flex-shrink-0" />
        </div>
        <span className="text-xs font-bold text-gray-500 flex-shrink-0">
          #{index + 1}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => updateField('enabled', checked)}
            className="scale-75"
          />
          <span className="text-xs font-medium text-gray-600">
            {isEnabled ? '已启用' : '已禁用'}
          </span>
        </div>
        <Select
          value={action.type}
          onValueChange={(val) => onChange({ type: val } as FlowAction)}
        >
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">加载中...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center p-2 text-destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="text-xs">加载失败</span>
              </div>
            ) : (
              <>
                {Object.entries(actionsByCategory).map(
                  ([category, actions]) => {
                    if (actions.length === 0) return null;
                    return (
                      <SelectGroup key={category}>
                        <SelectLabel>
                          {getCategoryLabel(category as any)}
                        </SelectLabel>
                        {actions.map((cfg) => (
                          <SelectItem key={cfg.type} value={cfg.type}>
                            {cfg.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  },
                )}
              </>
            )}
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
