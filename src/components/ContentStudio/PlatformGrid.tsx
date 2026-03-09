import { useContentStudioStore } from '@/stores/contentStudioStore';
import { PLATFORMS } from './platforms';
import { PlatformCard } from './PlatformCard';

export const PlatformGrid = () => {
  const results = useContentStudioStore(s => s.results);
  const generating = useContentStudioStore(s => s.generating);
  const openDetail = useContentStudioStore(s => s.openDetail);

  // 只在有结果或正在生成时显示
  const hasContent = Object.keys(results).length > 0 || generating;
  if (!hasContent) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {PLATFORMS.map(config => (
        <PlatformCard
          key={config.id}
          config={config}
          content={results[config.id]}
          loading={generating && !results[config.id]}
          onClick={() => openDetail(config.id)}
        />
      ))}
    </div>
  );
};
