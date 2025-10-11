import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonitorMessage } from '@/types/debug';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Download, Info, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';

interface MessageMonitorProps {
  messages: MonitorMessage[];
  onClear: () => void;
}

export function MessageMonitor({ messages, onClear }: MessageMonitorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getIcon = (direction: MonitorMessage['direction'], type: MonitorMessage['type']) => {
    if (direction === 'sent') return <ArrowUp className="h-4 w-4" />;
    if (direction === 'received') return <ArrowDown className="h-4 w-4" />;
    if (type === 'error') return <XCircle className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  const getColor = (type: MonitorMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
    }
  };

  const exportMessages = () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `messages-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">消息监控</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportMessages}
              disabled={messages.length === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              导出
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onClear}
              disabled={messages.length === 0}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              清空
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            暂无消息
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg border ${getColor(message.type)} text-sm transition-all cursor-pointer hover:shadow-md`}
                onClick={() => setExpandedId(expandedId === message.id ? null : message.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{getIcon(message.direction, message.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-xs">
                        {format(message.timestamp, 'HH:mm:ss')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-background/50 border">
                        {message.direction === 'sent' ? '发送' : '接收'}
                      </span>
                    </div>
                    <p className="text-xs break-words">{message.content}</p>
                    {expandedId === message.id && message.data && (
                      <pre className="mt-2 p-2 bg-background/70 border rounded-md text-xs overflow-x-auto font-mono">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
