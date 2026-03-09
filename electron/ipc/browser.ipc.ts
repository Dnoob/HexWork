// 浏览器控制 IPC
import { ipcMain } from 'electron';
import { browserController } from '../services/skills/browser/controller';

export const registerBrowserIPC = (): void => {
  // 关闭浏览器
  ipcMain.handle('browser:close', async () => {
    await browserController.close();
  });
};
