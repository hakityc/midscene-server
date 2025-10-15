import { useMutation } from '@tanstack/react-query';

/**
 * 提示词优化请求参数
 */
interface OptimizePromptParams {
  prompt: string;
  targetAction: string;
  customOptimize?: string;
  images?: string[];
}

/**
 * 提示词优化响应
 */
interface OptimizePromptResponse {
  optimized: string;
  suggestions?: string[];
  qualityScore?: {
    precision: number;
    completeness: number;
    clarity: number;
    overall: number;
  };
}

/**
 * 调用后端 API 进行提示词优化
 */
const optimizePrompt = async (
  params: OptimizePromptParams,
): Promise<OptimizePromptResponse> => {
  const response = await fetch('/api/prompt-optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`优化失败: ${response.statusText}`);
  }

  return response.json();
};

/**
 * 使用 React Query 的提示词优化 Hook
 *
 * 用法示例：
 * ```tsx
 * const { mutate, isPending, isError, data } = usePromptOptimizeApi();
 *
 * const handleOptimize = () => {
 *   mutate({
 *     prompt: inputPrompt,
 *     targetAction: 'aiTap',
 *     customOptimize: '使提示词更简洁',
 *   }, {
 *     onSuccess: (data) => {
 *       console.log('优化成功:', data.optimized);
 *     },
 *     onError: (error) => {
 *       console.error('优化失败:', error);
 *     },
 *   });
 * };
 * ```
 */
export function usePromptOptimizeApi() {
  return useMutation({
    mutationFn: optimizePrompt,
    // 可以在这里添加全局的成功/错误处理
    onSuccess: (data) => {
      console.log('Prompt optimization successful:', data);
    },
    onError: (error) => {
      console.error('Prompt optimization failed:', error);
    },
  });
}
