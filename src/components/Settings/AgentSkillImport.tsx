import { useState } from 'react';
import { useAgentSkillStore } from '../../stores/agentSkillStore';

interface AgentSkillImportProps {
  onClose: () => void;
}

export const AgentSkillImport = ({ onClose }: AgentSkillImportProps) => {
  const { installLocal, installGit } = useAgentSkillStore();
  const [mode, setMode] = useState<'local' | 'git'>('local');
  const [localPath, setLocalPath] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectDir = async () => {
    const selected = await window.api.skill.selectDir();
    if (selected) {
      setLocalPath(selected);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      if (mode === 'local') {
        if (!localPath) {
          setError('请选择文件夹');
          return;
        }
        await installLocal(localPath);
      } else {
        if (!gitUrl) {
          setError('请输入 Git URL');
          return;
        }
        await installGit(gitUrl);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '安装失败');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-[480px] p-6 border border-border" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-foreground mb-4">导入 Agent Skill</h3>

        {/* 模式选择 */}
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === 'local'}
              onChange={() => setMode('local')}
              className="text-primary"
            />
            <span className="text-sm text-foreground">本地文件夹</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === 'git'}
              onChange={() => setMode('git')}
              className="text-primary"
            />
            <span className="text-sm text-foreground">Git 仓库</span>
          </label>
        </div>

        {/* 输入区域 */}
        {mode === 'local' ? (
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={localPath}
                onChange={e => setLocalPath(e.target.value)}
                placeholder="选择包含 SKILL.md 的文件夹..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ring"
              />
              <button
                onClick={handleSelectDir}
                className="px-3 py-2 bg-secondary text-secondary-foreground text-sm rounded-lg hover:bg-accent transition-colors whitespace-nowrap"
              >
                浏览...
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <input
              type="text"
              value={gitUrl}
              onChange={e => setGitUrl(e.target.value)}
              placeholder="https://github.com/user/skill-name.git"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ring"
            />
          </div>
        )}

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
            onClick={handleInstall}
            disabled={installing}
            className="px-4 py-2 text-sm text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {installing ? '安装中...' : '安装'}
          </button>
        </div>
      </div>
    </div>
  );
};
