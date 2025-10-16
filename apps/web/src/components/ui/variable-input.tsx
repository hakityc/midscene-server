import * as React from 'react';
import { cn } from '@/lib/utils';

interface VariableInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * 支持变量语法的输入框组件（支持中文输入法）
 * 变量格式: ${变量名}
 * 变量会以淡蓝色背景 + 加粗样式高亮显示
 */
export function VariableInput({
  value,
  onChange,
  className,
  ...props
}: VariableInputProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const highlightRef = React.useRef<HTMLDivElement>(null);

  // 同步滚动位置
  const syncScroll = React.useCallback(() => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  }, []);

  // 渲染高亮文本
  const highlightedText = React.useMemo(() => {
    if (!value) return '';

    // 将变量替换为带样式的 span
    const parts: string[] = [];
    let lastIndex = 0;

    // 匹配完整的变量 ${变量名}
    const completeRegex = /\$\{([^}]+)\}/g;
    // 匹配未完成的变量 ${变量名（没有结尾的}）
    const incompleteRegex = /\$\{([^}]*)$/;

    let match: RegExpExecArray | null;

    // 首先处理完整的变量
    // biome-ignore lint/suspicious/noAssignInExpressions: 这是正则表达式匹配的标准用法
    while ((match = completeRegex.exec(value)) !== null) {
      // 添加变量前的普通文本
      if (match.index > lastIndex) {
        const text = value.substring(lastIndex, match.index);
        parts.push(escapeHtml(text));
      }

      // 添加高亮的变量
      parts.push(
        `<mark class="variable-highlight">${escapeHtml(match[0])}</mark>`,
      );

      lastIndex = match.index + match[0].length;
    }

    // 处理剩余的文本，检查是否有未完成的变量
    if (lastIndex < value.length) {
      const remainingText = value.substring(lastIndex);
      const incompleteMatch = incompleteRegex.exec(remainingText);

      if (incompleteMatch) {
        // 有未完成的变量
        if (incompleteMatch.index > 0) {
          // 添加变量前的普通文本
          parts.push(
            escapeHtml(remainingText.substring(0, incompleteMatch.index)),
          );
        }
        // 添加高亮的未完成变量
        parts.push(
          `<mark class="variable-highlight">${escapeHtml(incompleteMatch[0])}</mark>`,
        );
      } else {
        // 没有未完成的变量，添加剩余文本
        parts.push(escapeHtml(remainingText));
      }
    }

    return parts.join('');
  }, [value]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 高亮显示层 */}
      <div
        ref={highlightRef}
        className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden',
          'whitespace-pre px-3 py-1.5 text-sm leading-6',
          'rounded-md',
        )}
        style={{
          color: 'inherit', // 显示普通文字颜色
          wordBreak: 'break-all',
          overflowX: 'auto',
          overflowY: 'hidden',
          zIndex: 1,
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 内容已通过 escapeHtml 函数转义，是安全的
        dangerouslySetInnerHTML={{ __html: highlightedText || '&nbsp;' }}
      />

      {/* 实际输入框 */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        className={cn(
          'relative flex h-9 w-full rounded-md border border-input',
          'bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'caret-foreground text-transparent', // 保持光标可见，但文字透明
        )}
        style={{ zIndex: 2 }}
        {...props}
      />

      {/* 变量高亮样式 */}
      <style>{`
        .variable-highlight {
          background-color: #dbeafe;
          border-radius: 4px;
          padding: 2px 4px;
        }

        @media (prefers-color-scheme: dark) {
          .variable-highlight {
            background-color: rgba(30, 58, 138, 0.3);
          }
        }
      `}</style>
    </div>
  );
}

// HTML 转义函数，防止 XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
