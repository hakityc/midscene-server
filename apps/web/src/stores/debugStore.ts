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
import { parseFlow } from '@/utils/jsonParser';

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

  // 其他 Action 状态
  aiPrompt: string;
  siteScript: string;
  siteScriptCmd: string;
  command: string;
  connectWindowId: string;
  connectWindowTitle: string;

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
  setAiPrompt: (prompt: string) => void;
  setSiteScript: (script: string) => void;
  setSiteScriptCmd: (cmd: string) => void;
  setCommand: (command: string) => void;
  setConnectWindowId: (id: string) => void;
  setConnectWindowTitle: (title: string) => void;
  setShowHistory: (show: boolean) => void;

  // 历史记录操作
  addHistory: (message: WsInboundMessage, label?: string) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  loadHistory: (item: HistoryItem) => void;

  // 表单数据更新
  updateFromJson: (formData: any) => void;
  resetForm: () => void;
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

      aiPrompt: '点击搜索按钮',
      siteScript: 'console.log("Hello from Midscene");',
      siteScriptCmd: '',
      command: 'start',
      connectWindowId: '',
      connectWindowTitle: '',

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
      setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
      setSiteScript: (script) => set({ siteScript: script }),
      setSiteScriptCmd: (cmd) => set({ siteScriptCmd: cmd }),
      setCommand: (command) => set({ command }),
      setConnectWindowId: (id) => set({ connectWindowId: id }),
      setConnectWindowTitle: (title) => set({ connectWindowTitle: title }),
      setShowHistory: (show) => set({ showHistory: show }),

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
        const msg = item.message;
        const newState: Partial<DebugState> = {
          action: msg.payload.action as WebSocketAction,
          meta: msg.meta,
          showHistory: false,
        };

        // 根据 action 类型恢复状态
        if (msg.payload.action === 'aiScript') {
          const params = msg.payload.params as { tasks: Task[] };
          if (params.tasks) {
            newState.tasks = params.tasks.map((t) => ({
              ...t,
              id: uuidv4(),
            }));
          }
          newState.enableLoadingShade =
            msg.payload.option?.includes('LOADING_SHADE') || false;
        } else if (msg.payload.action === 'ai') {
          newState.aiPrompt = msg.payload.params as string;
        } else if (msg.payload.action === 'siteScript') {
          newState.siteScript = msg.payload.params as string;
          newState.siteScriptCmd = msg.payload.originalCmd || '';
        } else if (msg.payload.action === 'command') {
          newState.command = msg.payload.params as string;
        } else if (msg.payload.action === 'connectWindow') {
          const params = msg.payload.params as {
            windowId?: number;
            windowTitle?: string;
          };
          newState.connectWindowId = params.windowId
            ? String(params.windowId)
            : '';
          newState.connectWindowTitle = params.windowTitle || '';
        }

        set(newState);
      },

      // 从 JSON 更新表单
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
                  // 转换 API 格式到 FlowAction 格式
                  updates.tasks = tasksData.map((task) => ({
                    id: task.id || uuidv4(), // 如果没有 id 则生成新的
                    name: task.name || '新任务',
                    continueOnError: task.continueOnError ?? false,
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
        history: state.history,
      }),
    },
  ),
);
