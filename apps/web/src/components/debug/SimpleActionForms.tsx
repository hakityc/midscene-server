import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AiFormProps {
  prompt: string;
  onChange: (prompt: string) => void;
}

export function AiForm({ prompt, onChange }: AiFormProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">AI 指令</Label>
      <Textarea
        value={prompt}
        onChange={(e) => onChange(e.target.value)}
        placeholder="输入 AI 指令，例如：点击搜索按钮"
        className="min-h-[120px] text-sm"
      />
      <p className="text-xs text-muted-foreground">
        💡 简单的 AI 指令，适用于单一操作
      </p>
    </div>
  );
}

interface SiteScriptFormProps {
  script: string;
  originalCmd?: string;
  onScriptChange: (script: string) => void;
  onOriginalCmdChange: (cmd: string) => void;
}

export function SiteScriptForm({
  script,
  originalCmd,
  onScriptChange,
  onOriginalCmdChange,
}: SiteScriptFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold">JavaScript 代码 *</Label>
        <Textarea
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          placeholder="document.querySelector('#button').click();"
          className="min-h-[160px] font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground mt-1">
          💡 在网站上执行的 JavaScript 代码
        </p>
      </div>

      <div>
        <Label className="text-sm font-semibold">原始命令 (可选)</Label>
        <Input
          value={originalCmd || ''}
          onChange={(e) => onOriginalCmdChange(e.target.value)}
          placeholder="原始命令描述"
          className="text-xs"
        />
      </div>
    </div>
  );
}

interface DownloadVideoFormProps {
  url: string;
  savePath?: string;
  onUrlChange: (url: string) => void;
  onSavePathChange: (path: string) => void;
}

export function DownloadVideoForm({
  url,
  savePath,
  onUrlChange,
  onSavePathChange,
}: DownloadVideoFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold">视频 URL *</Label>
        <Input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com/video.mp4"
          className="text-xs"
        />
      </div>

      <div>
        <Label className="text-sm font-semibold">保存路径 (可选)</Label>
        <Input
          value={savePath || ''}
          onChange={(e) => onSavePathChange(e.target.value)}
          placeholder="/path/to/save/video.mp4"
          className="text-xs"
        />
        <p className="text-xs text-muted-foreground mt-1">
          💡 留空则使用默认路径
        </p>
      </div>
    </div>
  );
}

interface GenericFormProps {
  actionType: string;
}

export function GenericForm({ actionType }: GenericFormProps) {
  return (
    <div className="p-4 bg-muted/50 border rounded-lg text-center">
      <p className="text-sm font-semibold text-muted-foreground">
        {actionType} 暂无可配置参数
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        请直接发送消息
      </p>
    </div>
  );
}

