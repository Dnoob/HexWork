import { create } from 'zustand';
import { Conversation, Message, ChatChunk, ToolPreview, FileAttachment } from '../types';

// 工具调用状态
interface ToolCallStatus {
  name: string;
  args: string;
}

// 危险操作确认请求
interface PendingConfirmation {
  id: string;
  name: string;
  description: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  showSettings: boolean;
  sidebarCollapsed: boolean;
  activeView: 'chat' | 'skills' | 'studio';
  initialized: boolean;
  // 工具调用状态
  toolCallStatus: ToolCallStatus | null;
  pendingConfirmation: PendingConfirmation | null;
  // 工具执行结果临时展示
  toolResults: Array<{ name: string; summary: string; preview?: ToolPreview }>;

  init: () => Promise<void>;
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  pinConversation: (id: string, pinned: boolean) => Promise<void>;
  sendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>;
  stopGeneration: () => void;
  toggleSettings: () => void;
  toggleSidebar: () => void;
  setActiveView: (view: 'chat' | 'skills' | 'studio') => void;
  confirmToolCall: (approved: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  streamingContent: '',
  isStreaming: false,
  showSettings: false,
  sidebarCollapsed: false,
  activeView: 'chat',
  initialized: false,
  toolCallStatus: null,
  pendingConfirmation: null,
  toolResults: [],

  init: async () => {
    if (get().initialized) return;

    // 监听流式 chunk
    window.api.chat.onChunk((chunk: ChatChunk) => {
      const state = get();
      // 先追加 delta（最后一个 chunk 也可能携带内容）
      const updatedContent = state.streamingContent + chunk.delta;

      if (chunk.done) {
        // 先更新最终流式内容，保持可见直到 DB 消息加载完成（避免画面跳动）
        set({ streamingContent: updatedContent });
        const conversationId = state.currentConversationId;
        if (conversationId) {
          window.api.message.list(conversationId).then(messages => {
            // 仅当会话未切换时才更新，同时清除流式状态
            if (get().currentConversationId === conversationId) {
              set({ messages, streamingContent: '', isStreaming: false, toolCallStatus: null, toolResults: [] });
            }
          });
        } else {
          set({ streamingContent: '', isStreaming: false, toolCallStatus: null, toolResults: [] });
        }
        // 刷新会话列表以更新标题
        get().loadConversations();
      } else {
        // 追加 delta 到 streamingContent
        set({ streamingContent: updatedContent });
      }
    });

    // 监听错误
    window.api.chat.onError((error: string) => {
      console.error('聊天错误:', error);
      const state = get();
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        conversationId: state.currentConversationId || '',
        role: 'assistant',
        content: `**错误：** ${error}`,
        createdAt: Date.now(),
      };
      set({
        messages: [...state.messages, errorMessage],
        isStreaming: false,
        streamingContent: '',
        toolCallStatus: null,
        pendingConfirmation: null,
        toolResults: [],
      });
    });

    // 监听工具调用状态
    window.api.chat.onToolCall((data) => {
      const conversationId = get().currentConversationId;
      // 重置 streamingContent（旧文本已由后端保存到 DB），重载消息以正确分组
      set({ toolCallStatus: { name: data.name, args: data.args }, streamingContent: '' });
      if (conversationId) {
        window.api.message.list(conversationId).then(messages => {
          if (get().currentConversationId === conversationId) {
            set({ messages });
          }
        });
      }
    });

    // 监听工具执行结果
    window.api.chat.onToolResult((data) => {
      const conversationId = get().currentConversationId;
      set(state => ({
        toolCallStatus: null,
        toolResults: [...state.toolResults, {
          name: data.name,
          summary: data.summary,
          preview: data.preview as ToolPreview | undefined,
        }],
      }));
      // 重载消息以显示工具执行结果
      if (conversationId) {
        window.api.message.list(conversationId).then(messages => {
          if (get().currentConversationId === conversationId) {
            set({ messages });
          }
        });
      }
    });

    // 监听危险操作确认请求
    window.api.chat.onConfirmToolCall((data) => {
      set({ pendingConfirmation: data });
    });

    // 加载会话列表
    await get().loadConversations();
    set({ initialized: true });
  },

  loadConversations: async () => {
    const conversations = await window.api.conversation.list();
    set({ conversations });
  },

  selectConversation: async (id: string) => {
    set({ currentConversationId: id, messages: [], showSettings: false, activeView: 'chat' });
    const messages = await window.api.message.list(id);
    set({ messages });
  },

  createConversation: async () => {
    const conversation = await window.api.conversation.create();
    set(state => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      messages: [],
      showSettings: false,
      activeView: 'chat',
    }));
  },

  deleteConversation: async (id: string) => {
    await window.api.conversation.delete(id);
    const state = get();
    const remaining = state.conversations.filter(c => c.id !== id);
    set({
      conversations: remaining,
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
      messages: state.currentConversationId === id ? [] : state.messages,
    });
  },

  renameConversation: async (id: string, title: string) => {
    await window.api.conversation.rename(id, title);
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === id ? { ...c, title } : c
      ),
    }));
  },

  pinConversation: async (id: string, pinned: boolean) => {
    await window.api.conversation.pin(id, pinned);
    await get().loadConversations();
  },

  sendMessage: async (content: string, attachments?: FileAttachment[]) => {
    let { currentConversationId } = get();

    // 如果没有当前会话，先创建一个
    if (!currentConversationId) {
      const conversation = await window.api.conversation.create(content.slice(0, 30));
      set(state => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
      }));
      currentConversationId = conversation.id;
    }

    // 乐观更新：添加用户消息
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: currentConversationId,
      role: 'user',
      content,
      createdAt: Date.now(),
      attachments,
    };

    set(state => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      streamingContent: '',
      toolCallStatus: null,
      toolResults: [],
    }));

    // 调用后端发送消息
    window.api.chat.send(currentConversationId, content, attachments);
  },

  stopGeneration: () => {
    window.api.chat.stop();
    const state = get();
    if (state.streamingContent) {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        conversationId: state.currentConversationId || '',
        role: 'assistant',
        content: state.streamingContent,
        createdAt: Date.now(),
      };
      set({
        messages: [...state.messages, assistantMessage],
        isStreaming: false,
        streamingContent: '',
        toolCallStatus: null,
        toolResults: [],
      });
    } else {
      set({ isStreaming: false, streamingContent: '', toolCallStatus: null, toolResults: [] });
    }
  },

  toggleSettings: () => {
    set(state => ({ showSettings: !state.showSettings }));
  },

  toggleSidebar: () => {
    set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setActiveView: (view: 'chat' | 'skills' | 'studio') => {
    set({ activeView: view });
  },

  confirmToolCall: (approved: boolean) => {
    const { pendingConfirmation } = get();
    if (pendingConfirmation) {
      window.api.chat.confirmToolCall(pendingConfirmation.id, approved);
      set({ pendingConfirmation: null });
    }
  },
}));
