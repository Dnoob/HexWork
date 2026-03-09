import { ipcMain } from 'electron';
import { taskScheduler } from '../services/scheduler';

// 注册定时任务相关的 IPC 处理器
export const registerSchedulerIPC = (): void => {
  // 获取所有任务
  ipcMain.handle('scheduler:list', () => {
    return taskScheduler.listTasks();
  });

  // 创建任务
  ipcMain.handle('scheduler:create', (_event, params: { name: string; prompt: string; cronExpr: string; autoApprove?: boolean }) => {
    return taskScheduler.createTask(params);
  });

  // 更新任务
  ipcMain.handle('scheduler:update', (_event, id: string, params: { name?: string; prompt?: string; cronExpr?: string; autoApprove?: boolean }) => {
    return taskScheduler.updateTask(id, params);
  });

  // 删除任务
  ipcMain.handle('scheduler:delete', (_event, id: string) => {
    taskScheduler.deleteTask(id);
  });

  // 启用/禁用
  ipcMain.handle('scheduler:toggle', (_event, id: string, enabled: boolean) => {
    taskScheduler.toggleTask(id, enabled);
  });

  // 手动立即执行
  ipcMain.handle('scheduler:runNow', async (_event, id: string) => {
    await taskScheduler.runNow(id);
  });

  // 获取执行历史
  ipcMain.handle('scheduler:history', (_event, taskId: string, limit?: number) => {
    return taskScheduler.getHistory(taskId, limit);
  });
};
