import * as React from 'react';
import { cn } from '@/lib/utils';

interface VariableTextareaProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

/**
 * 支持变量语法的多行文本框组件（基于 contenteditable）
 * 变量格式: ${变量名}
 * 变量会以淡蓝色背景 + 加粗样式高亮显示
 */
export function VariableTextarea({
  value,
  onChange,
  className,
  rows = 3,
  ...props
}: VariableTextareaProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const isInternalUpdateRef = React.useRef(false);
  const lastValueRef = React.useRef(value);

  // 渲染高亮文本
  const renderHighlightedContent = React.useMemo(() => {
    if (!value) return '';

    // 只匹配完整的变量 ${变量名}
    const completeRegex = /\$\{([^}]+)\}/g;
    const parts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // 处理完整的变量
    // biome-ignore lint/suspicious/noAssignInExpressions: 这是正则表达式匹配的标准用法
    while ((match = completeRegex.exec(value)) !== null) {
      // 添加变量前的普通文本
      if (match.index > lastIndex) {
        const beforeText = value.substring(lastIndex, match.index);
        parts.push(escapeHtml(beforeText));
      }

      // 添加高亮的变量
      parts.push(
        `<mark class="variable-highlight">${escapeHtml(match[0])}</mark>`,
      );

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余的文本
    if (lastIndex < value.length) {
      const remainingText = value.substring(lastIndex);
      parts.push(escapeHtml(remainingText));
    }

    return parts.join('');
  }, [value]);

  // 获取纯文本内容
  const getPlainText = React.useCallback(() => {
    if (!editorRef.current) return '';
    return editorRef.current.textContent || editorRef.current.innerText || '';
  }, []);

  // 更新编辑器内容（只在外部值变化时调用）
  const updateEditorContent = React.useCallback(() => {
    if (!editorRef.current || isInternalUpdateRef.current) return;

    const editor = editorRef.current;
    const currentText = getPlainText();

    // 如果内容没有变化，不需要更新
    if (currentText === value) return;

    isInternalUpdateRef.current = true;

    // 保存光标位置
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const isEditorFocused = document.activeElement === editor;

    // 更新内容
    editor.innerHTML = renderHighlightedContent || '<br>';

    // 恢复光标位置
    if (isEditorFocused && range && editor.firstChild) {
      try {
        const newRange = document.createRange();
        const textNode = editor.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const maxOffset = textNode.textContent?.length || 0;
          const targetOffset = Math.min(range.startOffset, maxOffset);
          newRange.setStart(textNode, targetOffset);
          newRange.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(newRange);
        } else {
          // 如果没有文本节点，将光标放在末尾
          newRange.selectNodeContents(editor);
          newRange.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(newRange);
        }
      } catch {
        // 如果恢复失败，将光标放在末尾
        const newRange = document.createRange();
        newRange.selectNodeContents(editor);
        newRange.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(newRange);
      }
    }

    isInternalUpdateRef.current = false;
  }, [value, getPlainText, renderHighlightedContent]);

  // 处理输入事件
  const handleInput = React.useCallback(() => {
    if (isInternalUpdateRef.current) return;

    const plainText = getPlainText();

    // 检查是否需要自动补全变量语法
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const cursorPosition = range.startOffset;
      const textBeforeCursor = plainText.substring(0, cursorPosition);

      // 检查是否在输入 ${ 后需要自动补全
      if (
        cursorPosition >= 2 &&
        textBeforeCursor[cursorPosition - 2] === '$' &&
        textBeforeCursor[cursorPosition - 1] === '{'
      ) {
        const textAfterCursor = plainText.substring(cursorPosition);
        if (!textAfterCursor.startsWith('}')) {
          // 自动补全
          const beforeCursor = plainText.substring(0, cursorPosition);
          const afterCursor = plainText.substring(cursorPosition);
          const autoCompletedValue = beforeCursor + '}' + afterCursor;

          lastValueRef.current = autoCompletedValue;
          onChange(autoCompletedValue);
          return;
        }
      }
    }

    // 正常更新
    if (plainText !== lastValueRef.current) {
      lastValueRef.current = plainText;
      onChange(plainText);
    }
  }, [getPlainText, onChange]);

  // 处理粘贴事件
  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');

      // 插入纯文本
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);

        // 触发输入事件
        handleInput();
      }
    },
    [handleInput],
  );

  // 当外部 value 变化时更新编辑器
  React.useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      updateEditorContent();
    }
  }, [value, updateEditorContent]);

  // 组件挂载时初始化内容
  React.useEffect(() => {
    if (editorRef.current && !editorRef.current.textContent) {
      editorRef.current.innerHTML = renderHighlightedContent || '<br>';
    }
  }, [renderHighlightedContent]);

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className={cn(
          'min-h-[60px] w-full rounded-md border border-input',
          'bg-background px-3 py-2 text-sm shadow-sm transition-colors',
          'placeholder:text-muted-foreground focus-visible:outline-none',
          'focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-vertical font-mono text-xs',
          className,
        )}
        style={{
          minHeight: `${rows * 1.5}em`,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
        {...props}
      />

      {/* 变量高亮样式 */}
      <style>{`
        .variable-highlight {
          background-color: #dbeafe;
          border-radius: 4px;
          padding: 2px 4px;
          font-weight: normal;
        }

        @media (prefers-color-scheme: dark) {
          .variable-highlight {
            background-color: rgba(30, 58, 138, 0.3);
          }
        }
      `}</style>
    </>
  );
}

// HTML 转义函数，防止 XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
