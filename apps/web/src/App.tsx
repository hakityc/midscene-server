import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import HomePage from '@/pages/homePage';
import MidsceneDebugPage from '@/pages/midsceneDebugPage';
import PromptOptimizePage from '@/pages/promptOptimizePage';
import { QueryProvider } from '@/providers';

export function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<HomePage />}>
              <Route
                index
                element={<Navigate to="/midscene-debug" replace />}
              />
              <Route path="midscene-debug" element={<MidsceneDebugPage />} />
              <Route path="prompt-optimize" element={<PromptOptimizePage />} />
              {/* 后续可以添加更多路由 */}
            </Route>
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </QueryProvider>
  );
}
