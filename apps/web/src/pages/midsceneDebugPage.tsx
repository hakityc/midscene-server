import { History, Play, Send, Square } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { ActionSelector } from '@/components/debug/ActionSelector';
import { AiScriptForm } from '@/components/debug/AiScriptForm';
import { HistoryPanel } from '@/components/debug/HistoryPanel';
import { JsonPreview } from '@/components/debug/JsonPreview';
import { MessageMonitor } from '@/components/debug/MessageMonitor';
import { MetaForm } from '@/components/debug/MetaForm';
import {
  AiForm,
  CommandForm,
  GenericForm,
  SiteScriptForm,
} from '@/components/debug/SimpleActionForms';
import { TemplatePanel } from '@/components/debug/TemplatePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useDebugStore } from '@/stores';
import type { HistoryItem, Template, WsInboundMessage } from '@/types/debug';
import {
  buildAiMessage,
  buildAiScriptMessage,
  buildCommandScriptMessage,
  buildSiteScriptMessage,
} from '@/utils/messageBuilder';
import { getAllTemplates } from '@/utils/templates';

export default function MidsceneDebugPage() {
  // 使用 Zustand store
  const {
    endpoint,
    action,
    meta,
    tasks,
    enableLoadingShade,
    aiPrompt,
    siteScript,
    siteScriptCmd,
    command,
    history,
    showHistory,
    setAction,
    setMeta,
    refreshMessageId,
    setTasks,
    setEnableLoadingShade,
    setAiPrompt,
    setSiteScript,
    setSiteScriptCmd,
    setCommand,
    setShowHistory,
    addHistory,
    removeHistory,
    clearHistory,
    loadHistory,
    updateFromJson,
  } = useDebugStore();

  const { status, error, messages, connect, send, clearMessages } =
    useWebSocket(endpoint);

  // 模板
  const templates = useMemo(() => getAllTemplates(), []);

  // 自动连接
  // useEffect(() => {
  //   if (status === 'idle' || status === 'closed') {
  //     console.log('status',status)
  //     connect();
  //   }
  // }, []);

  // 构建消息
  const buildMessage = useCallback((): WsInboundMessage | null => {
    const option = enableLoadingShade ? 'LOADING_SHADE' : undefined;

    switch (action) {
      case 'aiScript':
        return buildAiScriptMessage(tasks, meta, option);
      case 'ai':
        return buildAiMessage(aiPrompt, meta, option);
      case 'siteScript':
        return buildSiteScriptMessage(siteScript, siteScriptCmd, meta);
      case 'command':
        return buildCommandScriptMessage(command, meta);
      default:
        return {
          meta,
          payload: {
            action,
            params: '',
          },
        };
    }
  }, [
    action,
    meta,
    tasks,
    enableLoadingShade,
    aiPrompt,
    siteScript,
    siteScriptCmd,
    command,
  ]);

  // 发送消息
  const handleSend = useCallback(() => {
    const message = buildMessage();
    if (!message) return;

    send(message);
    addHistory(message);
    refreshMessageId();
  }, [buildMessage, send, addHistory, refreshMessageId]);

  // 加载历史记录
  const handleLoadHistory = useCallback(
    (item: HistoryItem) => {
      loadHistory(item);
    },
    [loadHistory],
  );

  // 加载模板
  const handleLoadTemplate = useCallback(
    (template: Template) => {
      const msg = template.message;
      updateFromJson({
        ...msg.payload,
      });
      refreshMessageId(); // 生成新的 messageId
    },
    [updateFromJson, refreshMessageId],
  );

  // 当前消息预览
  const currentMessage = useMemo(() => buildMessage(), [buildMessage]);

  // 渲染表单
  const renderForm = () => {
    switch (action) {
      case 'aiScript':
        return (
          <AiScriptForm
            tasks={tasks}
            enableLoadingShade={enableLoadingShade}
            onTasksChange={setTasks}
            onLoadingShadeChange={setEnableLoadingShade}
            clientType={meta.clientType || 'web'}
          />
        );
      case 'ai':
        return <AiForm prompt={aiPrompt} onChange={setAiPrompt} />;
      case 'siteScript':
        return (
          <SiteScriptForm
            script={siteScript}
            originalCmd={siteScriptCmd}
            onScriptChange={setSiteScript}
            onOriginalCmdChange={setSiteScriptCmd}
          />
        );
      case 'command':
        return <CommandForm command={command} onChange={setCommand} />;
      default:
        return <GenericForm actionType={action} />;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="container mx-auto p-6 max-w-[1600px]">
        {/* 标题栏 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold">
                Midscene Debug Tool
              </CardTitle>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4 mr-2" />
                  {showHistory ? '隐藏历史' : '显示历史'}
                </Button>
                <div
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                    status === 'open'
                      ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : status === 'connecting'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                        : status === 'error'
                          ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                          : 'border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-400'
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      status === 'open'
                        ? 'bg-green-500'
                        : status === 'connecting'
                          ? 'bg-yellow-500'
                          : status === 'error'
                            ? 'bg-red-500'
                            : 'bg-gray-400'
                    }`}
                  />
                  <span>
                    {status === 'open'
                      ? '已连接'
                      : status === 'connecting'
                        ? '连接中'
                        : status === 'error'
                          ? '连接失败'
                          : '未连接'}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：构建器 */}
          <Card>
            <CardHeader>
              <CardTitle>消息构建器</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 服务控制按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    const startMessage = buildCommandScriptMessage(
                      'start',
                      meta,
                    );
                    send(startMessage);
                    addHistory(startMessage, '启动服务');
                  }}
                  disabled={status !== 'open'}
                  variant="outline"
                  className="h-11"
                  size="lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  启动服务
                </Button>
                <Button
                  onClick={() => {
                    const stopMessage = buildCommandScriptMessage('stop', meta);
                    send(stopMessage);
                    addHistory(stopMessage, '停止服务');
                  }}
                  disabled={status !== 'open'}
                  variant="outline"
                  className="h-11"
                  size="lg"
                >
                  <Square className="h-5 w-5 mr-2" />
                  停止服务
                </Button>
              </div>

              {/* 发送消息按钮 */}
              <Button
                onClick={handleSend}
                disabled={status !== 'open'}
                className="w-full h-11"
                size="lg"
              >
                <Send className="h-5 w-5 mr-2" />
                发送消息
              </Button>
              <Tabs defaultValue="builder">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="builder">表单模式</TabsTrigger>
                  <TabsTrigger value="json">JSON 模式</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="space-y-4">
                  <ActionSelector
                    value={action}
                    onChange={setAction}
                    clientType={meta.clientType || 'web'}
                  />
                  <Separator />
                  {renderForm()}
                  <Separator />
                  <MetaForm
                    meta={meta}
                    onChange={setMeta}
                    onRefreshMessageId={refreshMessageId}
                  />
                </TabsContent>

                <TabsContent value="json" className="space-y-4">
                  {currentMessage && (
                    <JsonPreview
                      message={currentMessage}
                      editable={true}
                      onEdit={(_message) => {
                        // 可以在这里处理消息更新，如果需要的话
                      }}
                      onFormUpdate={updateFromJson}
                    />
                  )}
                </TabsContent>
              </Tabs>

              {error && (
                <div className="p-3 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm font-medium">
                  ❌ {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：监控和历史 */}
          <div className="space-y-6">
            {showHistory ? (
              <div className="h-[calc(100vh-10rem)]">
                <HistoryPanel
                  history={history}
                  onLoad={handleLoadHistory}
                  onRemove={removeHistory}
                  onClear={clearHistory}
                />
              </div>
            ) : (
              <>
                <div className="h-1/2">
                  <MessageMonitor
                    messages={messages}
                    onClear={clearMessages}
                    status={status}
                    onConnect={connect}
                  />
                </div>
                <div className="h-1/2">
                  <TemplatePanel
                    templates={templates}
                    onLoad={handleLoadTemplate}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
