import { useEffect, useState } from 'react';
import { useAgentSkillStore } from '../../stores/agentSkillStore';
import { AgentSkillImport } from './AgentSkillImport';
import { AgentSkillCreate } from './AgentSkillCreate';
import { AgentSkillDetail } from './AgentSkillDetail';

export const AgentSkillList = () => {
  const { skills, loading, error, loadSkills, toggle, uninstall, update } = useAgentSkillStore();
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [detailName, setDetailName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleDelete = async (name: string) => {
    await uninstall(name);
    setConfirmDelete(null);
  };

  const handleUpdate = async (name: string) => {
    setUpdating(name);
    try {
      await update(name);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Agent Skills 是用户自定义的技能包，通过 SKILL.md 文件定义指令，AI 会在需要时自动激活。</p>
        <div className="flex gap-2 flex-shrink-0 ml-4">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            + 导入
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-sm bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            + 新建
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
      ) : skills.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          暂无已安装的 Agent Skills，点击上方按钮导入或新建。
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map(skill => (
            <div
              key={skill.name}
              className={`border rounded-xl p-4 transition-colors ${
                skill.enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {/* 状态指示器 */}
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      skill.enabled ? 'bg-green-500' : 'bg-muted-foreground/30'
                    }`}
                  />
                  <span className="font-medium text-foreground truncate">{skill.name}</span>
                  {skill.metadata?.version && (
                    <span className="text-xs text-muted-foreground">v{skill.metadata.version}</span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    skill.source === 'builtin'
                      ? 'bg-primary/10 text-primary'
                      : skill.source === 'git'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {skill.source === 'builtin' ? '内置' : skill.source === 'git' ? 'Git' : '本地'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{skill.description}</p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => toggle(skill.name, !skill.enabled)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    skill.enabled
                      ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20'
                      : 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                  }`}
                >
                  {skill.enabled ? '禁用' : '启用'}
                </button>

                {skill.source === 'git' && (
                  <button
                    onClick={() => handleUpdate(skill.name)}
                    disabled={updating === skill.name}
                    className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
                  >
                    {updating === skill.name ? '更新中...' : '更新'}
                  </button>
                )}

                <button
                  onClick={() => setDetailName(skill.name)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
                >
                  详情
                </button>

                {skill.source !== 'builtin' && (
                  confirmDelete === skill.name ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-xs text-destructive">确认删除？</span>
                      <button
                        onClick={() => handleDelete(skill.name)}
                        className="text-xs px-2 py-1 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                      >
                        确认
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(skill.name)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors ml-auto"
                    >
                      删除
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 导入对话框 */}
      {showImport && <AgentSkillImport onClose={() => setShowImport(false)} />}

      {/* 新建向导 */}
      {showCreate && <AgentSkillCreate onClose={() => setShowCreate(false)} />}

      {/* 详情查看 */}
      {detailName && <AgentSkillDetail name={detailName} onClose={() => setDetailName(null)} />}
    </div>
  );
};
