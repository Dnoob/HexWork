import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { Conversation } from '@/types';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pin, PinOff, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// 按日期分组
const groupConversations = (conversations: Conversation[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  const groups: { label: string; items: Conversation[] }[] = [];
  const pinned: Conversation[] = [];
  const todayList: Conversation[] = [];
  const yesterdayList: Conversation[] = [];
  const older: Conversation[] = [];

  for (const conv of conversations) {
    if (conv.pinned) pinned.push(conv);
    else if (conv.updatedAt >= today) todayList.push(conv);
    else if (conv.updatedAt >= yesterday) yesterdayList.push(conv);
    else older.push(conv);
  }

  if (pinned.length > 0) groups.push({ label: '置顶', items: pinned });
  if (todayList.length > 0) groups.push({ label: '今天', items: todayList });
  if (yesterdayList.length > 0) groups.push({ label: '昨天', items: yesterdayList });
  if (older.length > 0) groups.push({ label: '更早', items: older });

  return groups;
};

// 单个会话项：悬停显示 ···，支持内联重命名
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}

const ConversationItem = ({ conversation, isActive, onSelect, onDelete, onRename, onPin }: ConversationItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleRenameSubmit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(conversation.id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') { setEditing(false); setEditTitle(conversation.title); }
  };

  const handleRenameSelect = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    setEditTitle(conversation.title || '新对话');
    setEditing(true);
  };

  const handlePinSelect = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    await onPin(conversation.id, !conversation.pinned);
  };

  const handleDeleteSelect = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    await onDelete(conversation.id);
  };

  if (editing) {
    return (
      <div className="px-2 py-1">
        <Input
          ref={inputRef}
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center px-3 py-2 mx-2 rounded-lg cursor-pointer transition-all duration-200 border-l-[3px] pl-[9px]',
        isActive
          ? `bg-sidebar-accent text-sidebar-accent-foreground ${conversation.pinned ? 'border-accent-coral' : 'border-primary'}`
          : 'hover:bg-sidebar-accent/50 hover:translate-x-0.5 border-transparent'
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <span className="text-sm truncate min-w-0 flex-1">
        {conversation.title || '新对话'}
      </span>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            className={cn(
              'flex-shrink-0 ml-1 h-6 w-6 flex items-center justify-center rounded-md transition-colors outline-none ring-0',
              isActive || menuOpen
                ? 'text-sidebar-foreground hover:bg-sidebar'
                : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
            aria-label="会话操作"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onSelect={handleRenameSelect}>
            <Pencil className="h-4 w-4 mr-2" />
            重命名
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handlePinSelect}>
            {conversation.pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
            {conversation.pinned ? '取消置顶' : '置顶'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleDeleteSelect}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const ConversationList = ({ search }: { search: string }) => {
  const conversations = useChatStore(s => s.conversations);
  const currentConversationId = useChatStore(s => s.currentConversationId);
  const selectConversation = useChatStore(s => s.selectConversation);
  const deleteConversation = useChatStore(s => s.deleteConversation);
  const renameConversation = useChatStore(s => s.renameConversation);
  const pinConversation = useChatStore(s => s.pinConversation);
  const loadConversations = useChatStore(s => s.loadConversations);

  // 监听定时任务完成，刷新会话列表
  useEffect(() => {
    const unsubscribe = window.api.scheduler.onTaskComplete(() => {
      loadConversations();
    });
    return unsubscribe;
  }, [loadConversations]);

  // 搜索过滤
  const filtered = search
    ? conversations.filter(c => (c.title || '').toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const groups = groupConversations(filtered);

  return (
    <div className="py-2">
      {/* 分组列表 */}
      {groups.length === 0 && (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          {search ? '无匹配结果' : '暂无对话'}
        </div>
      )}
      {groups.map(group => (
        <div key={group.label} className="mb-2">
          <div className="px-4 py-1 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
            <div className="flex-1 h-px bg-sidebar-border/50" />
          </div>
          {group.items.map(conv => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === currentConversationId}
              onSelect={selectConversation}
              onDelete={deleteConversation}
              onRename={renameConversation}
              onPin={pinConversation}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
