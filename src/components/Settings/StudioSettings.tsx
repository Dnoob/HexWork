import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Loader2 } from 'lucide-react';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const ApiKeyRow = ({ label, hint, placeholder, configKey, testFn }: {
  label: string;
  hint: string;
  placeholder: string;
  configKey: string;
  testFn: (key: string) => Promise<{ success: boolean; message: string }>;
}) => {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(''); // 当前已保存的值
  const [status, setStatus] = useState<TestStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    window.api.config.get(configKey).then(v => {
      if (v) { setValue(v); setSaved(v); }
    });
  }, [configKey]);

  const isDirty = value !== saved;

  const handleTest = async () => {
    if (!value.trim()) return;
    setStatus('testing');
    setMessage('');
    try {
      const result = await testFn(value.trim());
      if (result.success) {
        setStatus('success');
        setMessage('验证通过，已保存');
        setSaved(value.trim());
        setTimeout(() => { setStatus('idle'); setMessage(''); }, 3000);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    } catch {
      setStatus('error');
      setMessage('网络请求失败');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          value={value}
          onChange={e => { setValue(e.target.value); setStatus('idle'); setMessage(''); }}
          placeholder={placeholder}
          className="flex-1"
        />
        <button
          onClick={handleTest}
          disabled={!value.trim() || status === 'testing'}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 flex-shrink-0"
        >
          {status === 'testing' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />验证中</>
          ) : isDirty ? (
            '验证并保存'
          ) : (
            '重新验证'
          )}
        </button>
      </div>
      {/* 状态反馈 */}
      {message && (
        <div className={`flex items-center gap-1.5 text-xs ${
          status === 'success' ? 'text-green-400' : 'text-red-400'
        }`}>
          {status === 'success' ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {message}
        </div>
      )}
      {!message && saved && (
        <div className="text-xs text-muted-foreground">已配置</div>
      )}
    </div>
  );
};

export const StudioSettings = () => {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-base font-semibold mb-1">联网搜索</h3>
        <p className="text-sm text-muted-foreground mb-4">
          生成内容前会先联网搜索主题相关信息，提升内容质量
        </p>
        <ApiKeyRow
          label="Tavily API Key"
          hint="免费 1000 次/月 · tavily.com"
          placeholder="tvly-..."
          configKey="tavily.apiKey"
          testFn={(key) => window.api.studio.testTavily(key)}
        />
      </div>

    </div>
  );
};
