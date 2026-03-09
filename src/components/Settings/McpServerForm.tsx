// MCP Server 添加/编辑表单
import { useState } from 'react';
import { McpServerConfig } from '../../types';

interface McpServerFormProps {
  server?: McpServerConfig;  // 编辑模式传入
  onSave: (config: McpServerConfig) => void;
  onCancel: () => void;
}

// 键值对条目
interface KvEntry {
  key: string;
  value: string;
}

// Record 转 KvEntry 数组
const recordToEntries = (record?: Record<string, string>): KvEntry[] => {
  if (!record || Object.keys(record).length === 0) return [];
  return Object.entries(record).map(([key, value]) => ({ key, value }));
};

// KvEntry 数组转 Record（过滤空 key）
const entriesToRecord = (entries: KvEntry[]): Record<string, string> | undefined => {
  const filtered = entries.filter(e => e.key.trim() !== '');
  if (filtered.length === 0) return undefined;
  return Object.fromEntries(filtered.map(e => [e.key.trim(), e.value]));
};

export const McpServerForm = ({ server, onSave, onCancel }: McpServerFormProps) => {
  const isEdit = !!server;

  const [name, setName] = useState(server?.name || '');
  const [transport, setTransport] = useState<'stdio' | 'http'>(server?.transport || 'stdio');
  const [command, setCommand] = useState(server?.command || '');
  const [argsText, setArgsText] = useState(server?.args?.join(' ') || '');
  const [envEntries, setEnvEntries] = useState<KvEntry[]>(recordToEntries(server?.env));
  const [url, setUrl] = useState(server?.url || '');
  const [headerEntries, setHeaderEntries] = useState<KvEntry[]>(recordToEntries(server?.headers));
  const [trusted, setTrusted] = useState(server?.trusted || false);
  const [error, setError] = useState('');

  // 添加键值对行
  const addEntry = (setter: React.Dispatch<React.SetStateAction<KvEntry[]>>) => {
    setter(prev => [...prev, { key: '', value: '' }]);
  };

  // 更新键值对
  const updateEntry = (
    setter: React.Dispatch<React.SetStateAction<KvEntry[]>>,
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    setter(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  // 删除键值对行
  const removeEntry = (setter: React.Dispatch<React.SetStateAction<KvEntry[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // 校验
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('请输入服务名称');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
      setError('名称只能包含字母、数字、下划线和连字符');
      return;
    }
    if (transport === 'stdio' && !command.trim()) {
      setError('请输入可执行命令');
      return;
    }
    if (transport === 'http' && !url.trim()) {
      setError('请输入服务 URL');
      return;
    }

    const config: McpServerConfig = {
      name: trimmedName,
      transport,
      enabled: server?.enabled ?? true,
      trusted,
    };

    if (transport === 'stdio') {
      config.command = command.trim();
      const args = argsText.trim().split(/\s+/).filter(Boolean);
      if (args.length > 0) config.args = args;
      const env = entriesToRecord(envEntries);
      if (env) config.env = env;
    } else {
      config.url = url.trim();
      const headers = entriesToRecord(headerEntries);
      if (headers) config.headers = headers;
    }

    onSave(config);
  };

  // 渲染键值对编辑器
  const renderKvEditor = (
    label: string,
    entries: KvEntry[],
    setter: React.Dispatch<React.SetStateAction<KvEntry[]>>,
    keyPlaceholder: string,
    valuePlaceholder: string
  ) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-foreground">{label}</label>
        <button
          type="button"
          onClick={() => addEntry(setter)}
          className="text-xs text-primary hover:text-primary/80"
        >
          + 添加
        </button>
      </div>
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground">暂无，点击「+ 添加」新增</p>
      )}
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-2 mb-1.5">
          <input
            type="text"
            value={entry.key}
            onChange={e => updateEntry(setter, i, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            value={entry.value}
            onChange={e => updateEntry(setter, i, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => removeEntry(setter, i)}
            className="text-muted-foreground hover:text-destructive px-1"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-muted/50 rounded-xl border border-border p-5 mt-3">
      <h4 className="text-sm font-semibold text-foreground mb-4">
        {isEdit ? '编辑 MCP Server' : '添加 MCP Server'}
      </h4>

      {/* 名称 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-1.5">名称</label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          disabled={isEdit}
          placeholder="如 filesystem、github"
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
        />
      </div>

      {/* 传输类型 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-1.5">传输类型</label>
        <select
          value={transport}
          onChange={e => setTransport(e.target.value as 'stdio' | 'http')}
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        >
          <option value="stdio">stdio（本地进程）</option>
          <option value="http">HTTP（远程服务）</option>
        </select>
      </div>

      {/* stdio 模式字段 */}
      {transport === 'stdio' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1.5">命令</label>
            <input
              type="text"
              value={command}
              onChange={e => { setCommand(e.target.value); setError(''); }}
              placeholder="如 npx、node、python"
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1.5">参数</label>
            <input
              type="text"
              value={argsText}
              onChange={e => setArgsText(e.target.value)}
              placeholder="空格分隔，如 -y @modelcontextprotocol/server-filesystem /tmp"
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
          {renderKvEditor('环境变量', envEntries, setEnvEntries, '变量名', '变量值')}
        </>
      )}

      {/* http 模式字段 */}
      {transport === 'http' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1.5">URL</label>
            <input
              type="text"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }}
              placeholder="如 http://localhost:3000/mcp"
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
          {renderKvEditor('请求头', headerEntries, setHeaderEntries, 'Header 名', 'Header 值')}
        </>
      )}

      {/* 信任开关 */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setTrusted(!trusted)}
          className={`relative w-10 h-5 rounded-full transition-colors ${trusted ? 'bg-primary' : 'bg-muted-foreground/30'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${trusted ? 'translate-x-5' : ''}`}
          />
        </button>
        <span className="text-sm text-muted-foreground">信任此服务（跳过操作确认）</span>
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-destructive mb-3">{error}</p>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          {isEdit ? '保存修改' : '添加'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-secondary text-secondary-foreground text-sm rounded-lg hover:bg-accent transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
};
