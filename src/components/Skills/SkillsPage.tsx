import { useState } from 'react';
import { InstalledSkills } from './InstalledSkills';
import { SkillMarket } from './SkillMarket';
import { AgentSkillImport } from '../Settings/AgentSkillImport';
import { AgentSkillCreate } from '../Settings/AgentSkillCreate';
import { useAgentSkillStore } from '../../stores/agentSkillStore';
import { Search, FolderDown, FilePlus2 } from 'lucide-react';

type Tab = 'installed' | 'market';

export const SkillsPage = () => {
  const [tab, setTab] = useState<Tab>('installed');
  const [installedSearch, setInstalledSearch] = useState('');
  const [marketSearch, setMarketSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const skills = useAgentSkillStore(s => s.skills);

  const searchQuery = tab === 'installed' ? installedSearch : marketSearch;
  const setSearchQuery = tab === 'installed' ? setInstalledSearch : setMarketSearch;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* 头部 */}
      <div className="flex-shrink-0 px-6 pt-4 pb-0">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">技能</h1>
            <p className="text-xs text-muted-foreground mt-0.5">管理和发现 Agent Skills</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            >
              <FolderDown className="h-3.5 w-3.5" />
              导入
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              新建
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tab === 'market' ? '搜索技能市场...' : '搜索已安装技能...'}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        {/* Tab 切换 */}
        <div className="flex items-center gap-1 border-b border-border">
          <button
            onClick={() => setTab('installed')}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'installed'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            已安装
            {skills.length > 0 && (
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
                tab === 'installed' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {skills.length}
              </span>
            )}
            {tab === 'installed' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setTab('market')}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'market'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            技能市场
            {tab === 'market' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* 内容区：两个 tab 都保持挂载，避免切换时重复加载 */}
      <div className={`flex-1 overflow-y-auto px-6 py-4 ${tab !== 'installed' ? 'hidden' : ''}`}>
        <InstalledSkills searchQuery={installedSearch} />
      </div>
      <div className={`flex-1 overflow-y-auto px-6 py-4 ${tab !== 'market' ? 'hidden' : ''}`}>
        <SkillMarket searchQuery={marketSearch} />
      </div>

      {/* 弹窗 */}
      {showImport && <AgentSkillImport onClose={() => setShowImport(false)} />}
      {showCreate && <AgentSkillCreate onClose={() => setShowCreate(false)} />}
    </div>
  );
};
