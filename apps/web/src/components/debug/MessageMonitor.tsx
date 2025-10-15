import { format } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  Info,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import type { MonitorMessage } from '@/types/debug';
import { getLatestReport, getReportFileUrl } from '@/utils/api';

interface MessageMonitorProps {
  messages: MonitorMessage[];
  onClear: () => void;
  status: 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error';
  onConnect: () => void;
}

export function MessageMonitor({
  messages,
  onClear,
  status,
  onConnect,
}: MessageMonitorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getIcon = (
    direction: MonitorMessage['direction'],
    type: MonitorMessage['type'],
  ) => {
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

  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const exportMessages = () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `messages-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const openLatestReport = async () => {
    setIsLoadingReport(true);
    try {
      const reportInfo = await getLatestReport();
      const reportUrl = getReportFileUrl(reportInfo.fileName);
      window.open(reportUrl, '_blank');
      toast.success('报告已打开', '报告已在新的标签页中打开');
    } catch (error) {
      console.error('打开报告失败:', error);
      toast.error('打开报告失败', '请确保后端服务正常运行');
    } finally {
      setIsLoadingReport(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">消息监控</CardTitle>
            <div className="flex items-center gap-1">
              {status === 'open' ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">已连接</span>
                </div>
              ) : status === 'connecting' ? (
                <div className="flex items-center gap-1 text-yellow-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-xs">连接中</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs">未连接</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onConnect}
              disabled={status === 'connecting'}
            >
              {status === 'open' ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  重连
                </>
              ) : status === 'connecting' ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  连接中
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  连接
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={openLatestReport}
              disabled={isLoadingReport}
              title="打开最新的 Midscene 报告"
            >
              {isLoadingReport ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  加载中
                </>
              ) : (
                <>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  报告
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportMessages}
              disabled={messages.length === 0}
              title="导出消息记录为 JSON"
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
                onClick={() =>
                  setExpandedId(expandedId === message.id ? null : message.id)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setExpandedId(
                      expandedId === message.id ? null : message.id,
                    );
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {getIcon(message.direction, message.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-xs">
                        {format(message.timestamp, 'HH:mm:ss')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-background/50 border">
                        {message.direction === 'sent' ? '📤 发送' : '📥 接收'}
                      </span>
                    </div>
                    <p className="text-xs break-words whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    {expandedId === message.id && message.data ? (
                      <div className="mt-2 space-y-2">
                        <div className="text-xs text-muted-foreground font-medium">
                          详细数据:
                        </div>
                        <pre className="p-2 bg-background/70 border rounded-md text-xs overflow-x-auto font-mono">
                          {JSON.stringify(message.data, null, 2)}
                        </pre>
                      </div>
                    ) : null}
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
