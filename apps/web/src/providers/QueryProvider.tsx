import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 默认配置
      staleTime: 1000 * 60 * 5, // 5 分钟
      gcTime: 1000 * 60 * 10, // 10 分钟 (原 cacheTime)
      retry: 1, // 失败重试 1 次
      refetchOnWindowFocus: false, // 窗口聚焦时不自动重新获取
    },
    mutations: {
      // mutation 默认配置
      retry: 0, // 不重试
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider
 * 用于提供全局的查询客户端上下文
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export { queryClient };
