import { useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { providers, detectKeyType } from '@/constants/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ModelSettings = () => {
  const { provider, apiKey, model, setField, saveConfig } = useConfigStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const currentProvider = providers[provider] || providers.minimax;
  const keyType = detectKeyType(provider, apiKey);

  const handleProviderChange = async (value: string) => {
    setField('provider', value);
    setTestResult(null);
    const p = providers[value];
    if (p) {
      setField('model', p.defaultModel);
    }
    // 加载该服务商已保存的 API Key
    const savedKey = await window.api.config.get(`llm.apiKey.${value}`) || '';
    setField('apiKey', savedKey);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      await saveConfig('llm.provider', provider);
      await saveConfig(`llm.apiKey.${provider}`, apiKey);
      await saveConfig('llm.model', model);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('保存配置失败:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.api.chat.testConnection(provider, apiKey, model);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: '测试请求失败' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-5">
        {/* 服务商 */}
        <div>
          <Label>服务商</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(providers).filter(([, p]) => p.enabled !== false).map(([id, p]) => (
                <SelectItem key={id} value={id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 模型 */}
        <div>
          <Label>模型</Label>
          <Select value={model} onValueChange={(v) => { setField('model', v); setTestResult(null); }}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentProvider.models.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key */}
        <div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              apiKey ? 'bg-accent-green' : 'bg-muted-foreground/30'
            )} />
            <Label>API Key</Label>
            {apiKey && keyType && (
              <span className="text-xs text-accent-green">{keyType.type}</span>
            )}
            {apiKey && !keyType && (
              <span className="text-xs text-yellow-500">未识别的 Key 格式</span>
            )}
          </div>
          <div className="relative mt-1.5">
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => {
                setField('apiKey', e.target.value);
                setTestResult(null);
              }}
              placeholder="输入 API Key"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
          <Button
            variant={testResult ? 'default' : 'outline'}
            onClick={handleTest}
            disabled={testing || !apiKey}
            className={cn(
              testResult?.success && 'bg-accent-green hover:bg-accent-green/90 text-white border-transparent',
              testResult && !testResult.success && 'bg-destructive hover:bg-destructive/90 text-white border-transparent',
            )}
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                测试中...
              </>
            ) : testResult?.success ? (
              '✓ 连接成功'
            ) : testResult ? (
              '✗ 连接失败'
            ) : '测试连接'}
          </Button>
          {saveStatus === 'success' && (
            <span className="text-sm text-accent-green">保存成功</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-destructive">保存失败，请重试</span>
          )}
        </div>
        {testResult && !testResult.success && (
          <p className="text-xs text-destructive">
            {testResult.message}
          </p>
        )}
      </div>
    </div>
  );
};
