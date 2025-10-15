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
        }

        set(newState);
      },

      // 从 JSON 更新表单
      updateFromJson: (formData) => {
        const updates: Partial<DebugState> = {};

        if (formData.action) updates.action = formData.action;
        if (formData.meta) updates.meta = formData.meta;

        // 根据 Action 类型更新相应的状态
        switch (formData.action) {
          case 'aiScript':
            if (formData.tasks) updates.tasks = formData.tasks;
            if (typeof formData.enableLoadingShade === 'boolean') {
              updates.enableLoadingShade = formData.enableLoadingShade;
            }
            break;
          case 'ai':
            if (formData.aiPrompt) updates.aiPrompt = formData.aiPrompt;
            break;
          case 'siteScript':
            if (formData.siteScript) updates.siteScript = formData.siteScript;
            if (formData.siteScriptCmd)
              updates.siteScriptCmd = formData.siteScriptCmd;
            break;
          case 'command':
            if (formData.params) updates.command = formData.params as string;
            break;
        }

        set(updates);
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
        history: state.history,
      }),
    },
  ),
);
