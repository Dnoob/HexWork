import { ipcMain } from 'electron';
import { testConnection } from '../services/llm';

// 注册 LLM 相关的 IPC 处理器
export const registerLlmIPC = (): void => {
  // 测试 API Key 连接
  ipcMain.handle(
    'llm:testConnection',
    async (_event, providerId: string, apiKey: string, model: string) => {
      return testConnection(providerId, apiKey, model);
    },
  );
};
