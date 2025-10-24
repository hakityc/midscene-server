import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = '确认操作',
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = () => {
    if (variant === 'destructive') {
      return <AlertTriangle className="h-6 w-6 text-destructive" />;
    }
    return <AlertTriangle className="h-6 w-6 text-amber-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 便捷函数，用于替换原生 confirm
export const confirm = {
  delete: (itemName: string, onConfirm: () => void) => {
    // 这个函数需要在组件中使用，返回一个对话框状态
    return {
      title: '确认删除',
      description: `确定要删除"${itemName}"吗？此操作不可撤销。`,
      confirmText: '删除',
      variant: 'destructive' as const,
      onConfirm,
    };
  },
  action: (title: string, description: string, onConfirm: () => void) => {
    return {
      title,
      description,
      confirmText: '确认',
      variant: 'default' as const,
      onConfirm,
    };
  },
};
