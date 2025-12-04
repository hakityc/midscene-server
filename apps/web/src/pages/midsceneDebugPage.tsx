import { History, Send } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';
import { ActionSelector } from '@/components/debug/ActionSelector';
import { AiScriptForm } from '@/components/debug/AiScriptForm';
import { FloatingMessageMonitor } from '@/components/debug/FloatingMessageMonitor';
import { HistoryPanel } from '@/components/debug/HistoryPanel';
import { JsonPreview } from '@/components/debug/JsonPreview';
import { MetaForm } from '@/components/debug/MetaForm';
import {
  AiForm,
  CommandForm,
  ConnectWindowForm,
  GenericForm,
  SiteScriptForm,
  SummarizeForm,
} from '@/components/debug/SimpleActionForms';
import { TemplatePanel } from '@/components/debug/TemplatePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVariableTransform } from '@/hooks/useVariableTransform';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useDebugStore } from '@/stores';
import type {
  AiScriptParams,
  HistoryItem,
  Template,
  WsInboundMessage,
} from '@/types/debug';
import {
  buildAiMessage,
  buildAiScriptMessage,
  buildCommandScriptMessage,
  buildConnectWindowMessage,
  buildSiteScriptMessage,
  buildSummarizeMessage,
} from '@/utils/messageBuilder';

