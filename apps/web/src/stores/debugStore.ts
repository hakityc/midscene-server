import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  HistoryItem,
  MessageMeta,
  Task,
  WebSocketAction,
  WsInboundMessage,
} from '@/types/debug';
import { parseFlow, parseJsonToForm } from '@/utils/jsonParser';

const MAX_HISTORY = 10;

interface DebugState {
  // WebSocket 配置
  endpoint: string;
  autoConnect: boolean;

  // 当前表单状态
  action: WebSocketAction;
  meta: MessageMeta;

  // AI Script 状态
  tasks: Task[];
  enableLoadingShade: boolean;
  aiScriptContext: string; // AI Action Context

  // 其他 Action 状态
  aiPrompt: string;
  siteScript: string;
  siteScriptCmd: string;
  command: string;
  connectWindowId: string;
  connectWindowTitle: string;
  summarizeFullPage: boolean;
  summarizeLocate?: {
    rect: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  };

  // JSON 模式相关（以 JSON 为主）
  jsonParams: unknown | null;
  jsonOverrideEnabled: boolean;

  // 历史记录
  history: HistoryItem[];
  showHistory: boolean;

  // Actions
  setEndpoint: (endpoint: string) => void;
  setAutoConnect: (autoConnect: boolean) => void;
  setAction: (action: WebSocketAction) => void;
  setMeta: (meta: MessageMeta) => void;
  refreshMessageId: () => void;
  setTasks: (tasks: Task[]) => void;
  setEnableLoadingShade: (enable: boolean) => void;
  setAiScriptContext: (context: string) => void;
  setAiPrompt: (prompt: string) => void;
  setSiteScript: (script: string) => void;
  setSiteScriptCmd: (cmd: string) => void;
  setCommand: (command: string) => void;
  setConnectWindowId: (id: string) => void;
  setConnectWindowTitle: (title: string) => void;
  setSummarizeFullPage: (fullPage: boolean) => void;
  setSummarizeLocate: (locate?: {
    rect: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }) => void;
  setShowHistory: (show: boolean) => void;

  // 历史记录操作
  addHistory: (message: WsInboundMessage, label?: string) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  loadHistory: (item: HistoryItem) => void;

  // 表单数据更新
  updateFromJson: (formData: any) => void;
  resetForm: () => void;
  setJsonOverrideEnabled: (enabled: boolean) => void;
  clearJsonOverride: () => void;
}

const generateMeta = (): MessageMeta => ({
  messageId: uuidv4(),
  conversationId: uuidv4(),
  timestamp: Date.now(),
  clientType: 'web',
});

