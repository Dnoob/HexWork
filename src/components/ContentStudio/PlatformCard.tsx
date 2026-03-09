import { PlatformContent } from '@/types';
import { PlatformConfig } from './platforms';
import { PlatformIcon } from './PlatformIcon';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface PlatformCardProps {
  config: PlatformConfig;
  content?: PlatformContent;
  loading: boolean;
  onClick: () => void;
}

export const PlatformCard = ({ config, content, loading, onClick }: PlatformCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!content) return;
    const text = `${content.title}\n\n${content.content}\n\n${content.tags.map(t => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={content ? onClick : undefined}
      className={`group relative rounded-xl border bg-card overflow-hidden transition-all duration-200 min-h-[220px] flex flex-col ${
        content
          ? `cursor-pointer border-border hover:shadow-lg ${config.hoverShadow} hover:${config.borderColor}`
          : 'border-border'
      }`}
    >
      {/* 左边框色条 — 加粗加深 */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${config.gradient}`} />

      <div className="p-4 pl-5 flex-1 flex flex-col">
        {/* 头部：平台信息 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PlatformIcon platformId={config.id} />
            <span className="text-sm font-semibold">{config.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${config.bgColor} ${config.textColor}`}>
              {config.type}
            </span>
          </div>
          {content && (
            <button
              onClick={handleCopy}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
                copied
                  ? 'text-green-400 opacity-100'
                  : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent'
              }`}
              title="复制全文"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {loading ? (
          // 骨架态
          <div className="space-y-2.5 animate-pulse flex-1">
            <div className={`h-4 rounded w-3/4 ${config.bgColor}`} />
            <div className="space-y-1.5">
              <div className="h-3 bg-muted/50 rounded w-full" />
              <div className="h-3 bg-muted/50 rounded w-full" />
              <div className="h-3 bg-muted/40 rounded w-5/6" />
              <div className="h-3 bg-muted/30 rounded w-2/3" />
            </div>
            <div className="flex gap-1.5">
              <div className={`h-5 rounded-full w-12 ${config.bgColor} opacity-50`} />
              <div className={`h-5 rounded-full w-14 ${config.bgColor} opacity-30`} />
              <div className={`h-5 rounded-full w-10 ${config.bgColor} opacity-20`} />
            </div>
          </div>
        ) : content ? (
          // 内容态
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="text-sm font-bold line-clamp-1">{content.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-wrap">
              {content.content}
            </p>
            {content.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1 mt-auto">
                {content.tags.slice(0, 5).map(tag => (
                  <span
                    key={tag}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${config.bgColor} ${config.textColor}`}
                  >
                    #{tag}
                  </span>
                ))}
                {content.tags.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">+{content.tags.length - 5}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          // 空态
          <div className="text-center py-4 flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">等待生成...</p>
          </div>
        )}
      </div>
    </div>
  );
};
