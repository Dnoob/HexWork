import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useConfigStore } from '@/stores/configStore';
import { GeneralSettings } from './GeneralSettings';
import { ModelSettings } from './ModelSettings';
import { McpServerList } from './McpServerList';
import { ScheduledTaskList } from './ScheduledTaskList';
import { StudioSettings } from './StudioSettings';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Bot, Plug, Clock, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsTab = 'general' | 'model' | 'mcp' | 'scheduler' | 'studio';

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Zap; color: string }> = [
  { id: 'general', label: '偏好设置', icon: Zap, color: 'text-primary' },
  { id: 'model', label: '模型', icon: Bot, color: 'text-accent-blue' },
  { id: 'mcp', label: 'MCP 服务', icon: Plug, color: 'text-accent-lavender' },
  { id: 'scheduler', label: '定时任务', icon: Clock, color: 'text-accent-coral' },
  { id: 'studio', label: '内容工作台', icon: Wand2, color: 'text-accent-green' },
];

const tabDescriptions: Record<SettingsTab, string> = {
  general: '配置外观和工作目录',
  model: '配置 AI 模型连接',
  mcp: '管理 MCP 服务器连接',
  scheduler: '管理定时任务',
  studio: '配置联网搜索和配图 API Key',
};

export const Settings = () => {
  const toggleSettings = useChatStore(s => s.toggleSettings);
  const loadConfig = useConfigStore(s => s.loadConfig);
  const loaded = useConfigStore(s => s.loaded);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useEffect(() => {
    if (!loaded) loadConfig();
  }, [loaded, loadConfig]);

  return (
    // 遮罩层
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 弹窗容器 */}
      <div className="bg-background rounded-2xl shadow-2xl w-[780px] max-w-[90vw] h-[560px] max-h-[85vh] flex overflow-hidden animate-scale-in border border-border">
        {/* 左侧导航 */}
        <div className="w-[200px] flex-shrink-0 border-r border-border flex flex-col bg-sidebar/50">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-lg font-bold font-display">设置</h2>
          </div>
          <nav className="flex-1 px-3 py-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors mb-0.5',
                    activeTab === tab.id
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4', activeTab === tab.id ? tab.color : '')} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 头部：标题 + 关闭按钮 */}
          <div className="flex items-start justify-between px-6 pt-5 pb-3">
            <div>
              <h3 className="text-base font-semibold">{tabs.find(t => t.id === activeTab)?.label}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{tabDescriptions[activeTab]}</p>
            </div>
            <button
              onClick={toggleSettings}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 内容区 */}
          <ScrollArea className="flex-1">
            <div className="px-6 pb-6">
              {!loaded ? (
                <p className="text-muted-foreground text-sm py-8 text-center">加载中...</p>
              ) : (
                <>
                  {activeTab === 'general' && <GeneralSettings />}
                  {activeTab === 'model' && <ModelSettings />}
                  {activeTab === 'mcp' && <McpServerList />}
                  {activeTab === 'scheduler' && <ScheduledTaskList />}
                  {activeTab === 'studio' && <StudioSettings />}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
