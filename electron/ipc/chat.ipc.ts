import { ipcMain, IpcMainEvent } from 'electron';
import { streamChat, stopGeneration } from '../services/llm';
import { FileAttachment } from '../services/attachment';

// 注册聊天相关的 IPC 处理器
export const registerChatIPC = (): void => {
  // 发送消息，触发流式对话
  ipcMain.on(
    'chat:send',
    async (event: IpcMainEvent, conversationId: string, content: string, attachments?: FileAttachment[]) => {
      await streamChat(conversationId, content, event, attachments);
    },
  );

  // 停止当前生成
  ipcMain.on('chat:stop', () => {
    stopGeneration();
  });
};
