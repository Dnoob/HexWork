import { useState, useEffect } from 'react';
import { useContentStudioStore } from '@/stores/contentStudioStore';
import { AUDIENCE_TAGS, STYLE_TAGS, SCENE_TAGS } from './platforms';
import {
  Sparkles, Square, ChevronDown, ChevronUp, Search,
  Users, Palette, MapPin,
  type LucideIcon,
} from 'lucide-react';

const TagGroup = ({ icon: Icon, label, tags, selected, category }: {
  icon: LucideIcon;
  label: string;
  tags: string[];
  selected: string[];
  category: 'audience' | 'style' | 'scene';
}) => {
  const toggleTag = useContentStudioStore(s => s.toggleTag);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground w-12 flex-shrink-0">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      {tags.map(tag => (
        <button
          key={tag}
          onClick={() => toggleTag(category, tag)}
          className={`px-2.5 py-0.5 rounded-md text-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
            selected.includes(tag)
              ? 'bg-primary/15 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
};

export const InputArea = () => {
  const topic = useContentStudioStore(s => s.topic);
  const setTopic = useContentStudioStore(s => s.setTopic);
  const generating = useContentStudioStore(s => s.generating);
  const generate = useContentStudioStore(s => s.generate);
  const stop = useContentStudioStore(s => s.stop);
  const searchSummary = useContentStudioStore(s => s.searchSummary);
  const selectedAudience = useContentStudioStore(s => s.selectedAudience);
  const selectedStyle = useContentStudioStore(s => s.selectedStyle);
  const selectedScene = useContentStudioStore(s => s.selectedScene);
  const results = useContentStudioStore(s => s.results);

  const hasResults = Object.keys(results).length > 0;

  // 有结果时默认收起（修复组件重挂载后展开的 bug）
  const [collapsed, setCollapsed] = useState(() =>
    Object.keys(useContentStudioStore.getState().results).length > 0
  );

  // 生成开始时自动收起
  useEffect(() => {
    if (generating && !collapsed) {
      setCollapsed(true);
    }
  }, [generating, collapsed]);

  // 收起态：一行摘要
  if (collapsed && (generating || hasResults)) {
    const selectedTags = [...selectedAudience, ...selectedStyle, ...selectedScene];
    return (
      <div
        onClick={() => setCollapsed(false)}
        className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-sm truncate">{topic}</span>
          {selectedTags.length > 0 && (
            <div className="flex gap-1 flex-shrink-0">
              {selectedTags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                  {tag}
                </span>
              ))}
              {selectedTags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{selectedTags.length - 3}</span>
              )}
            </div>
          )}
          {generating && searchSummary && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate flex-shrink-0">
              <Search className="h-3 w-3" />{searchSummary}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {generating ? (
            <button
              onClick={(e) => { e.stopPropagation(); stop(); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Square className="h-3 w-3" />
              停止
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); generate(); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Sparkles className="h-3 w-3" />
              重新生成
            </button>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* 输入行：搜索栏风格 — 输入框 + 按钮同行，点击空白区域可收起 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="输入内容主题，如：厦门鼓浪屿三日游攻略..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          disabled={generating}
          onKeyDown={e => { if (e.key === 'Enter' && topic.trim()) generate(); }}
        />
        {generating ? (
          <button
            onClick={stop}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Square className="h-3 w-3" />
            停止
          </button>
        ) : (
          <button
            onClick={generate}
            disabled={!topic.trim()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Sparkles className="h-3 w-3" />
            {hasResults ? '重新生成' : '一键生成'}
          </button>
        )}
        {(hasResults || generating) && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
            title="收起"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 标签区：浅色底衬 + 图标分类 */}
      <div className="px-4 py-2.5 space-y-1 border-t border-border/50 bg-muted/30">
        <TagGroup icon={Users} label="受众" tags={AUDIENCE_TAGS} selected={selectedAudience} category="audience" />
        <TagGroup icon={Palette} label="风格" tags={STYLE_TAGS} selected={selectedStyle} category="style" />
        <TagGroup icon={MapPin} label="场景" tags={SCENE_TAGS} selected={selectedScene} category="scene" />
      </div>

      {/* 搜索状态条（仅生成中显示） */}
      {generating && searchSummary && (
        <div className="px-4 py-2 border-t border-border/50 bg-muted/20">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Search className="h-3 w-3 animate-pulse" />{searchSummary}
          </span>
        </div>
      )}
    </div>
  );
};
