import { useEffect, useState } from 'react';
import { useAgentSkillStore } from '../../stores/agentSkillStore';
import { SkillCard } from './SkillCard';
import { AgentSkillDetail } from '../Settings/AgentSkillDetail';
import { PackageOpen } from 'lucide-react';

interface InstalledSkillsProps {
  searchQuery: string;
}

export const InstalledSkills = ({ searchQuery }: InstalledSkillsProps) => {
  const { skills, loading, error, loadSkills, toggle, uninstall, update } = useAgentSkillStore();
  const [detailName, setDetailName] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const filtered = searchQuery
    ? skills.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : skills;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 px-3 py-2 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <PackageOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">
            {searchQuery ? '没有找到匹配的技能' : '暂无已安装技能'}
          </p>
          {!searchQuery && (
            <p className="text-xs mt-1">去「技能市场」发现好用的技能</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((skill, i) => (
            <div key={skill.name} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
              <SkillCard
                skill={skill}
                onToggle={toggle}
                onDetail={setDetailName}
                onUpdate={update}
                onDelete={uninstall}
              />
            </div>
          ))}
        </div>
      )}

      {detailName && <AgentSkillDetail name={detailName} onClose={() => setDetailName(null)} />}
    </>
  );
};
