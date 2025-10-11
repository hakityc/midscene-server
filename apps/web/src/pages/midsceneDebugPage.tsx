import { History, Send } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActionSelector } from '@/components/debug/ActionSelector';
import { AiScriptForm } from '@/components/debug/AiScriptForm';
import { HistoryPanel } from '@/components/debug/HistoryPanel';
import { JsonPreview } from '@/components/debug/JsonPreview';
import { MessageMonitor } from '@/components/debug/MessageMonitor';
import { MetaForm } from '@/components/debug/MetaForm';
import {
  AiForm,
  DownloadVideoForm,
  GenericForm,
  SiteScriptForm,
} from '@/components/debug/SimpleActionForms';
import { TemplatePanel } from '@/components/debug/TemplatePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useMessageHistory } from '@/hooks/useMessageHistory';
import { useWebSocket } from '@/hooks/useWebSocket';
import type {
  HistoryItem,
  MessageMeta,
  Task,
  Template,
  WebSocketAction,
  WsInboundMessage,
} from '@/types/debug';
import {
  buildAiMessage,
  buildAiScriptMessage,
  buildSiteScriptMessage,
  generateMeta,
} from '@/utils/messageBuilder';
import { getAllTemplates } from '@/utils/templates';

export default function MidsceneDebugPage() {
  const endpoint = 'ws://localhost:3000/ws';
  const { status, error, messages, connect, send, clearMessages } =
    useWebSocket(endpoint);
  const { history, addHistory, removeHistory, clearHistory } =
    useMessageHistory();

  // 状态管理
  const [action, setAction] = useState<WebSocketAction>('aiScript');
  const [meta, setMeta] = useState<MessageMeta>(generateMeta());
  const [showHistory, setShowHistory] = useState(false);

  // AI Script 状态
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: uuidv4(),
      name: '示例任务',
      continueOnError: false,
      flow: [
        {
          type: 'aiTap',
          locate: '搜索图标',
        },
      ],
    },
  ]);
  const [enableLoadingShade, setEnableLoadingShade] = useState(true);

  // 其他 Action 状态
  const [aiPrompt, setAiPrompt] = useState('点击搜索按钮');
  const [siteScript, setSiteScript] = useState(
    'console.log("Hello from Midscene");',
  );
  const [siteScriptCmd, setSiteScriptCmd] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoSavePath, setVideoSavePath] = useState('');

  // 模板
  const templates = useMemo(() => getAllTemplates(), []);

  // 自动连接
  // useEffect(() => {
  //   if (status === 'idle' || status === 'closed') {
  //     console.log('status',status)
  //     connect();
  //   }
  // }, []);

  // 刷新 Message ID
  const refreshMessageId = useCallback(() => {
    setMeta((prev) => ({
      ...prev,
      messageId: uuidv4(),
      timestamp: Date.now(),
    }));
  }, []);

  // 从 JSON 更新表单
  const handleJsonToFormUpdate = useCallback((formData: any) => {
    if (formData.action) setAction(formData.action);
    if (formData.meta) setMeta(formData.meta);

    // 根据 Action 类型更新相应的状态
    switch (formData.action) {
      case 'aiScript':
        if (formData.tasks) setTasks(formData.tasks);
        if (typeof formData.enableLoadingShade === 'boolean') {
          setEnableLoadingShade(formData.enableLoadingShade);
        }
        break;
      case 'ai':
        if (formData.aiPrompt) setAiPrompt(formData.aiPrompt);
        break;
      case 'siteScript':
        if (formData.siteScript) setSiteScript(formData.siteScript);
        if (formData.siteScriptCmd) setSiteScriptCmd(formData.siteScriptCmd);
        break;
      case 'downloadVideo':
        if (formData.videoUrl) setVideoUrl(formData.videoUrl);
        if (formData.videoSavePath) setVideoSavePath(formData.videoSavePath);
        break;
    }
  }, []);

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
      case 'downloadVideo':
        return {
          meta,
          payload: {
            action: 'downloadVideo',
            params: { url: videoUrl, savePath: videoSavePath },
          },
        };
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
    videoUrl,
    videoSavePath,
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
  const handleLoadHistory = useCallback((item: HistoryItem) => {
    const msg = item.message;
    setAction(msg.payload.action as WebSocketAction);
    setMeta(msg.meta);

    // 根据 action 类型恢复状态
    if (msg.payload.action === 'aiScript') {
      const params = msg.payload.params as { tasks: Task[] };
      if (params.tasks) {
        setTasks(
          params.tasks.map((t) => ({
            ...t,
            id: uuidv4(),
          })),
        );
      }
      setEnableLoadingShade(
        msg.payload.option?.includes('LOADING_SHADE') || false,
      );
    } else if (msg.payload.action === 'ai') {
      setAiPrompt(msg.payload.params as string);
    } else if (msg.payload.action === 'siteScript') {
      setSiteScript(msg.payload.params as string);
      setSiteScriptCmd(msg.payload.originalCmd || '');
    }

    setShowHistory(false);
  }, []);

  // 加载模板
  const handleLoadTemplate = useCallback((template: Template) => {
    const msg = template.message;
    setAction(msg.payload.action as WebSocketAction);
    setMeta(generateMeta());

    if (msg.payload.action === 'aiScript') {
      const params = msg.payload.params as { tasks: Task[] };
      if (params.tasks) {
        setTasks(
          params.tasks.map((t) => ({
            ...t,
            id: uuidv4(),
          })),
        );
      }
      setEnableLoadingShade(
        msg.payload.option?.includes('LOADING_SHADE') || false,
      );
    }
  }, []);

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
      case 'downloadVideo':
        return (
          <DownloadVideoForm
            url={videoUrl}
            savePath={videoSavePath}
            onUrlChange={setVideoUrl}
            onSavePathChange={setVideoSavePath}
          />
        );
      default:
        return <GenericForm actionType={action} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-[1600px]">
        {/* 标题栏 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold">
                Midscene Debug Tool
              </CardTitle>
              <div className="flex items-center gap-3">
                <ThemeToggle />
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
              <Tabs defaultValue="builder">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="builder">表单模式</TabsTrigger>
                  <TabsTrigger value="json">JSON 模式</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="space-y-4">
                  <ActionSelector value={action} onChange={setAction} />
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
                      onFormUpdate={handleJsonToFormUpdate}
                    />
                  )}
                </TabsContent>
              </Tabs>

              {error && (
                <div className="p-3 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm font-medium">
                  ❌ {error}
                </div>
              )}

              <Button
                onClick={handleSend}
                disabled={status !== 'open'}
                className="w-full h-11"
                size="lg"
              >
                <Send className="h-5 w-5 mr-2" />
                发送消息
              </Button>
            </CardContent>
          </Card>

          {/* 右侧：监控和历史 */}
          <div className="space-y-6">
            {showHistory ? (
              <>
                <div className="h-[calc(50vh-1rem)]">
                  <TemplatePanel
                    templates={templates}
                    onLoad={handleLoadTemplate}
                  />
                </div>
                <div className="h-[calc(50vh-1rem)]">
                  <HistoryPanel
                    history={history}
                    onLoad={handleLoadHistory}
                    onRemove={removeHistory}
                    onClear={clearHistory}
                  />
                </div>
              </>
            ) : (
              <div className="h-[calc(100vh-10rem)]">
                <MessageMonitor
                  messages={messages}
                  onClear={clearMessages}
                  status={status}
                  onConnect={connect}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
