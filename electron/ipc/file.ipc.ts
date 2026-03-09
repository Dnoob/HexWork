import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../services/config';

// 注册文件操作相关的 IPC 处理器
export const registerFileIPC = (): void => {
  // 选择目录（打开系统文件夹选择对话框）
  ipcMain.handle('file:selectDir', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: '选择工作目录',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // 选择文件（打开系统文件选择对话框）
  ipcMain.handle('file:selectFile', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      title: '选择文件',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths;
  });

  // 保存临时文件（用于粘贴的图片）
  ipcMain.handle('file:saveTempFile', async (_event, fileName: string, base64Data: string) => {
    const tempDir = path.join(app.getPath('temp'), 'hexwork-attachments');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, `${Date.now()}-${fileName}`);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { path: filePath, size: buffer.length };
  });

  // 列出目录内容
  ipcMain.handle('file:listDir', async (_event, dirPath: string) => {
    const workingDir = getConfig('workingDir');
    if (!workingDir) {
      throw new Error('未设置工作目录');
    }

    // 校验路径安全性
    const resolved = path.resolve(workingDir, dirPath);
    const normalizedWorkDir = path.resolve(workingDir);
    if (!resolved.startsWith(normalizedWorkDir + path.sep) && resolved !== normalizedWorkDir) {
      throw new Error('不允许访问工作目录之外的路径');
    }

    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      path: path.relative(workingDir, path.join(resolved, entry.name)),
      isDirectory: entry.isDirectory(),
      size: entry.isDirectory() ? undefined : fs.statSync(path.join(resolved, entry.name)).size,
      extension: entry.isDirectory() ? undefined : path.extname(entry.name).toLowerCase(),
    })).sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  });
};
