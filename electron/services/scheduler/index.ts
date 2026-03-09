import cron from 'node-cron';
import crypto from 'crypto';
import { getDatabase } from '../db';
import { headlessChat } from './executor';

// 数据库行类型
interface TaskRow {
  id: string;
  name: string;
  prompt: string;
  cron_expr: string;
  enabled: number;
  auto_approve: number;
  last_run_at: number | null;
  last_status: string | null;
  created_at: number;
  updated_at: number;
}

interface TaskRunRow {
  id: string;
  task_id: string;
  conversation_id: string | null;
  status: string;
  started_at: number;
  finished_at: number | null;
  error_message: string | null;
}

// 前端用的任务类型
interface ScheduledTask {
  id: string;
  name: string;
  prompt: string;
  cronExpr: string;
  enabled: boolean;
  autoApprove: boolean;
  lastRunAt: number | null;
  lastStatus: string | null;
  nextRunAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface TaskRun {
  id: string;
  taskId: string;
  conversationId: string | null;
  status: string;
  startedAt: number;
  finishedAt: number | null;
  errorMessage: string | null;
}

// 数据库行转前端对象
const rowToTask = (row: TaskRow): ScheduledTask => {
  const nextRunAt: number | null = null;
  if (row.enabled) {
    try {
      // node-cron v4 没有 nextDate 方法，手动计算下次执行时间
      // 通过创建临时任务获取下一个触发时间不太现实，这里简单返回 null
      // 前端可以根据 cron 表达式自行计算
      const task = cron.schedule(row.cron_expr, () => {}, { scheduled: false });
      // node-cron v4 的 ScheduledTask 没有 nextDate，使用 getTasks 也不行
      // 简单处理：不计算 nextRunAt，前端用 cronstrue 展示
      task.stop();
    } catch {
      // 忽略
    }
  }

  return {
    id: row.id,
    name: row.name,
    prompt: row.prompt,
    cronExpr: row.cron_expr,
    enabled: row.enabled === 1,
    autoApprove: row.auto_approve === 1,
    lastRunAt: row.last_run_at,
    lastStatus: row.last_status,
    nextRunAt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const rowToRun = (row: TaskRunRow): TaskRun => ({
  id: row.id,
  taskId: row.task_id,
  conversationId: row.conversation_id,
  status: row.status,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  errorMessage: row.error_message,
});

// 任务调度器
class TaskScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private runningTasks: Set<string> = new Set();

  // 启动：从 DB 加载所有 enabled 任务，注册 cron
  start(): void {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM scheduled_tasks WHERE enabled = 1',
    ).all() as TaskRow[];

    for (const row of rows) {
      this.scheduleJob(row);
    }

    console.log(`[TaskScheduler] 已启动，加载 ${rows.length} 个定时任务`);
  }

  // 停止所有任务
  stopAll(): void {
    for (const [id, job] of this.jobs) {
      job.stop();
      console.log(`[TaskScheduler] 停止任务: ${id}`);
    }
    this.jobs.clear();
  }

  // 创建任务
  createTask(params: { name: string; prompt: string; cronExpr: string; autoApprove?: boolean }): ScheduledTask {
    // 校验 cron 表达式
    if (!cron.validate(params.cronExpr)) {
      throw new Error(`无效的 cron 表达式: ${params.cronExpr}`);
    }

    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();
    const autoApprove = params.autoApprove !== false ? 1 : 0;

    db.prepare(
      'INSERT INTO scheduled_tasks (id, name, prompt, cron_expr, enabled, auto_approve, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
    ).run(id, params.name, params.prompt, params.cronExpr, autoApprove, now, now);

    const row = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as TaskRow;

    // 立即调度
    this.scheduleJob(row);

    return rowToTask(row);
  }

  // 更新任务
  updateTask(id: string, params: { name?: string; prompt?: string; cronExpr?: string; autoApprove?: boolean }): ScheduledTask {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as TaskRow | undefined;
    if (!existing) throw new Error(`任务不存在: ${id}`);

    if (params.cronExpr && !cron.validate(params.cronExpr)) {
      throw new Error(`无效的 cron 表达式: ${params.cronExpr}`);
    }

    const name = params.name ?? existing.name;
    const prompt = params.prompt ?? existing.prompt;
    const cronExpr = params.cronExpr ?? existing.cron_expr;
    const autoApprove = params.autoApprove !== undefined ? (params.autoApprove ? 1 : 0) : existing.auto_approve;
    const now = Date.now();

    db.prepare(
      'UPDATE scheduled_tasks SET name = ?, prompt = ?, cron_expr = ?, auto_approve = ?, updated_at = ? WHERE id = ?',
    ).run(name, prompt, cronExpr, autoApprove, now, id);

    // 重新调度
    this.unscheduleJob(id);
    if (existing.enabled) {
      const row = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as TaskRow;
      this.scheduleJob(row);
    }

    const updated = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as TaskRow;
    return rowToTask(updated);
  }

  // 删除任务
  deleteTask(id: string): void {
    this.unscheduleJob(id);
    const db = getDatabase();
    db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
  }

  // 启用/禁用任务
  toggleTask(id: string, enabled: boolean): void {
    const db = getDatabase();
    db.prepare(
      'UPDATE scheduled_tasks SET enabled = ?, updated_at = ? WHERE id = ?',
    ).run(enabled ? 1 : 0, Date.now(), id);

    if (enabled) {
      const row = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as TaskRow;
      if (row) this.scheduleJob(row);
    } else {
      this.unscheduleJob(id);
    }
  }

  // 手动立即执行
  async runNow(id: string): Promise<void> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as TaskRow | undefined;
    if (!row) throw new Error(`任务不存在: ${id}`);

    if (this.runningTasks.has(id)) {
      throw new Error('任务正在执行中');
    }

    // 异步执行，不阻塞
    this.executeTask(row);
  }