export default function MidsceneDebugPage() {
  // 生成唯一 ID
  const serviceSwitchId = useId();
  const debugSwitchId = useId();

  // 服务运行状态（适用于 web 和 windows）
  const [isServiceRunning, setIsServiceRunning] = useState(false);
  // Debug 模式状态（仅用于 windows）
  const [isDebugEnabled, setIsDebugEnabled] = useState(true); // 默认启用，与后端 defaultAgentConfig 保持一致

  // 使用 Zustand store
  const {
    endpoint,
    action,
    meta,
    tasks,
    enableLoadingShade,
    aiScriptContext,
    aiPrompt,
    siteScript,
    siteScriptCmd,
    command,
    connectWindowId,
    connectWindowTitle,
    summarizeFullPage,
    summarizeLocate,
    history,
    showHistory,
    setAction,
    setMeta,
    refreshMessageId,
    setTasks,
    setEnableLoadingShade,
    setAiScriptContext,
    setAiPrompt,
    setSiteScript,
    setSiteScriptCmd,
    setCommand,
    setConnectWindowId,
    setConnectWindowTitle,
    setSummarizeFullPage,
    setSummarizeLocate,
    setShowHistory,
    addHistory,
    removeHistory,
    clearHistory,
    loadHistory,
    updateFromJson,
  } = useDebugStore();

  const {
    status,
    error,
    messages,
    connect,
    send,
    clearMessages,
    clearCompletedMessages,
  } = useWebSocket(endpoint);

  // 自动连接
  // useEffect(() => {
  //   if (status === 'idle' || status === 'closed') {
  //     console.log('status',status)
  //     connect();
  //   }
  // }, []);

  // 变量转换 Hook
  const { transformTasks } = useVariableTransform();

  // 构建消息（始终从表单数据构建，不区分 JSON 模式和表单模式）
  const buildMessage = useCallback(
    (mode: 'original' | 'runtime' = 'original'): WsInboundMessage | null => {
      const option = enableLoadingShade ? 'LOADING_SHADE' : undefined;

      switch (action) {
        case 'aiScript': {
          // 根据模式选择是否转换变量
          const tasksToUse =
            mode === 'runtime' ? transformTasks(tasks, 'runtime') : tasks;
          return buildAiScriptMessage(
            tasksToUse,
            meta,
            option,
            aiScriptContext,
          );
        }
        case 'ai':
          return buildAiMessage(aiPrompt, meta, option, aiScriptContext);
        case 'siteScript':
          return buildSiteScriptMessage(siteScript, siteScriptCmd, meta);
        case 'command':
          return buildCommandScriptMessage(command, meta);
        case 'connectWindow':
          return buildConnectWindowMessage(
            connectWindowId,
            connectWindowTitle,
            meta,
          );
        case 'summarize':
          return buildSummarizeMessage(
            summarizeFullPage,
            summarizeLocate,
            meta,
          );
        default:
          return {
            meta,
            payload: {
              action,
              params: '',
            },
          };
      }
    },
    [
      action,
      meta,
      tasks,
      enableLoadingShade,
      aiScriptContext,
      aiPrompt,
      siteScript,
      siteScriptCmd,
      command,
      connectWindowId,
      connectWindowTitle,
      summarizeFullPage,
      summarizeLocate,
      transformTasks,
    ],
  );

  // 发送消息（转换变量为运行时值）
  const handleSend = useCallback(() => {
    // 构建运行时消息（变量已转换）
    const messageToSend = buildMessage('runtime');
    if (!messageToSend) return;

    // 构建原始消息（用于历史记录，保留变量）
    const originalMessage = buildMessage('original');

    send(messageToSend);
    if (originalMessage) {
      addHistory(originalMessage); // 历史记录保存原始值（包含变量）
    }
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

      // 清空当前任务列表并设置新的任务
      if (msg.payload.action === 'aiScript') {
        const aiScriptParams = msg.payload.params as AiScriptParams;
        if (aiScriptParams?.tasks) {
          setTasks(aiScriptParams.tasks);
          setAction('aiScript');

          // 设置加载遮罩选项
          if (msg.payload.option === 'LOADING_SHADE') {
            setEnableLoadingShade(true);
          } else {
            setEnableLoadingShade(false);
          }

          // 加载 context（如果存在）
          const context = (msg.payload as any)?.context;
          if (context && typeof context === 'string') {
            setAiScriptContext(context);
          } else {
            setAiScriptContext('');
          }
        }
      }

      // 更新元数据，包括客户端类型
      if (msg.meta) {
        // 如果模板有 clientType，使用模板的；否则使用消息元数据中的；都没有则默认为 web
        const clientType = template.clientType || msg.meta.clientType || 'web';
        setMeta({
          ...msg.meta,
          clientType,
        });
      }

      refreshMessageId(); // 生成新的 messageId
    },
    [setTasks, setAction, setEnableLoadingShade, setMeta, refreshMessageId],
  );

  // 当前消息预览（显示原始消息，包含变量）
  const currentMessage = useMemo(
    () => buildMessage('original'),
    [
      action,
      meta,
      tasks,
      enableLoadingShade,
      aiScriptContext,
      aiPrompt,
      siteScript,
      siteScriptCmd,
      command,
      connectWindowId,
      connectWindowTitle,
      buildMessage,
    ],
  );

  // 渲染表单
  const renderForm = () => {
    switch (action) {
      case 'aiScript':
        return (
          <AiScriptForm
            tasks={tasks}
            enableLoadingShade={enableLoadingShade}
            context={aiScriptContext}
            onTasksChange={setTasks}
            onLoadingShadeChange={setEnableLoadingShade}
            onContextChange={setAiScriptContext}
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
      case 'connectWindow':
        return (
          <ConnectWindowForm
            windowId={connectWindowId}
            windowTitle={connectWindowTitle}
            onWindowIdChange={setConnectWindowId}
            onWindowTitleChange={setConnectWindowTitle}
          />
        );
      case 'summarize':
        return (
          <SummarizeForm
            fullPage={summarizeFullPage}
            locate={summarizeLocate}
            onFullPageChange={setSummarizeFullPage}
            onLocateChange={setSummarizeLocate}
          />
        );
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

        {/* 悬浮消息监控 */}
        <FloatingMessageMonitor
          messages={messages}
          onClear={clearMessages}
          onClearCompleted={clearCompletedMessages}
          status={status}
          onConnect={connect}
        />

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：构建器 */}
          <Card>
            <CardHeader>
              <CardTitle>消息构建器</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 服务控制 Switch（适用于 web 和 windows） */}
              <div className="flex items-center gap-3">
                <Label htmlFor={serviceSwitchId} className="min-w-[80px]">
                  服务状态
                </Label>
                <Switch
                  id={serviceSwitchId}
                  checked={isServiceRunning}
                  onCheckedChange={(checked) => {
                    const command = checked ? 'start' : 'stop';
                    const message = buildCommandScriptMessage(command, meta);
                    send(message);
                    addHistory(message, checked ? '启动服务' : '停止服务');
                    setIsServiceRunning(checked);
                  }}
                  disabled={status !== 'open'}
                />
                <span className="text-sm text-muted-foreground">
                  {isServiceRunning ? '运行中' : '已停止'}
                </span>
              </div>

              {/* Debug 模式 Switch（仅用于 windows） */}
              {meta.clientType === 'windows' && (
                <div className="flex items-center gap-3">
                  <Label htmlFor={debugSwitchId} className="min-w-[80px]">
                    Debug 模式
                  </Label>
                  <Switch
                    id={debugSwitchId}
                    checked={isDebugEnabled}
                    onCheckedChange={(checked) => {
                      const command = checked ? 'enableDebug' : 'disableDebug';
                      const message = buildCommandScriptMessage(command, meta);
                      send(message);
                      addHistory(
                        message,
                        checked ? '启用 Debug 模式' : '禁用 Debug 模式',
                      );
                      setIsDebugEnabled(checked);
                    }}
                    disabled={status !== 'open'}
                  />
                  <span className="text-sm text-muted-foreground">
                    {isDebugEnabled ? '已启用' : '已禁用'}
                  </span>
                </div>
              )}

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
              <TemplatePanel onLoad={handleLoadTemplate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
