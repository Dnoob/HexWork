import { ResponseGroup } from './groupMessages';
import { ThinkingSection } from './ThinkingSection';
import { StepsSection } from './StepsSection';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Bot } from 'lucide-react';

// 解析消息内容，分离思考部分和回复部分
const parseContent = (content: string): { thinking: string; reply: string } => {
  const thinkParts: string[] = [];
  const reply = content.replace(/<think>([\s\S]*?)<\/think>/g, (_match, p1: string) => {
    thinkParts.push(p1.trim());
    return '';
  }).trim();

  if (thinkParts.length > 0) {
    return { thinking: thinkParts.join('\n\n'), reply };
  }

  const openIndex = content.indexOf('<think>');
  if (openIndex !== -1) {
    return { thinking: content.slice(openIndex + 7).trim(), reply: '' };
  }
  return { thinking: '', reply: content };
};

interface ResponseBlockProps {
  group: ResponseGroup;
  isStreaming?: boolean;
  streamingContent?: string;
}

export const ResponseBlock = ({ group, isStreaming, streamingContent }: ResponseBlockProps) => {
  // 从 step 消息（带 toolCalls 的 assistant 消息）中提取思考内容
  const stepsThinking = group.steps
    .filter(m => m.role === 'assistant' && m.content)
    .map(m => parseContent(m.content).thinking)
    .filter(Boolean)
    .join('\n\n');

  // 确定最终显示的内容：流式内容优先
  const replyContent = isStreaming && streamingContent
    ? streamingContent
    : group.reply?.content || '';

  const { thinking: replyThinking, reply } = parseContent(replyContent);
  // 合并所有轮次的思考内容
  const thinking = [stepsThinking, replyThinking].filter(Boolean).join('\n\n');
  const hasSteps = group.steps.length > 0;

  return (
    <div className="py-2 px-4 animate-slide-up">
      <div className="max-w-3xl mx-auto">
        {/* 顶部标识 */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <Bot className="h-3.5 w-3.5 text-accent-lavender" />
          <span className="text-xs font-medium text-accent-lavender">HexWork</span>
        </div>

        <div className="pl-5">
          {/* 思考过程 */}
          {thinking && (
            <ThinkingSection
              content={thinking}
              isStreaming={isStreaming}
              hasReply={!!reply}
            />
          )}

          {/* 工具执行链 */}
          {hasSteps && (
            <StepsSection steps={group.steps} isStreaming={isStreaming && !group.reply} />
          )}

          {/* 最终回复 */}
          {reply && (
            <MarkdownRenderer content={reply} />
          )}

          {/* 流式光标 */}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
};
