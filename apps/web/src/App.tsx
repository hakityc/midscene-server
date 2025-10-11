import MidsceneDebugPage from "@/pages/midsceneDebugPage";
import { ThemeProvider } from "@/hooks/useTheme";

export function App(){
  return (
    <ThemeProvider>
      <MidsceneDebugPage />
    </ThemeProvider>
  );
}
