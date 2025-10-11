import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HistoryItem } from '@/types/debug';
import { format } from 'date-fns';
import { Clock, Trash2, Upload } from 'lucide-react';

interface HistoryPanelProps {
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function HistoryPanel({ history, onLoad, onRemove, onClear }: HistoryPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">历史记录</CardTitle>
          <Button
            size="sm"
            variant="destructive"
            onClick={onClear}
            disabled={history.length === 0}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            清空
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            暂无历史记录
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-card border rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {item.label || item.message.payload.action}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(item.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onLoad(item)}
                      className="h-7 w-7 p-0"
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRemove(item.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 border rounded-md">
                  {item.message.payload.action}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
