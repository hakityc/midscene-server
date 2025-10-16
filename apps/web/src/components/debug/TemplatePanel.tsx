import { BookTemplate, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import type { Template } from '@/types/debug';
import { deleteTemplate, getAllTemplates } from '@/utils/templateStorage';

interface TemplatePanelProps {
  onLoad: (template: Template) => void;
}

export function TemplatePanel({ onLoad }: TemplatePanelProps) {
  const [templates, setTemplates] = useState<Template[]>([]);

  // 加载模板
  const loadTemplates = () => {
    setTemplates(getAllTemplates());
  };

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

  // 删除模板
  const handleDelete = (templateId: string, templateName: string) => {
    if (confirm(`确定要删除模板"${templateName}"吗？`)) {
      deleteTemplate(templateId);
      loadTemplates();
      window.dispatchEvent(new Event('templates-updated'));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">快速模板</CardTitle>
          <span className="text-xs text-muted-foreground">
            {templates.length} 个模板
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <BookTemplate className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>暂无模板</p>
            <p className="text-xs mt-2">在任务列表中点击"保存为模板"创建模板</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{template.name}</div>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(template.id, template.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      删除
                    </Button>
                  </div>
                </div>
                <div className="text-xs px-2 py-1 bg-background/70 border rounded-md font-mono">
                  {template.action}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
