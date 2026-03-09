import { useEffect, useRef, useMemo } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { groupMessages } from './groupMessages';
import { ResponseBlock } from './ResponseBlock';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MessageList = () => {
  const messages = useChatStore(s => s.messages);
  const streamingContent = useChatStore(s => s.streamingContent);
  const isStreaming = useChatStore(s => s.isStreaming);
  const toolCallStatus = useChatStore(s => s.toolCallStatus);
  const pendingConfirmation = useChatStore(s => s.pendingConfirmation);
  const confirmToolCall = useChatStore(s => s.confirmToolCall);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, toolCallStatus, pendingConfirmation]);

  // 分组消息
  const displayItems = useMemo(() => groupMessages(messages), [messages]);

  // 判断最后一个组是否需要追加流式内容
  const lastItem = displayItems[displayItems.length - 1];
  const lastGroupIsStreaming = isStreaming && lastItem?.type === 'response' && !lastItem.reply;

  // 判断是否需要新建流式响应组（没有进行中的组时）
  const needsStreamingGroup = isStreaming && streamingContent && !lastGroupIsStreaming;
  // 流式中但既没有内容也没有工具状态 → 等待中
  const isWaiting = isStreaming && !streamingContent && !toolCallStatus && !pendingConfirmation
    && (!lastItem || lastItem.type === 'user');

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full text-muted-foreground/60 text-sm">
          发送消息开始对话
        </div>
      )}

      {displayItems.map((item, index) => {
        if (item.type === 'user') {
          const msg = item.message;
          return (
            <div key={msg.id} className="py-2 px-4 animate-slide-up">
              <div className="max-w-3xl mx-auto flex gap-3 justify-end">
                <div className="bg-primary/10 rounded-2xl px-4 py-2.5 max-w-[80%]">
                  {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={cn('flex flex-wrap gap-1.5', msg.content && 'mt-2')}>
                      {msg.attachments.map((att, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-xs text-foreground/70">
                          {att.category === 'image' ? '🖼' : '📄'} {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/15 text-primary flex-shrink-0">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          );
        }

        // ResponseGroup
        const isLastGroup = index === displayItems.length - 1;
        const groupIsStreaming = isLastGroup && isStreaming;

        return (
          <ResponseBlock
            key={item.id}
            group={item}
            isStreaming={groupIsStreaming}
            streamingContent={groupIsStreaming ? streamingContent : undefined}
          />
        );
      })}

      {/* 独立的流式响应（当流式内容没有对应的组时） */}
      {needsStreamingGroup && (
        <ResponseBlock
          group={{ type: 'response', id: 'streaming', steps: [], reply: null }}
          isStreaming
          streamingContent={streamingContent}
        />
      )}

      {/* 危险操作确认对话框 */}
      {pendingConfirmation && (
        <div className="px-4 py-2">
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium text-foreground">操作确认</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{pendingConfirmation.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmToolCall(true)}
                  className="px-4 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors"
                >
                  允许
                </button>
                <button
                  onClick={() => confirmToolCall(false)}
                  className="px-4 py-1.5 bg-secondary text-secondary-foreground text-xs rounded-md hover:bg-secondary/80 transition-colors"
                >
                  拒绝
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 等待 AI 回复指示器 */}
      {isWaiting && (
        <div className="px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center gap-1 pl-5">
            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
