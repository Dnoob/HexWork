import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { ConversationList } from './ConversationList';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Plus, Search, X, PanelLeftClose, Puzzle, Wand2 } from 'lucide-react';

export const Sidebar = () => {
  const createConversation = useChatStore(s => s.createConversation);
  const toggleSettings = useChatStore(s => s.toggleSettings);
  const toggleSidebar = useChatStore(s => s.toggleSidebar);
  const activeView = useChatStore(s => s.activeView);
  const setActiveView = useChatStore(s => s.setActiveView);
  const [search, setSearch] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchActive && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchActive]);

  const handleSearchClose = () => {
    setSearchActive(false);
    setSearch('');
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') handleSearchClose();
  };

  return (
    <aside className="w-[280px] flex-shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border">
      {/* 顶栏：收起 + 品牌名 */}
      <div className="flex items-center px-2 pt-3 pb-2" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={toggleSidebar} title="收起侧边栏">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold tracking-wide font-display" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>HexWork</h1>
        </div>
      </div>

      {/* 操作区 */}
      <div className="px-2 pb-2 space-y-0.5">
        <button
          onClick={createConversation}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新建对话
        </button>

        <button
          onClick={() => setActiveView(activeView === 'skills' ? 'chat' : 'skills')}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
            activeView === 'skills'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          }`}
        >
          <Puzzle className="h-4 w-4" />
          技能
        </button>

        <button
          onClick={() => setActiveView(activeView === 'studio' ? 'chat' : 'studio')}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
            activeView === 'studio'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          }`}
        >
          <Wand2 className="h-4 w-4" />
          内容工作台
        </button>

        {searchActive ? (
          <div className="flex items-center gap-1 px-1 animate-fade-in">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索会话..."
                className="h-8 pl-8 pr-8 text-sm bg-sidebar-accent/50 border-transparent focus:border-primary/30"
              />
              <button
                onClick={handleSearchClose}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setSearchActive(true)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            搜索
          </button>
        )}
      </div>

      {/* 分隔线 */}
      <div className="mx-4 border-t border-dashed border-sidebar-border/50" />

      {/* 会话列表 */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea className="h-full">
          <ConversationList search={search} />
        </ScrollArea>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-sidebar to-transparent pointer-events-none" />
      </div>

      {/* 底部：设置按钮 */}
      <div className="mx-4 border-t border-sidebar-border" />
      <div className="px-2 py-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-sidebar-foreground"
          onClick={toggleSettings}
        >
          <Settings className="h-4 w-4" />
          <span className="text-sm">设置</span>
        </Button>
      </div>
    </aside>
  );
};
