import { format } from 'date-fns';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Loader2,
  Pause,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { MonitorMessage, TaskStatus } from '@/types/debug';
import { getLatestReport, getReportFileUrl } from '@/utils/api';

interface FloatingMessageMonitorProps {
  messages: MonitorMessage[];
  onClear: () => void;
  onClearCompleted?: () => void;
  status: 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error';
  onConnect: () => void;
  onRetryTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
}

export function FloatingMessageMonitor({
  messages,
  onClear,
  onClearCompleted,
  status,
  onConnect,
  onRetryTask,
  onCancelTask,
}: FloatingMessageMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNotificationPaused, setIsNotificationPaused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [showClearMenu, setShowClearMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string>('');

  // 计算未读消息数
  useEffect(() => {
    const unread = messages.filter((m) => !m.isRead).length;
    setUnreadCount(unread);
  }, [messages]);

  // 新消息到达时的抖动效果
  useEffect(() => {
    if (messages.length > 0 && messages[0].id !== lastMessageIdRef.current) {
      lastMessageIdRef.current = messages[0].id;
      if (!isExpanded && containerRef.current) {
        containerRef.current.classList.add('shake');
        setTimeout(() => {
          containerRef.current?.classList.remove('shake');
        }, 600);
      }
    }
  }, [messages, isExpanded]);

  // 展开状态自动收起
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, messages.length]);

  // 获取任务状态指示器
  const getTaskIndicator = (message: MonitorMessage) => {
    const status = message.taskStatus || getStatusFromType(message.type);

    switch (status) {
      case 'success':
        return (
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        );
      case 'error':
        return (
          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        );
      case 'running':
        return (
          <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 animate-pulse" />
        );
      case 'pending':
        return (
          <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
        );
      case 'cancelled':
        return (
          <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
        );
      default:
        return (
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        );
    }
  };

  const getStatusFromType = (type: string): TaskStatus => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'pending';
    }
  };

  // 获取任务操作按钮
  const getTaskActions = (message: MonitorMessage) => {
    const status = message.taskStatus || getStatusFromType(message.type);

    if (status === 'success') {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            // 查看详情
          }}
        >
          <Check className="h-3 w-3 mr-1" />
          查看
        </Button>
      );
    }

    if (status === 'error' && onRetryTask && message.taskId) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
          onClick={(e) => {
            e.stopPropagation();
            onRetryTask(message.taskId!);
          }}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          重试
        </Button>
      );
    }

    if (status === 'running' && onCancelTask && message.taskId) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700"
          onClick={(e) => {
            e.stopPropagation();
            onCancelTask(message.taskId!);
          }}
        >
          <X className="h-3 w-3 mr-1" />
          取消
        </Button>
      );
    }

    return null;
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

  const exportSuccessRecords = () => {
    const successMessages = messages.filter(
      (m) => (m.taskStatus || getStatusFromType(m.type)) === 'success',
    );
    const dataStr = JSON.stringify(successMessages, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `success-records-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // 暂停通知
  const handlePauseNotification = () => {
    setIsNotificationPaused(true);
    toast.info('通知已暂停', '将在 3 分钟后恢复非重要通知');
    setTimeout(
      () => {
        setIsNotificationPaused(false);
        toast.success('通知已恢复', '非重要通知已重新启用');
      },
      3 * 60 * 1000,
    );
  };

  // 渲染层叠状态
  const renderStackedView = () => {
    const visibleMessages = messages.slice(0, 5);

    return (
      <div className="space-y-2">
        {visibleMessages.map((message, index) => {
          const isUnread = !message.isRead;
          return (
            <div
              key={message.id}
              className={`
                relative backdrop-blur-xl bg-white/80 dark:bg-gray-800/80
                rounded-2xl shadow-lg border
                ${isUnread ? 'border-blue-400/50 ring-2 ring-blue-400/30' : 'border-gray-200/50 dark:border-gray-700/50'}
                p-3 cursor-pointer hover:shadow-xl hover:bg-white/90 dark:hover:bg-gray-800/90
                transition-all duration-300
                animate-in fade-in slide-in-from-top-2
              `}
              style={{
                marginTop: index > 0 ? '-8px' : '0',
                zIndex: 100 - index,
              }}
              onClick={() => setIsExpanded(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsExpanded(true);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-3">
                {getTaskIndicator(message)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-gray-900 dark:text-gray-100">
                    {message.content}
                  </p>
                  {message.taskProgress !== undefined && (
                    <div className="mt-1.5 h-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300"
                        style={{ width: `${message.taskProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 font-medium">
                  {format(message.timestamp, 'HH:mm')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染展开状态
  const renderExpandedView = () => {
    return (
      <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-80 max-h-[600px] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              消息监控
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(false)}
            className="h-6 w-6 p-0 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        {/* 连接状态提示 */}
        {status !== 'open' && (
          <div className="px-3 py-2 bg-red-50/50 dark:bg-red-950/30 backdrop-blur-sm border-b border-red-200/50 dark:border-red-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium">连接已中断</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onConnect}
                className="h-6 px-2 text-xs hover:bg-red-100/50 dark:hover:bg-red-900/30"
              >
                点击重连
              </Button>
            </div>
          </div>
        )}

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Loader2 className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">暂无消息</p>
            </div>
          ) : (
            messages.map((message) => {
              const status =
                message.taskStatus || getStatusFromType(message.type);
              const isHighlight =
                Date.now() - message.timestamp < 1000 && status === 'success';

              return (
                <div
                  key={message.id}
                  className={`
                    p-2.5 rounded-xl border transition-all duration-300
                    ${
                      isHighlight
                        ? 'bg-green-50/50 dark:bg-green-950/30 border-green-200/50 dark:border-green-800/50 backdrop-blur-sm'
                        : 'bg-gray-50/30 dark:bg-gray-900/30 border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    {getTaskIndicator(message)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          {message.taskId && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              #{message.taskId.slice(0, 6)}
                            </span>
                          )}
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 break-words">
                            {message.content}
                          </p>
                        </div>
                        {getTaskActions(message)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{format(message.timestamp, 'HH:mm:ss')}</span>
                        {message.duration && (
                          <span>
                            耗时 {(message.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      {message.errorCode && (
                        <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                          错误代码: {message.errorCode}
                        </div>
                      )}
                      {message.taskProgress !== undefined &&
                        status === 'running' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>进度</span>
                              <span>{message.taskProgress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-500 transition-all duration-300"
                                style={{ width: `${message.taskProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="p-2 border-t border-gray-200/50 dark:border-gray-700/50 flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={exportSuccessRecords}
            disabled={messages.length === 0}
            className="flex-1 h-7 text-xs hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
          >
            <Download className="h-3 w-3 mr-1" />
            导出成功
          </Button>
          {onClearCompleted && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearCompleted}
              disabled={messages.length === 0}
              className="flex-1 h-7 text-xs hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              清除完成
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 悬浮容器 - 包含按钮和消息列表 */}
      <div className="fixed top-4 right-4 z-50 pointer-events-auto flex flex-col gap-2">
        {/* 顶部操作按钮栏 */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-2 flex items-center gap-1.5 relative z-50">
          {/* 连接状态 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onConnect}
            disabled={status === 'connecting'}
            className={`
              h-8 px-2.5 text-xs hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl
              ${status === 'error' || status === 'closed' ? 'text-red-600 animate-pulse' : ''}
            `}
          >
            {status === 'open' ? (
              <>
                <Wifi className="h-3.5 w-3.5 mr-1.5" />
                <span className="font-medium">重连</span>
              </>
            ) : status === 'connecting' ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                <span className="font-medium">连接中</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 mr-1.5" />
                <span className="font-medium">连接</span>
              </>
            )}
          </Button>

          {/* 分隔线 */}
          <div className="h-5 w-px bg-gray-200/50 dark:bg-gray-700/50" />

          {/* 报告 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={openLatestReport}
            disabled={isLoadingReport}
            className="h-8 px-2.5 text-xs hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl"
          >
            {isLoadingReport ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            )}
            <span className="font-medium">报告</span>
          </Button>

          {/* 清空菜单 */}
          <div className="relative z-50">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowClearMenu(!showClearMenu)}
              disabled={messages.length === 0}
              className="h-8 px-2.5 text-xs hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="font-medium">清空</span>
              {unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {showClearMenu && (
              <div className="absolute top-full right-0 mt-1 backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl py-1 min-w-[120px] z-[60]">
                {onClearCompleted && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearCompleted();
                      setShowClearMenu(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-medium text-left hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
                  >
                    清空已完成
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setShowClearMenu(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-left hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors text-red-600 rounded-lg"
                >
                  清空全部
                </button>
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="h-5 w-px bg-gray-200/50 dark:bg-gray-700/50" />

          {/* 暂停通知 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePauseNotification}
            disabled={isNotificationPaused}
            className={`h-8 px-2.5 text-xs hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl ${
              isNotificationPaused ? 'opacity-50' : ''
            }`}
          >
            <Pause className="h-3.5 w-3.5 mr-1.5" />
            <span className="font-medium">
              {isNotificationPaused ? '已暂停' : '暂停'}
            </span>
          </Button>
        </div>

        {/* 消息列表 */}
        <div
          ref={containerRef}
          className="relative z-40"
          style={{ maxWidth: isExpanded ? '320px' : '280px' }}
        >
          {isExpanded ? renderExpandedView() : renderStackedView()}
        </div>
      </div>

      {/* 点击外部关闭菜单 */}
      {showClearMenu && (
        <button
          type="button"
          className="fixed inset-0 z-45"
          onClick={() => setShowClearMenu(false)}
          aria-label="关闭菜单"
        />
      )}

      {/* 抖动动画样式 */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out 2;
        }
      `}</style>
    </>
  );
}
