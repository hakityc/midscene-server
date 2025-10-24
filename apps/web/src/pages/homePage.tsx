import { Bug, Sparkles } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  {
    id: 'midscene-debug',
    label: 'Midscene 调试工具',
    icon: <Bug className="h-4 w-4" />,
    path: '/midscene-debug',
  },
  {
    id: 'prompt-optimize',
    label: '提示词优化',
    icon: <Sparkles className="h-4 w-4" />,
    path: '/prompt-optimize',
  },
  // 后续可以添加更多导航项
];

export default function HomePage() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧边栏 */}
      <aside className="w-64 border-r bg-card flex flex-col">
        {/* Logo 区域 */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Midscene Server</h1>
            <ThemeToggle />
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.id} to={item.path}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    isActive
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* 底部信息 */}
        <div className="p-4 border-t">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Version: 0.1.0</p>
            <p className="text-xs text-muted-foreground mt-1">
              © 2025 Midscene
            </p>
          </Card>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