  // 获取任务列表
  listTasks(): ScheduledTask[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM scheduled_tasks ORDER BY created_at DESC',
    ).all() as TaskRow[];
    return rows.map(rowToTask);
  }

  // 获取执行历史
  getHistory(taskId: string, limit = 20): TaskRun[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM task_runs WHERE task_id = ? ORDER BY started_at DESC LIMIT ?',
    ).all(taskId, limit) as TaskRunRow[];
    return rows.map(rowToRun);
  }

  // 内部方法：注册 cron job
  private scheduleJob(row: TaskRow): void {
    if (this.jobs.has(row.id)) {
      this.unscheduleJob(row.id);
    }

    try {
      const job = cron.schedule(row.cron_expr, () => {
        this.executeTask(row);
      });

      this.jobs.set(row.id, job);
      console.log(`[TaskScheduler] 已调度任务: ${row.name} (${row.cron_expr})`);
    } catch (err) {
      console.error(`[TaskScheduler] 调度任务失败: ${row.name}`, err);
    }
  }

  // 内部方法：取消 cron job
  private unscheduleJob(id: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
    }
  }

  // 内部方法：执行任务
  private async executeTask(row: TaskRow): Promise<void> {
    if (this.runningTasks.has(row.id)) {
      console.log(`[TaskScheduler] 任务 ${row.name} 正在执行中，跳过本次触发`);
      return;
    }

    this.runningTasks.add(row.id);
    console.log(`[TaskScheduler] 开始执行任务: ${row.name}`);

    try {
      await headlessChat(row.id, row.name, row.prompt, row.auto_approve === 1);
    } catch (err) {
      console.error(`[TaskScheduler] 任务执行异常: ${row.name}`, err);
    } finally {
      this.runningTasks.delete(row.id);
    }
  }
}

// 单例
export const taskScheduler = new TaskScheduler();
