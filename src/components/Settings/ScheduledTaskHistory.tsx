import { useEffect } from 'react';
import { useSchedulerStore } from '../../stores/schedulerStore';
import { useChatStore } from '../../stores/chatStore';

// 状态图标和颜色
const statusConfig: Record<string, { icon: string; color: string; label: string }> = {
  success: { icon: '\u2705', color: 'text-green-600 dark:text-green-400', label: '成功' },
  error: { icon: '\u274C', color: 'text-destructive', label: '失败' },
  missed: { icon: '\u26AA', color: 'text-muted-foreground', label: '错过' },
  cancelled: { icon: '\u23F8\uFE0F', color: 'text-yellow-600 dark:text-yellow-400', label: '取消' },
  running: { icon: '\u23F3', color: 'text-primary', label: '执行中' },
};

export const ScheduledTaskHistory = () => {
  const { historyTaskId, historyRuns, historyLoading, closeHistory, tasks } = useSchedulerStore();
  const { selectConversation, toggleSettings } = useChatStore();

  const task = tasks.find(t => t.id === historyTaskId);

  useEffect(() => {
    // 已在 loadHistory 中加载
  }, [historyTaskId]);

  if (!historyTaskId) return null;

  const handleViewConversation = async (conversationId: string) => {
    // 跳转到对应会话
    await selectConversation(conversationId);
    toggleSettings();
    closeHistory();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col border border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">
              {task?.name || '任务'} — 执行历史
            </h3>
            <button
              onClick={closeHistory}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {historyLoading ? (
            <p className="text-center text-muted-foreground py-4">加载中...</p>
          ) : historyRuns.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">暂无执行记录</p>
          ) : (
            <div className="space-y-3">
              {historyRuns.map(run => {
                const config = statusConfig[run.status] || statusConfig.error;
                const startTime = new Date(run.startedAt).toLocaleString('zh-CN');
                const duration = run.finishedAt
                  ? Math.round((run.finishedAt - run.startedAt) / 1000)
                  : null;

                return (
                  <div
                    key={run.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base">{config.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{startTime}</p>
                        <p className={`text-xs ${config.color}`}>
                          {config.label}
                          {duration !== null && ` · ${duration}秒`}
                          {run.errorMessage && ` · ${run.errorMessage}`}
                        </p>
                      </div>
                    </div>
                    {run.conversationId && run.status !== 'missed' && (
                      <button
                        onClick={() => handleViewConversation(run.conversationId!)}
                        className="text-xs text-primary hover:text-primary/80 whitespace-nowrap ml-2"
                      >
                        查看会话
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
