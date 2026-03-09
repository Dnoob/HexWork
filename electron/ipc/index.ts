import { registerChatIPC } from './chat.ipc';
import { registerConfigIPC } from './config.ipc';
import { registerConversationIPC } from './conversation.ipc';
import { registerFileIPC } from './file.ipc';
import { registerBrowserIPC } from './browser.ipc';
import { registerMcpIPC } from './mcp.ipc';
import { registerSkillIPC } from './skill.ipc';
import { registerSchedulerIPC } from './scheduler.ipc';
import { registerLlmIPC } from './llm.ipc';
import { registerStudioIPC } from './studio.ipc';

// 注册所有 IPC 处理器
export const registerAllIPC = (): void => {
  registerChatIPC();
  registerLlmIPC();
  registerConfigIPC();
  registerConversationIPC();
  registerFileIPC();
  registerBrowserIPC();
  registerMcpIPC();
  registerSkillIPC();
  registerSchedulerIPC();
  registerStudioIPC();
};
