import { useState, useEffect, useCallback } from 'react';
import { useAgentSkillStore } from '../../stores/agentSkillStore';
import { MarketSkillCard } from './MarketSkillCard';
import type { MarketSkillResult } from '../../types';
import { TrendingUp, AlertCircle, Package, Search } from 'lucide-react';

interface SkillMarketProps {
  searchQuery: string;
}

export const SkillMarket = ({ searchQuery }: SkillMarketProps) => {
  const { skills: installedSkills, loadSkills, installClawHub } = useAgentSkillStore();
  const [results, setResults] = useState<MarketSkillResult[]>([]);
  const [featured, setFeatured] = useState<MarketSkillResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [stats, setStats] = useState<{ totalSkills: number; totalDownloads: number } | null>(null);

  const installedUrls = new Set(installedSkills.filter(s => s.sourceUrl).map(s => s.sourceUrl));
  const installedNames = new Set(installedSkills.map(s => s.name));

  // 初次加载热门技能和统计
  useEffect(() => {
    const loadFeatured = async () => {
      setFeaturedLoading(true);
      try {
        const data = await window.api.skill.featuredMarket();
        setFeatured(data);
      } catch (err) {
        setFeaturedError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setFeaturedLoading(false);
      }
    };
    loadFeatured();
    window.api.skill.marketStats().then(setStats).catch(() => {});
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await window.api.skill.searchMarket(query);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      search(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  const handleInstall = async (slug: string, author: string) => {
    await installClawHub(slug, author);
    await loadSkills();
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  // 搜索中
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
          <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          搜索中...
        </div>
      </div>
    );
  }

  // 搜索报错
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-10 w-10 mb-3 text-destructive/40" />
        <p className="text-sm text-destructive">{error}</p>
        <p className="text-xs mt-2 text-muted-foreground/60">请检查网络连接，或稍后重试</p>
      </div>
    );
  }

  // 搜索无结果
  if (results.length === 0 && searched) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Search className="h-10 w-10 mb-3 opacity-20" />
        <p className="text-sm">没有找到「{searchQuery}」相关的技能</p>
        <p className="text-xs mt-1 text-muted-foreground/60">试试其他关键词</p>
      </div>
    );
  }

  // 有搜索结果
  if (searched && results.length > 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {results.map((skill, i) => (
          <div key={skill.slug || skill.name} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
            <MarketSkillCard
              skill={skill}
              installed={installedUrls.has(skill.url) || installedNames.has(skill.slug) || installedNames.has(skill.name)}
              onInstall={handleInstall}
            />
          </div>
        ))}
      </div>
    );
  }

  // 默认：展示热门技能
  return (
    <div>
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">热门下载</h3>
        </div>
        {stats && (
          <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
            <Package className="h-3 w-3" />
            {formatNumber(stats.totalSkills)} skills on ClawHub
          </span>
        )}
      </div>

      {featuredLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
            <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            加载中...
          </div>
        </div>
      ) : featuredError ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mb-3 text-destructive/40" />
          <p className="text-sm text-destructive">{featuredError}</p>
          <p className="text-xs mt-2 text-muted-foreground/60">请检查网络连接，或稍后重试</p>
        </div>
      ) : featured.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <TrendingUp className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm">暂无热门技能</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {featured.map((skill, i) => (
            <div key={skill.slug || skill.name} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <MarketSkillCard
                skill={skill}
                installed={installedUrls.has(skill.url) || installedNames.has(skill.slug) || installedNames.has(skill.name)}
                onInstall={handleInstall}
                rank={i + 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
