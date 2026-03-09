import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatWindow } from './components/Chat/ChatWindow';
import { SkillsPage } from './components/Skills/SkillsPage';
import { ContentStudioPage } from './components/ContentStudio/ContentStudioPage';
import { Settings } from './components/Settings/Settings';
import { useChatStore } from './stores/chatStore';
import { Button } from './components/ui/button';
import { PanelLeftOpen, Minus, Square, X } from 'lucide-react';

export const App = () => {
  const showSettings = useChatStore(s => s.showSettings);
  const sidebarCollapsed = useChatStore(s => s.sidebarCollapsed);
  const toggleSidebar = useChatStore(s => s.toggleSidebar);
  const activeView = useChatStore(s => s.activeView);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {!sidebarCollapsed && <Sidebar />}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-noise">
        <div className="h-10 w-full flex-shrink-0 flex items-center justify-between" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          {/* 左侧：侧边栏展开按钮 */}
          <div className="flex items-center">
            {sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-2 text-muted-foreground hover:text-foreground"
                onClick={toggleSidebar}
                title="展开侧边栏"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            )}
          </div>
          {/* 右侧：窗口控制按钮 */}
          <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={() => window.api.window.minimize()}
              className="h-10 w-12 flex items-center justify-center text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors"
              title="最小化"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={() => window.api.window.maximize()}
              className="h-10 w-12 flex items-center justify-center text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors"
              title="最大化"
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              onClick={() => window.api.window.close()}
              className="h-10 w-12 flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-colors"
              title="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {activeView === 'skills' ? <SkillsPage />
          : activeView === 'studio' ? <ContentStudioPage />
          : <ChatWindow />}
      </main>
      {showSettings && <Settings />}
    </div>
  );
};
