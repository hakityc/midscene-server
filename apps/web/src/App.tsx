import { ThemeProvider } from '@/hooks/useTheme';
import MidsceneDebugPage from '@/pages/midsceneDebugPage';

export function App() {
  return (
    <ThemeProvider>
      <MidsceneDebugPage />
    </ThemeProvider>
  );
}
