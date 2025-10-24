import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  OptimizationSuggestion,
  QualityScore,
} from '@/utils/promptOptimization';

interface OptimizationSuggestionsProps {
  suggestions: OptimizationSuggestion[];
  score: QualityScore;
}

export function OptimizationSuggestions({
  suggestions,
  score,
}: OptimizationSuggestionsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '需改进';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高优先级';
      case 'medium':
        return '中优先级';
      default:
        return '低优先级';
    }
  };

  return (
    <div className="space-y-4">
      {/* 质量评分 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">质量评分</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 总分 */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">综合评分</span>
            <div className="text-right">
              <div
                className={`text-3xl font-bold ${getScoreColor(score.overall)}`}
              >
                {score.overall}
              </div>
              <div className="text-xs text-muted-foreground">
                {getScoreLabel(score.overall)}
              </div>
            </div>
          </div>

          {/* 分项评分 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">精确性</div>
              <div
                className={`text-xl font-semibold ${getScoreColor(score.precision)}`}
              >
                {score.precision}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${score.precision}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">完整性</div>
              <div
                className={`text-xl font-semibold ${getScoreColor(score.completeness)}`}
              >
                {score.completeness}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${score.completeness}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">清晰度</div>
              <div
                className={`text-xl font-semibold ${getScoreColor(score.clarity)}`}
              >
                {score.clarity}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${score.clarity}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 优化建议 */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              优化建议 ({suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getPriorityIcon(suggestion.priority)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {getPriorityLabel(suggestion.priority)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {suggestion.type === 'precision'
                          ? '精确性'
                          : suggestion.type === 'completeness'
                            ? '完整性'
                            : suggestion.type === 'clarity'
                              ? '清晰度'
                              : '结构'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">
                        ⚠️ {suggestion.issue}
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-pre-line">
                        💡 {suggestion.suggestion}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 无建议时显示 */}
      {suggestions.length === 0 && score.overall >= 80 && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <div className="text-lg font-medium mb-1">提示词质量优秀！</div>
            <div className="text-sm text-muted-foreground">
              暂无需要改进的地方
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