export const useDebugStore = create<DebugState>()(
  persist(
    (set) => ({
      // 初始状态
      endpoint: 'ws://localhost:3000/ws',
      autoConnect: false,

      action: 'aiScript',
      meta: generateMeta(),

      tasks: [
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
      ],
      enableLoadingShade: true,
      aiScriptContext: '',

      aiPrompt: '点击搜索按钮',
      siteScript: 'console.log("Hello from Midscene");',
      siteScriptCmd: '',
      command: 'start',
      connectWindowId: '',
      connectWindowTitle: '',
      summarizeFullPage: true,
      summarizeLocate: undefined,

      jsonParams: null,
      jsonOverrideEnabled: false,

      history: [],
      showHistory: false,

      // Actions 实现
      setEndpoint: (endpoint) => set({ endpoint }),
      setAutoConnect: (autoConnect) => set({ autoConnect }),
      setAction: (action) => set({ action }),
      setMeta: (meta) => set({ meta }),

      refreshMessageId: () =>
        set((state) => ({
          meta: {
            ...state.meta,
            messageId: uuidv4(),
            timestamp: Date.now(),
          },
        })),

      setTasks: (tasks) => set({ tasks }),
      setEnableLoadingShade: (enable) => set({ enableLoadingShade: enable }),
      setAiScriptContext: (context) => set({ aiScriptContext: context }),
      setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
      setSiteScript: (script) => set({ siteScript: script }),
      setSiteScriptCmd: (cmd) => set({ siteScriptCmd: cmd }),
      setCommand: (command) => set({ command }),
      setConnectWindowId: (id) => set({ connectWindowId: id }),
      setConnectWindowTitle: (title) => set({ connectWindowTitle: title }),
      setSummarizeFullPage: (fullPage) => set({ summarizeFullPage: fullPage }),
      setSummarizeLocate: (locate) => set({ summarizeLocate: locate }),
      setShowHistory: (show) => set({ showHistory: show }),

      setJsonOverrideEnabled: (enabled) =>
        set({
          jsonOverrideEnabled: enabled,
        }),

      clearJsonOverride: () =>
        set({
          jsonParams: null,
          jsonOverrideEnabled: false,
        }),

      // 历史记录操作
      addHistory: (message, label) => {
        const item: HistoryItem = {
          id: `history-${Date.now()}`,
          timestamp: Date.now(),
          message,
          label,
        };

        set((state) => ({
          history: [item, ...state.history].slice(0, MAX_HISTORY),
        }));
      },

      removeHistory: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),

      clearHistory: () => set({ history: [] }),

      loadHistory: (item) => {
        // 使用统一的解析函数来解析消息，确保所有字段都被正确解析
        const formData = parseJsonToForm(item.message);
        const newState: Partial<DebugState> = {
          action: formData.action,
          meta: formData.meta,
          showHistory: false,
        };

        // 根据 action 类型恢复状态
        if (formData.action === 'aiScript') {
          if (formData.tasks) {
            newState.tasks = formData.tasks.map((t) => ({
              ...t,
              id: t.id || uuidv4(),
            }));
          }
          if (typeof formData.enableLoadingShade === 'boolean') {
            newState.enableLoadingShade = formData.enableLoadingShade;
          }
          if (formData.aiScriptContext !== undefined) {
            newState.aiScriptContext = formData.aiScriptContext || '';
          }
        } else if (formData.action === 'ai') {
          if (formData.aiPrompt !== undefined) {
            newState.aiPrompt = formData.aiPrompt;
          }
          if (formData.aiScriptContext !== undefined) {
            newState.aiScriptContext = formData.aiScriptContext || '';
          }
        } else if (formData.action === 'siteScript') {
          if (formData.siteScript !== undefined) {
            newState.siteScript = formData.siteScript;
          }
          if (formData.siteScriptCmd !== undefined) {
            newState.siteScriptCmd = formData.siteScriptCmd;
          }
        } else if (formData.action === 'command') {
          if (formData.params !== undefined) {
            newState.command = formData.params;
          }
        } else if (formData.action === 'connectWindow') {
          // connectWindow 需要通过 parseJsonToForm 解析，这里暂时保持原逻辑
          const params = item.message.payload.params as {
            windowId?: number;
            windowTitle?: string;
          };
          if (params) {
            newState.connectWindowId = params.windowId
              ? String(params.windowId)
              : '';
            newState.connectWindowTitle = params.windowTitle || '';
          }
        } else if (formData.action === 'summarize') {
          if (formData.summarizeFullPage !== undefined) {
            newState.summarizeFullPage = formData.summarizeFullPage;
          }
          if (formData.summarizeLocate !== undefined) {
            newState.summarizeLocate = formData.summarizeLocate;
          }
        }

        set(newState);
      },

      // 从 JSON 更新（以最后编辑的内容为主，完整解析所有字段）
      updateFromJson: (formData) => {
        set((state) => {
          const updates: Partial<DebugState> = {};
          const currentAction = state.action;

          // 根据当前 Action 类型解析 formData（formData 是 payload.params 的内容）
          switch (currentAction) {
            case 'aiScript':
              // formData 应该是 { tasks: [...] } 结构
              if (
                formData &&
                typeof formData === 'object' &&
                'tasks' in formData
              ) {
                const tasksData = formData.tasks;
                if (Array.isArray(tasksData)) {
                  // 转换 API 格式到 FlowAction 格式，完整解析所有字段
                  updates.tasks = tasksData.map((task) => ({
                    id: task.id || uuidv4(), // 如果没有 id 则生成新的
                    name: task.name || '新任务',
                    continueOnError: task.continueOnError ?? false,
                    ...(task.maxRetriesForConnection !== undefined && {
                      maxRetriesForConnection: task.maxRetriesForConnection,
                    }),
                    ...(task.aiActionContext && typeof task.aiActionContext === 'string' && task.aiActionContext.trim()
                      ? { aiActionContext: task.aiActionContext }
                      : {}),
                    flow: Array.isArray(task.flow)
                      ? parseFlow(task.flow).map((action) => ({
                          ...action,
                          id: action.id || uuidv4(), // 为每个 action 添加 id
                          enabled: action.enabled !== false, // 确保 enabled 字段存在，默认为 true
                        }))
                      : [],
                  }));
                }
              }
              break;

            case 'ai':
              // formData 应该是一个字符串
              if (typeof formData === 'string') {
                updates.aiPrompt = formData;
              }
              break;

            case 'siteScript':
              // formData 应该是一个字符串
              if (typeof formData === 'string') {
                updates.siteScript = formData;
              }
              break;

            case 'command':
              // formData 应该是一个字符串
              if (typeof formData === 'string') {
                updates.command = formData;
              }
              break;

            case 'connectWindow':
              // formData 应该是一个对象 { windowId?, windowTitle? }
              if (formData && typeof formData === 'object') {
                updates.connectWindowId = formData.windowId
                  ? String(formData.windowId)
                  : '';
                updates.connectWindowTitle = formData.windowTitle || '';
              }
              break;

            case 'summarize':
              // formData 应该是一个对象 { fullPage?, locate? }
              if (formData && typeof formData === 'object') {
                updates.summarizeFullPage = formData.fullPage !== undefined ? formData.fullPage : true;
                updates.summarizeLocate = formData.locate;
              }
              break;
          }

          return updates;
        });
      },

      // 重置表单
      resetForm: () =>
        set({
          action: 'aiScript',
          meta: generateMeta(),
          tasks: [
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
          ],
          enableLoadingShade: true,
          aiPrompt: '点击搜索按钮',
          siteScript: 'console.log("Hello from Midscene");',
          siteScriptCmd: '',
          command: 'start',
          connectWindowId: '',
          connectWindowTitle: '',
          summarizeFullPage: true,
          summarizeLocate: undefined,
        }),
    }),
    {
      name: 'midscene-debug-storage',
      // 选择性持久化，排除一些运行时状态
      partialize: (state) => ({
        endpoint: state.endpoint,
        autoConnect: state.autoConnect,
        action: state.action,
        meta: state.meta,
        tasks: state.tasks,
        enableLoadingShade: state.enableLoadingShade,
        aiPrompt: state.aiPrompt,
        siteScript: state.siteScript,
        siteScriptCmd: state.siteScriptCmd,
        command: state.command,
        connectWindowId: state.connectWindowId,
        connectWindowTitle: state.connectWindowTitle,
        summarizeFullPage: state.summarizeFullPage,
        summarizeLocate: state.summarizeLocate,
        history: state.history,
        jsonParams: state.jsonParams,
        jsonOverrideEnabled: state.jsonOverrideEnabled,
      }),
    },
  ),
);
