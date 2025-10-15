import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 优化历史记录项
export interface OptimizationHistory {
  id: string;
  timestamp: number;
  original: string;
  optimized: string;
  targetAction: string;
  customOptimize?: string;
  qualityScore?: {
    precision: number;
    completeness: number;
    clarity: number;
    overall: number;
  };
}

// 图片上传项
export interface UploadedImage {
  id: string;
  url: string;
  name: string;
}

interface PromptState {
  // 表单状态
  inputPrompt: string;
  outputPrompt: string;
  customOptimize: string;
  targetAction: string;

  // UI 状态
  isOptimizing: boolean;
  showComparison: boolean;

  // 上传的图片
  uploadedImages: UploadedImage[];

  // 优化历史记录
  optimizationHistory: OptimizationHistory[];
  maxHistory: number;

  // 常用配置
  recentTargetActions: string[];
  recentCustomOptimizations: string[];

  // Actions
  setInputPrompt: (prompt: string) => void;
  setOutputPrompt: (prompt: string) => void;
  setCustomOptimize: (optimize: string) => void;
  setTargetAction: (action: string) => void;
  setIsOptimizing: (optimizing: boolean) => void;
  setShowComparison: (show: boolean) => void;

  // 图片操作
  addImage: (image: UploadedImage) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;

  // 优化历史操作
  addOptimizationHistory: (item: OptimizationHistory) => void;
  removeOptimizationHistory: (id: string) => void;
  clearOptimizationHistory: () => void;
  loadHistoryItem: (item: OptimizationHistory) => void;

  // 常用配置管理
  addRecentTargetAction: (action: string) => void;
  addRecentCustomOptimization: (optimization: string) => void;

  // 重置
  reset: () => void;
  resetForm: () => void;
}

export const usePromptStore = create<PromptState>()(
  persist(
    (set) => ({
      // 初始状态
      inputPrompt: '',
      outputPrompt: '',
      customOptimize: '',
      targetAction: 'all',

      isOptimizing: false,
      showComparison: false,

      uploadedImages: [],

      optimizationHistory: [],
      maxHistory: 20,

      recentTargetActions: ['all'],
      recentCustomOptimizations: [],

      // 基础 Actions
      setInputPrompt: (prompt) => set({ inputPrompt: prompt }),
      setOutputPrompt: (prompt) => set({ outputPrompt: prompt }),
      setCustomOptimize: (optimize) => set({ customOptimize: optimize }),
      setTargetAction: (action) => set({ targetAction: action }),
      setIsOptimizing: (optimizing) => set({ isOptimizing: optimizing }),
      setShowComparison: (show) => set({ showComparison: show }),

      // 图片操作
      addImage: (image) =>
        set((state) => ({
          uploadedImages: [...state.uploadedImages, image],
        })),

      removeImage: (id) =>
        set((state) => ({
          uploadedImages: state.uploadedImages.filter((img) => img.id !== id),
        })),

      clearImages: () => set({ uploadedImages: [] }),

      // 优化历史操作
      addOptimizationHistory: (item) =>
        set((state) => ({
          optimizationHistory: [item, ...state.optimizationHistory].slice(
            0,
            state.maxHistory,
          ),
        })),

      removeOptimizationHistory: (id) =>
        set((state) => ({
          optimizationHistory: state.optimizationHistory.filter(
            (item) => item.id !== id,
          ),
        })),

      clearOptimizationHistory: () => set({ optimizationHistory: [] }),

      loadHistoryItem: (item) =>
        set({
          inputPrompt: item.original,
          outputPrompt: item.optimized,
          targetAction: item.targetAction,
          customOptimize: item.customOptimize || '',
          showComparison: true,
        }),

      // 常用配置管理
      addRecentTargetAction: (action) =>
        set((state) => {
          const recent = state.recentTargetActions.filter((a) => a !== action);
          return {
            recentTargetActions: [action, ...recent].slice(0, 10),
          };
        }),

      addRecentCustomOptimization: (optimization) =>
        set((state) => {
          if (!optimization.trim()) return state;
          const recent = state.recentCustomOptimizations.filter(
            (o) => o !== optimization,
          );
          return {
            recentCustomOptimizations: [optimization, ...recent].slice(0, 10),
          };
        }),

      // 重置
      reset: () =>
        set({
          inputPrompt: '',
          outputPrompt: '',
          customOptimize: '',
          targetAction: 'all',
          isOptimizing: false,
          showComparison: false,
          uploadedImages: [],
        }),

      resetForm: () =>
        set({
          inputPrompt: '',
          outputPrompt: '',
          customOptimize: '',
          uploadedImages: [],
          showComparison: false,
        }),
    }),
    {
      name: 'midscene-prompt-storage',
      // 选择性持久化
      partialize: (state) => ({
        customOptimize: state.customOptimize,
        targetAction: state.targetAction,
        optimizationHistory: state.optimizationHistory,
        recentTargetActions: state.recentTargetActions,
        recentCustomOptimizations: state.recentCustomOptimizations,
        maxHistory: state.maxHistory,
      }),
    },
  ),
);
