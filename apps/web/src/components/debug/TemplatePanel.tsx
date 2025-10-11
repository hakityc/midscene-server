import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Template } from '@/types/debug';
import { BookTemplate, Upload } from 'lucide-react';

interface TemplatePanelProps {
  templates: Template[];
  onLoad: (template: Template) => void;
}

export function TemplatePanel({ templates, onLoad }: TemplatePanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">快速模板</CardTitle>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <BookTemplate className="h-8 w-8 mx-auto mb-2 opacity-50" />
            暂无模板
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLoad(template)}
                    className="flex-shrink-0"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    使用
                  </Button>
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
