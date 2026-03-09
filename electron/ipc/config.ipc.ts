import { ipcMain } from 'electron';
import { getConfig, setConfig } from '../services/config';

// 注册配置管理相关的 IPC 处理器
export const registerConfigIPC = (): void => {
  // 获取配置值
  ipcMain.handle('config:get', (_event, key: string) => {
    return getConfig(key);
  });

  // 设置配置值
  ipcMain.handle('config:set', (_event, key: string, value: string) => {
    setConfig(key, value);
  });
};
