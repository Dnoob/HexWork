import { useEffect } from 'react';
import { useContentStudioStore } from '@/stores/contentStudioStore';
import { InputArea } from './InputArea';
import { PlatformGrid } from './PlatformGrid';
import { CardDetail } from './CardDetail';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Radio, Sparkles } from 'lucide-react';

export const ContentStudioPage = () => {
  const detailPlatform = useContentStudioStore(s => s.detailPlatform);
  const error = useContentStudioStore(s => s.error);
  const generating = useContentStudioStore(s => s.generating);
  const results = useContentStudioStore(s => s.results);
  const hasResults = Object.keys(results).length > 0;

  // 注册 IPC 监听器
  useEffect(() => {
    const store = useContentStudioStore.getState();
    const unsubChunk = window.api.studio.onChunk((chunk) => {
      store.handleChunk(chunk);
    });
    const unsubSearch = window.api.studio.onSearchDone((summary) => {
      store.setSearchSummary(summary);
    });
    const unsubError = window.api.studio.onError((err) => {
      store.setError(err);
    });
    const unsubDone = window.api.studio.onDone(() => {
      store.setDone();
    });

    return () => {
      unsubChunk();
      unsubSearch();
      unsubError();
      unsubDone();
    };
  }, []);

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            多平台内容工作台
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            输入一个主题，AI 同时生成 6 个平台的适配内容
          </p>
        </div>

        <InputArea />

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {!hasResults && !generating && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">输入主题，一键生成 6 个平台的适配内容</p>
          </div>
        )}

        <PlatformGrid />
      </div>

      {detailPlatform && <CardDetail />}
    </ScrollArea>
  );
};
