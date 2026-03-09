import { useState, useEffect } from 'react';
import { useSchedulerStore } from '../../stores/schedulerStore';

// cron 表达式描述
const cronPresets = [
  { label: '每天', cron: '0 9 * * *', desc: '每天 09:00' },
  { label: '工作日', cron: '0 9 * * 1-5', desc: '周一至周五 09:00' },
  { label: '每小时', cron: '0 * * * *', desc: '每小时整点' },
  { label: '每30分钟', cron: '*/30 * * * *', desc: '每30分钟' },
];

export const ScheduledTaskForm = () => {
  const { editingTask, closeForm, createTask, updateTask } = useSchedulerStore();
  const isEditing = !!editingTask;

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [cronType, setCronType] = useState<'preset' | 'custom'>('preset');
  const [presetIndex, setPresetIndex] = useState(0);
  const [customCron, setCustomCron] = useState('');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [autoApprove, setAutoApprove] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTask) {
      setName(editingTask.name);
      setPrompt(editingTask.prompt);
      setAutoApprove(editingTask.autoApprove);

      // 判断是否匹配预设
      const presetIdx = cronPresets.findIndex(p => p.cron === editingTask.cronExpr);
      if (presetIdx >= 0) {
        setCronType('preset');
        setPresetIndex(presetIdx);
      } else {
        setCronType('custom');
        setCustomCron(editingTask.cronExpr);
      }

      // 解析小时和分钟
      const parts = editingTask.cronExpr.split(' ');
      if (parts.length >= 2) {
        const m = parts[0];
        const h = parts[1];
        if (/^\d+$/.test(m)) setMinute(m.padStart(2, '0'));
        if (/^\d+$/.test(h)) setHour(h.padStart(2, '0'));
      }
    }
  }, [editingTask]);

  // 根据选择构建 cron 表达式
  const buildCronExpr = (): string => {
    if (cronType === 'custom') return customCron;

    const preset = cronPresets[presetIndex];
    if (!preset) return '';

    // 对于每天和工作日，替换小时和分钟
    if (presetIndex === 0) return `${parseInt(minute)} ${parseInt(hour)} * * *`;
    if (presetIndex === 1) return `${parseInt(minute)} ${parseInt(hour)} * * 1-5`;
    return preset.cron;
  };

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('请输入任务名称'); return; }
    if (!prompt.trim()) { setError('请输入提示词'); return; }

    const cronExpr = buildCronExpr();
    if (!cronExpr.trim()) { setError('请输入 cron 表达式'); return; }

    setSaving(true);
    try {
      if (isEditing) {
        await updateTask(editingTask!.id, { name: name.trim(), prompt: prompt.trim(), cronExpr, autoApprove });
      } else {
        await createTask({ name: name.trim(), prompt: prompt.trim(), cronExpr, autoApprove });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-border">
        <div className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            {isEditing ? '编辑定时任务' : '新建定时任务'}
          </h3>

          {/* 任务名称 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如：日报汇总"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* 提示词 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">提示词</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="发送给 AI 的指令..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* 执行频率 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">执行频率</label>
            <div className="space-y-2">
              {cronPresets.map((preset, idx) => (
                <label key={idx} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cronType"
                    checked={cronType === 'preset' && presetIndex === idx}
                    onChange={() => { setCronType('preset'); setPresetIndex(idx); }}
                    className="text-primary"
                  />
                  <span className="text-sm text-foreground">{preset.label}</span>
                  <span className="text-xs text-muted-foreground">{preset.desc}</span>
                </label>
              ))}

              {/* 时间选择（仅对每天和工作日有效） */}
              {cronType === 'preset' && presetIndex <= 1 && (
                <div className="ml-6 flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">时间:</span>
                  <input
                    type="text"
                    value={hour}
                    onChange={e => setHour(e.target.value)}
                    className="w-12 rounded border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:border-ring"
                    maxLength={2}
                  />
                  <span className="text-muted-foreground">:</span>
                  <input
                    type="text"
                    value={minute}
                    onChange={e => setMinute(e.target.value)}
                    className="w-12 rounded border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:border-ring"
                    maxLength={2}
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cronType"
                  checked={cronType === 'custom'}
                  onChange={() => setCronType('custom')}
                  className="text-primary"
                />
                <span className="text-sm text-foreground">自定义 cron</span>
              </label>
              {cronType === 'custom' && (
                <div className="ml-6">
                  <input
                    type="text"
                    value={customCron}
                    onChange={e => setCustomCron(e.target.value)}
                    placeholder="0 9 * * *（分 时 日 月 周）"
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">格式: 分(0-59) 时(0-23) 日(1-31) 月(1-12) 周(0-7)</p>
                </div>
              )}
            </div>
          </div>

          {/* 自动批准 */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={e => setAutoApprove(e.target.checked)}
                className="rounded text-primary"
              />
              <span className="text-sm text-foreground">自动批准危险操作（文件写入、脚本执行）</span>
            </label>
          </div>

          {/* 错误信息 */}
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-2">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
