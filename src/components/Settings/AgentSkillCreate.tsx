import { useState } from 'react';
import { useAgentSkillStore } from '../../stores/agentSkillStore';

interface AgentSkillCreateProps {
  onClose: () => void;
}

export const AgentSkillCreate = ({ onClose }: AgentSkillCreateProps) => {
  const { create } = useAgentSkillStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [includeScripts, setIncludeScripts] = useState(false);
  const [includeReferences, setIncludeReferences] = useState(false);
  const [includeAssets, setIncludeAssets] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('请输入技能名称');
      return;
    }
    if (!description.trim()) {
      setError('请输入技能描述');
      return;
    }
    // 名称只允许小写字母、数字、连字符
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      setError('名称只允许小写字母、数字和连字符，且以字母或数字开头');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await create(name, description, {
        scripts: includeScripts,
        references: includeReferences,
        assets: includeAssets,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-[480px] p-6 border border-border" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-foreground mb-4">新建 Agent Skill</h3>

        {/* 名称 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">名称</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="my-skill"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ring"
          />
        </div>

        {/* 描述 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">描述</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="描述这个技能的用途..."
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:border-ring"
          />
        </div>

        {/* 可选目录 */}
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-foreground">包含目录（可选）</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeScripts}
              onChange={e => setIncludeScripts(e.target.checked)}
              className="rounded text-primary"
            />
            <span className="text-sm text-muted-foreground">scripts/ — 可执行脚本</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeReferences}
              onChange={e => setIncludeReferences(e.target.checked)}
              className="rounded text-primary"
            />
            <span className="text-sm text-muted-foreground">references/ — 参考文档</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAssets}
              onChange={e => setIncludeAssets(e.target.checked)}
              className="rounded text-primary"
            />
            <span className="text-sm text-muted-foreground">assets/ — 静态资源</span>
          </label>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-destructive/10 text-destructive text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-secondary-foreground bg-secondary rounded-lg hover:bg-accent transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 text-sm text-white bg-green-600 dark:bg-green-600 rounded-lg hover:bg-green-700 dark:hover:bg-green-500 disabled:opacity-50 transition-colors"
          >
            {creating ? '创建中...' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
};
