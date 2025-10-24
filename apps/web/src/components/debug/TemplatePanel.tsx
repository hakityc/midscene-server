import {
  BookTemplate,
  Monitor,
  Pencil,
  Trash2,
  Upload,
  AppWindowIcon as Window,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import type { ClientType, Template } from '@/types/debug';
import {
  deleteTemplate,
  getAllTemplates,
  updateTemplate,
} from '@/utils/templateStorage';

interface TemplatePanelProps {
  onLoad: (template: Template) => void;
}

export function TemplatePanel({ onLoad }: TemplatePanelProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedClientType, setSelectedClientType] = useState<
    ClientType | 'all'
  >('all');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    templateId: string;
    templateName: string;
  }>({
    open: false,
    templateId: '',
    templateName: '',
  });

  // 加载模板
  const loadTemplates = () => {
    setTemplates(getAllTemplates());
  };

  // 按客户端类型筛选模板（没有 clientType 的旧模板默认为 web）
  const filteredTemplates = templates.filter((template) => {
    if (selectedClientType === 'all') return true;
    const templateClientType = template.clientType || 'web';
    return templateClientType === selectedClientType;
  });

  // 初始加载和监听更新
  useEffect(() => {
    loadTemplates();

    // 监听模板更新事件
    const handleTemplatesUpdated = () => {
      loadTemplates();
    };

    window.addEventListener('templates-updated', handleTemplatesUpdated);

    return () => {
      window.removeEventListener('templates-updated', handleTemplatesUpdated);
    };
  }, []);

  // 显示删除确认对话框
  const handleDelete = (templateId: string, templateName: string) => {
    setDeleteDialog({
      open: true,
      templateId,
      templateName,
    });
  };

  // 确认删除模板
  const confirmDelete = () => {
    deleteTemplate(deleteDialog.templateId);
    loadTemplates();
    window.dispatchEvent(new Event('templates-updated'));
    toast.success('删除成功', `模板"${deleteDialog.templateName}"已删除`);
    setDeleteDialog({
      open: false,
      templateId: '',
      templateName: '',
    });
  };

  // 更新模板的客户端类型
  const handleUpdateClientType = (
    templateId: string,
    templateName: string,
    newClientType: ClientType,
  ) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    // 更新模板的 clientType
    template.clientType = newClientType;
    // 同时更新消息元数据中的 clientType
    if (template.message.meta) {
      template.message.meta.clientType = newClientType;
    }

    updateTemplate(templateId, template);
    loadTemplates();
    window.dispatchEvent(new Event('templates-updated'));
    toast.success(
      '更新成功',
      `模板"${templateName}"已更新为 ${newClientType === 'windows' ? 'Windows' : 'Web'} 端`,
    );
  };

  // 获取端类型图标和样式
  const getClientTypeInfo = (clientType?: ClientType) => {
    const type = clientType || 'web';
    if (type === 'windows') {
      return {
        icon: <Window className="h-3 w-3" />,
        label: 'Windows',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
      };
    }
    return {
      icon: <Monitor className="h-3 w-3" />,
      label: 'Web',
      color:
        'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">快速模板</CardTitle>
          <span className="text-xs text-muted-foreground">
            {filteredTemplates.length} / {templates.length} 个模板
          </span>
        </div>
        {/* 端类型筛选按钮 */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant={selectedClientType === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedClientType('all')}
            className="text-xs h-7"
          >
            全部
          </Button>
          <Button
            size="sm"
            variant={selectedClientType === 'web' ? 'default' : 'outline'}
            onClick={() => setSelectedClientType('web')}
            className="text-xs h-7"
          >
            <Monitor className="h-3 w-3 mr-1" />
            Web
          </Button>
          <Button
            size="sm"
            variant={selectedClientType === 'windows' ? 'default' : 'outline'}
            onClick={() => setSelectedClientType('windows')}
            className="text-xs h-7"
          >
            <Window className="h-3 w-3 mr-1" />
            Windows
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <BookTemplate className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>
              暂无
              {selectedClientType === 'all'
                ? ''
                : selectedClientType === 'web'
                  ? ' Web 端'
                  : ' Windows 端'}
              模板
            </p>
            <p className="text-xs mt-2">在任务列表中点击"保存为模板"创建模板</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map((template) => {
              const clientTypeInfo = getClientTypeInfo(template.clientType);
              return (
                <div
                  key={template.id}
                  className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold text-sm">
                          {template.name}
                        </div>
                        {/* 客户端类型标签 */}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${clientTypeInfo.color}`}
                        >
                          {clientTypeInfo.icon}
                          {clientTypeInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onLoad(template);
                          toast.success(
                            '模板加载成功',
                            `已加载模板"${template.name}"`,
                          );
                        }}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        使用
                      </Button>
                      {/* 编辑客户端类型下拉菜单 */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateClientType(
                                template.id,
                                template.name,
                                'web',
                              )
                            }
                            disabled={
                              template.clientType === 'web' ||
                              !template.clientType
                            }
                          >
                            <Monitor className="h-3 w-3 mr-2" />
                            设为 Web 端
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateClientType(
                                template.id,
                                template.name,
                                'windows',
                              )
                            }
                            disabled={template.clientType === 'windows'}
                          >
                            <Window className="h-3 w-3 mr-2" />
                            设为 Windows 端
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(template.id, template.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 bg-background/70 border rounded-md font-mono">
                    {template.action}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title="确认删除模板"
        description={`确定要删除模板"${deleteDialog.templateName}"吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
