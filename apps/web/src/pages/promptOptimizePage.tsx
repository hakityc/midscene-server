import {
  Copy,
  Image as ImageIcon,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { OptimizationExamples } from '@/components/prompt/OptimizationExamples';
import { OptimizationSuggestions } from '@/components/prompt/OptimizationSuggestions';
import { PromptComparison } from '@/components/prompt/PromptComparison';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { usePromptOptimizeApi } from '@/hooks/usePromptOptimizeApi';
import { type UploadedImage, usePromptStore } from '@/stores';
import {
  analyzePrompt,
  calculateQualityScore,
  generateOptimizedPrompt,
  type OptimizationSuggestion,
  type QualityScore,
} from '@/utils/promptOptimization';

export default function PromptOptimizePage() {
  const customOptimizeId = useId();
  const targetActionId = useId();
  const inputPromptId = useId();
  const imageUploadId = useId();

  // 使用 Zustand store
  const {
    inputPrompt,
    outputPrompt,
    customOptimize,
    targetAction,
    showComparison,
    uploadedImages,
    setInputPrompt,
    setOutputPrompt,
    setCustomOptimize,
    setTargetAction,
    setShowComparison,
    addImage,
    removeImage,
    reset,
    addOptimizationHistory,
    addRecentTargetAction,
    addRecentCustomOptimization,
  } = usePromptStore();

  // 使用 React Query API hook
  const { mutate: optimizePrompt, isPending: isOptimizing } =
    usePromptOptimizeApi();

  // 实时分析状态
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [qualityScore, setQualityScore] = useState<QualityScore>({
    precision: 0,
    completeness: 0,
    clarity: 0,
    overall: 0,
  });

  // 实时分析输入提示词
  useEffect(() => {
    if (inputPrompt.trim()) {
      const newSuggestions = analyzePrompt(inputPrompt, targetAction);
      const newScore = calculateQualityScore(inputPrompt, targetAction);
      setSuggestions(newSuggestions);
      setQualityScore(newScore);
    } else {
      setSuggestions([]);
      setQualityScore({
        precision: 0,
        completeness: 0,
        clarity: 0,
        overall: 0,
      });
    }
  }, [inputPrompt, targetAction]);

  // 优化提示词的处理函数
  const handleOptimize = async () => {
    // 记录常用配置
    addRecentTargetAction(targetAction);
    if (customOptimize) {
      addRecentCustomOptimization(customOptimize);
    }

    // 使用 React Query mutation
    optimizePrompt(
      {
        prompt: inputPrompt,
        targetAction,
        customOptimize,
        images: uploadedImages.map((i) => i.url),
      },
      {
        onSuccess: (data) => {
          const optimized = data.optimized || inputPrompt;
          setOutputPrompt(optimized);
          setShowComparison(true);

          // 保存到历史记录
          addOptimizationHistory({
            id: `opt-${Date.now()}`,
            timestamp: Date.now(),
            original: inputPrompt,
            optimized,
            targetAction,
            customOptimize,
            qualityScore: data.qualityScore || qualityScore,
          });
        },
        onError: () => {
          // 后端失败时，使用本地规则引擎降级
          const optimized = generateOptimizedPrompt(
            inputPrompt,
            targetAction,
            customOptimize,
          );
          setOutputPrompt(optimized);
          setShowComparison(true);

          // 保存到历史记录
          addOptimizationHistory({
            id: `opt-${Date.now()}`,
            timestamp: Date.now(),
            original: inputPrompt,
            optimized,
            targetAction,
            customOptimize,
            qualityScore,
          });
        },
      },
    );
  };

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          const newImage: UploadedImage = {
            id: `${Date.now()}-${Math.random()}`,
            url,
            name: file.name,
          };
          addImage(newImage);
        };
        reader.readAsDataURL(file);
      }
    });

    // 重置 input 以允许上传相同文件
    e.target.value = '';
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    if (outputPrompt) {
      await navigator.clipboard.writeText(outputPrompt);
      // 可以添加 toast 提示
    }
  };

  // 重置表单
  const handleReset = () => {
    reset();
    setSuggestions([]);
    setQualityScore({
      precision: 0,
      completeness: 0,
      clarity: 0,
      overall: 0,
    });
  };

  // 应用示例
  const handleApplyExample = (original: string, optimized: string) => {
    setInputPrompt(original);
    setOutputPrompt(optimized);
    setShowComparison(true);
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="container mx-auto p-6 max-w-[1600px]">
        {/* 标题栏 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">
                  Midscene 提示词优化
                </CardTitle>
              </div>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                重置
              </Button>
            </div>
            <p className="text-muted-foreground mt-2">
              优化你的 Midscene 提示词，让 AI 更好地理解你的意图
            </p>
          </CardHeader>
        </Card>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：输入区 */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>原始提示词</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4">
              {/* 配置选项 */}
              <div className="space-y-2">
                <Label htmlFor={targetActionId}>目标动作</Label>
                <Select value={targetAction} onValueChange={setTargetAction}>
                  <SelectTrigger id={targetActionId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部动作</SelectItem>
                    <SelectItem value="aiTap">点击 (aiTap)</SelectItem>
                    <SelectItem value="aiInput">输入 (aiInput)</SelectItem>
                    <SelectItem value="aiAssert">断言 (aiAssert)</SelectItem>
                    <SelectItem value="aiHover">悬停 (aiHover)</SelectItem>
                    <SelectItem value="aiScroll">滚动 (aiScroll)</SelectItem>
                    <SelectItem value="aiWaitFor">等待 (aiWaitFor)</SelectItem>
                    <SelectItem value="aiKeyboardPress">
                      按键 (aiKeyboardPress)
                    </SelectItem>
                    <SelectItem value="sleep">延迟 (sleep)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={customOptimizeId}>
                  自定义优化方向{' '}
                  <span className="text-muted-foreground text-xs">(可选)</span>
                </Label>
                <Textarea
                  id={customOptimizeId}
                  placeholder="例如：使提示词更简洁明了、增加上下文信息、使用更精确的定位描述等"
                  value={customOptimize}
                  onChange={(e) => setCustomOptimize(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <Separator />

              {/* 图片上传区域 */}
              <div className="space-y-2">
                <Label>
                  上传截图辅助优化{' '}
                  <span className="text-muted-foreground text-xs">(可选)</span>
                </Label>

                {/* 上传按钮和预览 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById(imageUploadId)?.click()
                      }
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      选择图片
                    </Button>
                    <input
                      id={imageUploadId}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {uploadedImages.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        已上传 {uploadedImages.length} 张图片
                      </span>
                    )}
                  </div>

                  {/* 图片预览网格 */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedImages.map((image) => (
                        <div
                          key={image.id}
                          className="relative group rounded-md border overflow-hidden bg-muted"
                        >
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeImage(image.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                            {image.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 空状态提示 */}
                  {uploadedImages.length === 0 && (
                    <Card className="border-dashed bg-muted/30">
                      <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          上传页面截图，帮助 AI 更好地理解上下文
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          支持 JPG、PNG、GIF 等格式
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <Separator />

              {/* 输入文本框 */}
              <div className="flex-1 flex flex-col space-y-2">
                <Label htmlFor={inputPromptId}>请输入你的提示词</Label>
                <Textarea
                  id={inputPromptId}
                  placeholder="例如：点击搜索按钮"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  className="flex-1 min-h-[200px] resize-none font-mono"
                />
              </div>

              {/* 优化按钮 */}
              <Button
                onClick={handleOptimize}
                disabled={!inputPrompt || isOptimizing}
                size="lg"
                className="w-full"
              >
                <Send className="h-5 w-5 mr-2" />
                {isOptimizing ? '优化中...' : '开始优化'}
              </Button>
            </CardContent>
          </Card>

          {/* 中间：分析和建议 */}
          <div className="lg:col-span-1 space-y-6">
            {inputPrompt ? (
              <>
                {/* 质量评分和建议 */}
                <OptimizationSuggestions
                  suggestions={suggestions}
                  score={qualityScore}
                />

                {/* 优化示例 */}
                <OptimizationExamples
                  actionType={targetAction}
                  onApplyExample={handleApplyExample}
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <div className="text-lg font-medium mb-1">开始优化提示词</div>
                  <div className="text-sm text-muted-foreground">
                    在左侧输入您的提示词，AI 将实时分析并提供优化建议
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：输出和对比 */}
          <div className="lg:col-span-1 space-y-6">
            {showComparison && outputPrompt ? (
              <>
                {/* 对比视图 */}
                <PromptComparison
                  original={inputPrompt}
                  optimized={outputPrompt}
                />

                {/* 操作按钮 */}
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleCopy}
                      disabled={!outputPrompt}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      复制优化后的提示词
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setInputPrompt(outputPrompt);
                        setOutputPrompt('');
                        setShowComparison(false);
                      }}
                    >
                      使用优化结果继续优化
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-lg font-medium mb-1">优化结果</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    点击"开始优化"查看优化后的提示词
                  </div>
                  {inputPrompt && (
                    <div className="p-4 bg-muted rounded-lg text-xs text-muted-foreground">
                      当前质量评分：
                      <span className="text-lg font-bold text-primary ml-2">
                        {qualityScore.overall}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 示例提示 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">常用示例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left"
                onClick={() => {
                  setInputPrompt('点击页面上的登录按钮');
                  setTargetAction('aiTap');
                }}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="font-semibold text-sm">aiTap 示例</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    点击页面上的登录按钮
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left"
                onClick={() => {
                  setInputPrompt('在搜索框中输入关键词');
                  setTargetAction('aiInput');
                }}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="font-semibold text-sm">aiInput 示例</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    在搜索框中输入关键词
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left"
                onClick={() => {
                  setInputPrompt('检查页面是否显示"登录成功"提示');
                  setTargetAction('aiAssert');
                }}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="font-semibold text-sm">aiAssert 示例</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    检查页面是否显示"登录成功"提示
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left"
                onClick={() => {
                  setInputPrompt('鼠标悬停在用户头像上');
                  setTargetAction('aiHover');
                }}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="font-semibold text-sm">aiHover 示例</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    鼠标悬停在用户头像上
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left"
                onClick={() => {
                  setInputPrompt('向下滚动页面到底部');
                  setTargetAction('aiScroll');
                }}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="font-semibold text-sm">aiScroll 示例</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    向下滚动页面到底部
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left"
                onClick={() => {
                  setInputPrompt('等待加载完成');
                  setTargetAction('aiWaitFor');
                }}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="font-semibold text-sm">aiWaitFor 示例</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    等待加载完成
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left"
                onClick={() => {
                  setInputPrompt('按下回车键提交表单');
                  setTargetAction('aiKeyboardPress');
                }}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="font-semibold text-sm">
                    aiKeyboardPress 示例
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    按下回车键提交表单
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left"
                onClick={() => {
                  setInputPrompt('等待 2 秒');
                  setTargetAction('sleep');
                }}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="font-semibold text-sm">sleep 示例</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    等待 2 秒
                  </span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
