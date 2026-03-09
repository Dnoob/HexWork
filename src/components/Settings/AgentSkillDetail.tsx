import { useEffect, useState } from 'react';
import { useAgentSkillStore } from '../../stores/agentSkillStore';
import type { AgentSkillFull } from '../../types';

interface AgentSkillDetailProps {
  name: string;
  onClose: () => void;
}

export const AgentSkillDetail = ({ name, onClose }: AgentSkillDetailProps) => {
  const { getDetail } = useAgentSkillStore();
  const [detail, setDetail] = useState<AgentSkillFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDetail(name)
      .then(d => {
        setDetail(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, [name, getDetail]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-xl w-[600px] max-h-[80vh] flex flex-col border border-border"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">{name}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive text-sm">{error}</div>
          ) : detail ? (
            <div className="space-y-4">
              {/* 元信息 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">来源</span>
                  <p className="text-foreground">{detail.source === 'builtin' ? '内置技能' : detail.source === 'git' ? `Git (${detail.sourceUrl || '-'})` : '本地导入'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">状态</span>
                  <p className={detail.enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                    {detail.enabled ? '已启用' : '已禁用'}
                  </p>
                </div>
                {detail.license && (
                  <div>
                    <span className="text-muted-foreground">许可</span>
                    <p className="text-foreground">{detail.license}</p>
                  </div>
                )}
                {detail.metadata?.version && (
                  <div>
                    <span className="text-muted-foreground">版本</span>
                    <p className="text-foreground">{detail.metadata.version}</p>
                  </div>
                )}
                {detail.metadata?.author && (
                  <div>
                    <span className="text-muted-foreground">作者</span>
                    <p className="text-foreground">{detail.metadata.author}</p>
                  </div>
                )}
              </div>

              {/* 描述 */}
              <div>
                <span className="text-sm text-muted-foreground">描述</span>
                <p className="text-sm text-foreground mt-1">{detail.description}</p>
              </div>

              {/* 文件列表 */}
              <div>
                <span className="text-sm text-muted-foreground">文件</span>
                <div className="mt-1 bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {detail.files.map(f => (
                    <div key={f} className="text-xs text-muted-foreground font-mono py-0.5">{f}</div>
                  ))}
                </div>
              </div>

              {/* 指令内容 */}
              <div>
                <span className="text-sm text-muted-foreground">SKILL.md 指令内容</span>
                <div className="mt-1 bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {detail.instructions}
                  </pre>
                </div>
              </div>

              {/* 路径 */}
              <div>
                <span className="text-sm text-muted-foreground">磁盘路径</span>
                <p className="text-xs text-muted-foreground font-mono mt-1">{detail.path}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
