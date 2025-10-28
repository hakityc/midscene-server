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

interface CommandFormProps {
  command: string;
  onChange: (command: string) => void;
}

export function CommandForm({ command, onChange }: CommandFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold">命令 *</Label>
        <Input
          value={command}
          onChange={(e) => onChange(e.target.value)}
          placeholder="start 或 stop"
          className="text-xs"
        />
        <p className="text-xs text-muted-foreground mt-1">
          💡 目前支持: start (启动), stop (停止)
        </p>
      </div>
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs font-semibold mb-2">可用命令：</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>
            • <code className="px-1 py-0.5 bg-background rounded">start</code> -
            启动服务
          </li>
          <li>
            • <code className="px-1 py-0.5 bg-background rounded">stop</code> -
            停止服务
          </li>
          <li className="text-amber-600 dark:text-amber-400">
            • 更多命令即将支持...
          </li>
        </ul>
      </div>
    </div>
  );
}

interface ConnectWindowFormProps {
  windowId: string;
  windowTitle: string;
  onWindowIdChange: (id: string) => void;
  onWindowTitleChange: (title: string) => void;
}

export function ConnectWindowForm({
  windowId,
  windowTitle,
  onWindowIdChange,
  onWindowTitleChange,
}: ConnectWindowFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold">窗口 ID (可选)</Label>
        <Input
          value={windowId}
          onChange={(e) => onWindowIdChange(e.target.value)}
          placeholder="例如: 12345"
          className="text-xs"
          type="number"
        />
        <p className="text-xs text-muted-foreground mt-1">
          💡 Windows 窗口的唯一 ID
        </p>
      </div>

      <div>
        <Label className="text-sm font-semibold">窗口标题 (可选)</Label>
        <Input
          value={windowTitle}
          onChange={(e) => onWindowTitleChange(e.target.value)}
          placeholder="例如: 记事本"
          className="text-xs"
        />
        <p className="text-xs text-muted-foreground mt-1">
          💡 窗口标题（支持模糊匹配）
        </p>
      </div>

      <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
          ⚠️ 注意
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-500">
          必须提供窗口 ID 或窗口标题其中之一。如果同时提供，优先使用窗口 ID。
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
      <p className="text-xs text-muted-foreground mt-2">请直接发送消息</p>
    </div>
  );
}
