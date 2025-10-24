import { ArrowRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOptimizationExamples } from '@/utils/promptOptimization';

interface OptimizationExamplesProps {
  actionType: string;
  onApplyExample: (original: string, optimized: string) => void;
}

export function OptimizationExamples({
  actionType,
  onApplyExample,
}: OptimizationExamplesProps) {
  const examples = getOptimizationExamples(actionType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          优化示例参考
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {examples.map((example, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3 bg-card">
            {/* 原始提示词 */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                优化前：
              </div>
              <div className="text-sm p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
                {example.original}
              </div>
            </div>

            {/* 箭头 */}
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* 优化后提示词 */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                优化后：
              </div>
              <div className="text-sm p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded whitespace-pre-line">
                {example.optimized}
              </div>
            </div>

            {/* 改进点 */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                改进要点：
              </div>
              <ul className="space-y-1">
                {example.improvements.map((improvement, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 应用按钮 */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                onApplyExample(example.original, example.optimized)
              }
            >
              应用此示例
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
