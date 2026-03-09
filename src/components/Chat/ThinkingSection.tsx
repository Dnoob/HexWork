import { useState, useRef, useEffect } from 'react';
import { Brain } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ThinkingSectionProps {
  content: string;
  isStreaming?: boolean;   // 是否正在流式接收
  hasReply?: boolean;      // 是否已有最终回复
}

export const ThinkingSection = ({ content, isStreaming, hasReply }: ThinkingSectionProps) => {
  // 流式中且无回复时自动展开，完成后自动折叠
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // 流式中自动展开
  useEffect(() => {
    if (isStreaming && !hasReply) {
      setExpanded(true);
    } else if (!isStreaming && hasReply) {
      setExpanded(false);
    }
  }, [isStreaming, hasReply]);

  // 测量内容高度用于动画
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [content]);

  const isThinking = isStreaming && !hasReply;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-accent-lavender hover:text-accent-lavender/80 transition-colors"
      >
        <Brain className={`h-3.5 w-3.5 ${isThinking ? 'animate-pulse' : ''}`} />
        <span>{isThinking ? '思考中...' : '查看思考过程'}</span>
        <svg
          className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: expanded ? `${contentHeight + 16}px` : '0px' }}
      >
        <div ref={contentRef} className="mt-1.5 pl-5 border-l-2 border-dashed border-accent-lavender/30">
          <div className="text-muted-foreground text-xs">
            <MarkdownRenderer content={content} />
          </div>
        </div>
      </div>
    </div>
  );
};
