import crypto from 'crypto';
import { Notification, BrowserWindow } from 'electron';
import { getDatabase } from '../db';
import { executeChatLoop } from '../llm';

// 无头对话：定时任务使用，不依赖 IPC
export const headlessChat = async (
  taskId: string,
  taskName: string,
  prompt: string,
  autoApprove: boolean,
): Promise<{ conversationId: string; status: 'success' | 'error'; errorMessage?: string }> => {
  const db = getDatabase();
  const now = Date.now();

  // 创建新会话
  const conversationId = crypto.randomUUID();
  const title = `[定时] ${taskName} - ${new Date(now).toLocaleString('zh-CN')}`;
  db.prepare(
    'INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
  ).run(conversationId, title, now, now);

  // 写入 task_runs 记录
  const runId = crypto.randomUUID();
  db.prepare(
    'INSERT INTO task_runs (id, task_id, conversation_id, status, started_at) VALUES (?, ?, ?, ?, ?)',
  ).run(runId, taskId, conversationId, 'running', now);

  // 更新任务状态
  db.prepare(
    'UPDATE scheduled_tasks SET last_run_at = ?, last_status = ?, updated_at = ? WHERE id = ?',
  ).run(now, 'running', now, taskId);

  try {
    await executeChatLoop(conversationId, prompt, {
      onChunk: () => {
        // 无头模式不需要流式输出
      },
      onToolCall: (name) => {
        console.log(`[定时任务][${taskName}] 调用工具: ${name}`);
      },
      onToolResult: (name, summary) => {
        console.log(`[定时任务][${taskName}] 工具结果: ${name} - ${summary}`);
      },
      // autoApprove 时直接批准，否则不提供确认回调（跳过需确认的操作）
      onConfirmToolCall: autoApprove
        ? async () => true
        : async (_id, name) => {
          console.log(`[定时任务][${taskName}] 跳过需确认操作: ${name}`);
          return false;
        },
    });

    // 成功完成
    const finishedAt = Date.now();
    db.prepare(
      'UPDATE task_runs SET status = ?, finished_at = ? WHERE id = ?',
    ).run('success', finishedAt, runId);
    db.prepare(
      'UPDATE scheduled_tasks SET last_status = ?, updated_at = ? WHERE id = ?',
    ).run('success', finishedAt, taskId);

    // 发送系统通知
    sendNotification(taskName, '任务执行成功', conversationId);

    // 通知前端刷新
    notifyFrontend(taskId, taskName, 'success');

    return { conversationId, status: 'success' };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    const finishedAt = Date.now();

    db.prepare(
      'UPDATE task_runs SET status = ?, finished_at = ?, error_message = ? WHERE id = ?',
    ).run('error', finishedAt, errorMessage, runId);
    db.prepare(
      'UPDATE scheduled_tasks SET last_status = ?, updated_at = ? WHERE id = ?',
    ).run('error', finishedAt, taskId);

    // 发送失败通知
    sendNotification(taskName, `任务执行失败: ${errorMessage}`, conversationId);
    notifyFrontend(taskId, taskName, 'error');

    return { conversationId, status: 'error', errorMessage };
  }
};

// 发送桌面通知
const sendNotification = (taskName: string, body: string, _conversationId: string): void => {
  try {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: `HexWork 定时任务 - ${taskName}`,
        body,
      });
      notification.show();
    }
  } catch (err) {
    console.error('发送通知失败:', err);
  }
};

// 通知前端刷新
const notifyFrontend = (taskId: string, taskName: string, status: string): void => {
  try {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send('scheduler:onTaskComplete', { taskId, taskName, status });
    }
  } catch (err) {
    console.error('通知前端失败:', err);
  }
};
