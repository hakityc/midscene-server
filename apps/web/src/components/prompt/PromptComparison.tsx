import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface PromptComparisonProps {
  original: string;
  optimized: string;
}

export function PromptComparison({
  original,
  optimized,
}: PromptComparisonProps) {
  if (!original || !optimized) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">对比视图</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 原始提示词 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs">
                原始
              </span>
            </Label>
            <div className="p-4 min-h-[120px] rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {original}
              </pre>
            </div>
          </div>

          {/* 箭头（仅在大屏显示） */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="p-2 rounded-full bg-primary text-primary-foreground shadow-lg">
              <ArrowRight className="h-6 w-6" />
            </div>
          </div>

          {/* 优化后提示词 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                优化后
              </span>
            </Label>
            <div className="p-4 min-h-[120px] rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {optimized}
              </pre>
            </div>
          </div>
        </div>

        {/* 变化统计 */}
        <div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
          <div>
            原始长度: <span className="font-medium">{original.length}</span>{' '}
            字符
          </div>
          <div>→</div>
          <div>
            优化后长度: <span className="font-medium">{optimized.length}</span>{' '}
            字符
          </div>
          <div>
            变化:{' '}
            <span
              className={
                optimized.length > original.length
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }
            >
              {optimized.length > original.length ? '+' : ''}
              {optimized.length - original.length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
