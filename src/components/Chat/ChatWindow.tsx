import { useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';

export const ChatWindow = () => {
  const currentConversationId = useChatStore(s => s.currentConversationId);
  const init = useChatStore(s => s.init);
  const initialized = useChatStore(s => s.initialized);

  // 初始化 store（设置监听器、加载会话列表）
  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [init, initialized]);

  // 没有选中会话时显示欢迎页
  if (!currentConversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-noise relative">
        <div className="animate-scale-in text-center">
          <h1 className="text-5xl font-bold font-display bg-gradient-to-r from-primary via-accent-coral to-accent-lavender bg-clip-text text-transparent mb-4">
            HexWork
          </h1>
          <p className="text-muted-foreground text-lg">
            你的智能工作助手，随时准备好帮你
          </p>
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.04) 0%, transparent 70%)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <MessageList />
      <InputBar />
    </div>
  );
};
