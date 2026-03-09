import { useState } from 'react';
import { Star, Download, Check, Loader2 } from 'lucide-react';
import type { MarketSkillResult } from '../../types';
import { getSkillColor } from './skillColors';

interface MarketSkillCardProps {
  skill: MarketSkillResult;
  installed: boolean;
  onInstall: (slug: string, author: string) => Promise<void>;
  rank?: number;
}

export const MarketSkillCard = ({ skill, installed, onInstall, rank }: MarketSkillCardProps) => {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { gradient, borderColor, initial } = getSkillColor(skill.name);

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      await onInstall(skill.slug, skill.author);
    } catch (err) {
      setError(err instanceof Error ? err.message : '安装失败');
    } finally {
      setInstalling(false);
    }
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <div className="group relative border border-border/60 rounded-xl bg-card overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)] hover:-translate-y-1">
      {/* 色彩晕染 */}
      <div
        className="absolute top-0 left-0 w-28 h-28 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 opacity-[0.06] group-hover:opacity-[0.14]"
        style={{ background: borderColor }}
      />

      <div className="relative p-4">
        {/* 头部 */}
        <div className="flex items-start gap-3 mb-3">
          {/* 字母头像 */}
          <div className="relative flex-shrink-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md"
              style={{ background: gradient }}
            >
              <span className="text-white font-display font-bold text-lg leading-none">{initial}</span>
            </div>
            {/* 排名角标 */}
            {rank !== undefined && rank <= 3 && (
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
                {rank}
              </div>
            )}
          </div>

          {/* 名称 + 作者 */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground truncate text-[13px] leading-tight">{skill.name}</span>
              {skill.certified && (
                <span className="flex-shrink-0 text-[9px] px-1.5 py-[1px] rounded-full bg-accent-blue/12 text-accent-blue font-semibold tracking-wide uppercase">
                  Certified
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">{skill.author}</p>
          </div>
        </div>

        {/* 描述 */}
        <p className="text-xs text-foreground/55 leading-relaxed line-clamp-2 mb-3.5 min-h-[2.4em]">
          {skill.description}
        </p>

        {/* 错误提示 */}
        {error && (
          <p className="text-[11px] text-destructive mb-2 truncate">{error}</p>
        )}

        {/* 底部：统计 + 操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] font-medium text-foreground/50">
              <Download className="h-3 w-3 opacity-50" />
              {formatNumber(skill.downloads)}
            </span>
            {skill.stars > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-foreground/40">
                <Star className="h-3 w-3 opacity-50" />
                {formatNumber(skill.stars)}
              </span>
            )}
          </div>

          {installed ? (
            <span className="flex items-center gap-1 text-[11px] text-accent-green font-medium px-2.5 py-1 rounded-lg bg-accent-green/8">
              <Check className="h-3 w-3" />
              已安装
            </span>
          ) : (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium border border-primary/30 text-primary bg-transparent hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-50 transition-all duration-200 hover:shadow-sm"
            >
              {installing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              {installing ? '安装中' : '安装'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
