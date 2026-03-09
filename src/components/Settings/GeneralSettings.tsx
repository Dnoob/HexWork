import { useThemeStore } from '@/stores/themeStore';
import { useConfigStore } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const GeneralSettings = () => {
  const { theme, setTheme } = useThemeStore();
  const { workingDir, setField, saveConfig } = useConfigStore();

  const handleSaveDir = async (dir: string) => {
    setField('workingDir', dir);
    await saveConfig('workingDir', dir);
  };

  return (
    <div className="space-y-6">
      {/* 外观 */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-base font-semibold mb-1">外观</h3>
        <p className="text-sm text-muted-foreground mb-4">自定义应用的外观主题</p>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors',
              theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
            )}
          >
            <Sun className="h-4 w-4" />
            <span className="text-sm">浅色</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors',
              theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
            )}
          >
            <Moon className="h-4 w-4" />
            <span className="text-sm">深色</span>
          </button>
        </div>
      </div>

      {/* 工作目录 */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-base font-semibold mb-1">工作目录</h3>
        <p className="text-sm text-muted-foreground mb-4">AI 将能够读写该目录下的文件（Excel、Word、PDF、CSV 等）</p>
        <div className="flex gap-2">
          <Input
            value={workingDir}
            onChange={e => setField('workingDir', e.target.value)}
            placeholder="选择或输入工作目录路径..."
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={async () => {
              const selected = await window.api.file.selectDir();
              if (selected) handleSaveDir(selected);
            }}
          >
            浏览...
          </Button>
        </div>
      </div>
    </div>
  );
};
