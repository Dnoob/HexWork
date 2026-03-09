import { useEffect } from 'react';
import { useSchedulerStore } from '../../stores/schedulerStore';
import { ScheduledTaskForm } from './ScheduledTaskForm';
import { ScheduledTaskHistory } from './ScheduledTaskHistory';

// 简单描述 cron 表达式
const describeCron = (expr: string): string => {
  const parts = expr.split(' ');
  if (parts.length !== 5) return expr;

  const [min, hour, , , dow] = parts;

  if (expr === '0 * * * *') return '每小时整点';
  if (expr === '*/30 * * * *') return '每30分钟';
  if (expr.match(/^\d+ \d+ \* \* \*$/)) return `每天 ${hour!.padStart(2, '0')}:${min!.padStart(2, '0')}`;
  if (expr.match(/^\d+ \d+ \* \* 1-5$/)) return `工作日 ${hour!.padStart(2, '0')}:${min!.padStart(2, '0')}`;
  if (dow === '0' || dow === '7') return `每周日 ${hour!.padStart(2, '0')}:${min!.padStart(2, '0')}`;

  return expr;
};

export const ScheduledTaskList = () => {
  const {
    tasks, loading,
    showForm, historyTaskId,
    loadTasks, deleteTask, toggleTask, runNow, openForm, loadHistory,
  } = useSchedulerStore();

  useEffect(() => {
    loadTasks();

    // 监听任务完成通知，自动刷新列表
    const unsubscribe = window.api.scheduler.onTaskComplete(() => {
      loadTasks();
    });
    return unsubscribe;
  }, [loadTasks]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`确定要删除任务「${name}」吗？`)) {
      await deleteTask(id);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await runNow(id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '执行失败');
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">配置定时任务，让 AI 按计划自动执行。</p>
          <button
            onClick={() => openForm()}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
          >
            + 新建
          </button>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-4">加载中...</p>
        ) : tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            暂无定时任务。点击"新建"创建第一个定时任务。
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => {
              const statusColor = task.enabled
                ? task.lastStatus === 'error' ? 'bg-red-500' : 'bg-green-500'
                : 'bg-muted-foreground/30';
              const statusIcon = task.lastStatus === 'success' ? '\u2705'
                : task.lastStatus === 'error' ? '\u274C'
                : task.lastStatus === 'running' ? '\u23F3'
                : '';

              return (
                <div
                  key={task.id}
                  className={`border rounded-xl p-4 ${task.enabled ? 'border-border' : 'border-border/50 bg-muted/50'}`}
                >
                  {/* 第一行：状态 + 名称 + 频率 */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
                    <span className={`font-medium text-sm ${task.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {task.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {describeCron(task.cronExpr)}
                    </span>
                  </div>

                  {/* 第二行：描述 */}
                  <p className={`text-xs mb-2 ml-4 ${task.enabled ? 'text-muted-foreground' : 'text-muted-foreground/70'} line-clamp-1`}>
                    {task.prompt}
                  </p>

                  {/* 第三行：上次/下次执行 */}
                  {task.lastRunAt && (
                    <p className="text-xs text-muted-foreground ml-4 mb-2">
                      上次: {new Date(task.lastRunAt).toLocaleString('zh-CN')} {statusIcon}
                    </p>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleTask(task.id, !task.enabled)}
                      className={`text-xs px-2 py-1 rounded ${task.enabled ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10' : 'text-green-600 dark:text-green-400 hover:bg-green-500/10'} transition-colors`}
                    >
                      {task.enabled ? '禁用' : '启用'}
                    </button>
                    {task.enabled && (
                      <button
                        onClick={() => handleRunNow(task.id)}
                        className="text-xs px-2 py-1 rounded text-primary hover:bg-primary/10 transition-colors"
                      >
                        立即执行
                      </button>
                    )}
                    <button
                      onClick={() => openForm(task)}
                      className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-accent transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => loadHistory(task.id)}
                      className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-accent transition-colors"
                    >
                      历史
                    </button>
                    <button
                      onClick={() => handleDelete(task.id, task.name)}
                      className="text-xs px-2 py-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 新建/编辑表单 */}
      {showForm && <ScheduledTaskForm />}

      {/* 执行历史 */}
      {historyTaskId && <ScheduledTaskHistory />}
    </>
  );
};
