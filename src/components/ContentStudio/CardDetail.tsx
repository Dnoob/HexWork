import { useEffect, useState } from 'react';
import { useContentStudioStore } from '@/stores/contentStudioStore';
import { PLATFORMS } from './platforms';
import { PlatformIcon } from './PlatformIcon';
import { Copy, Check, X } from 'lucide-react';

const EXTRA_LABELS: Record<string, string> = {
  bgm: '推荐 BGM',
  hook: '前 3 秒 Hook',
  wordCount: '预计字数',
  outline: '大纲',
  dynamic: '社区动态',
  question: '知乎问题',
};

export const CardDetail = () => {
  const detailPlatform = useContentStudioStore(s => s.detailPlatform);
  const results = useContentStudioStore(s => s.results);
  const closeDetail = useContentStudioStore(s => s.closeDetail);
  const [copied, setCopied] = useState(false);

  const config = PLATFORMS.find(p => p.id === detailPlatform);
  const content = detailPlatform ? results[detailPlatform] : undefined;

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeDetail]);

  if (!config || !content) return null;

  const fullText = `${content.title}\n\n${content.content}\n\n${content.tags.map(t => `#${t}`).join(' ')}`;
  const wordCount = content.content.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in motion-reduce:animate-none"
      onClick={closeDetail}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-card rounded-2xl shadow-2xl w-[640px] max-w-[90vw] max-h-[80vh] flex flex-col overflow-hidden border border-border animate-scale-in motion-reduce:animate-none"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 — 平台主题色渐变 */}
        <div className={`relative bg-gradient-to-r ${config.headerGradient}`}>
          {/* 顶部色条 */}
          <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.gradient}`} />

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <PlatformIcon platformId={config.id} size="lg" />
              <div>
                <h2 className="text-base font-bold">{config.name}</h2>
                <span className={`text-xs font-medium ${config.textColor}`}>{config.type}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">{wordCount} 字</span>
              <button
                onClick={handleCopy}
                aria-label="复制全文"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
                  copied
                    ? 'bg-green-500/15 text-green-400'
                    : `${config.bgColor} ${config.textColor} hover:opacity-80`
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? '已复制' : '复制全文'}
              </button>
              <button
                onClick={closeDetail}
                aria-label="关闭"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 标题 */}
          <div>
            <div className="text-base font-bold leading-snug">
              {content.title}
            </div>
          </div>

          {/* 分隔线 */}
          <div className={`border-t ${config.borderColor} opacity-40`} />

          {/* 正文 */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {content.content}
          </div>

          {/* Extra 字段 */}
          {content.extra && Object.keys(content.extra).length > 0 && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-3">
                {Object.entries(content.extra).map(([key, value]) => (
                  <div key={key}>
                    <span className={`text-xs font-medium ${config.textColor}`}>
                      {EXTRA_LABELS[key] || key}
                    </span>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap mt-1 text-foreground/80">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 标签 */}
          {content.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {content.tags.map(tag => (
                <span
                  key={tag}
                  className={`text-xs px-2.5 py-1 rounded-full ${config.bgColor} ${config.textColor} font-medium`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
