import { Message } from '@/types';

// 用户消息项
export interface UserItem {
  type: 'user';
  message: Message;
}

// AI 响应组：思考 + 工具链 + 回复合为一体
export interface ResponseGroup {
  type: 'response';
  id: string;
  steps: Message[];       // assistant(toolCalls) + tool 消息
  reply: Message | null;  // 最终 assistant 文本回复（流式未完成时可为 null）
}

export type DisplayItem = UserItem | ResponseGroup;

// 将扁平消息列表分组为显示项
export const groupMessages = (messages: Message[]): DisplayItem[] => {
  const items: DisplayItem[] = [];
  let currentGroup: ResponseGroup | null = null;

  const flushGroup = () => {
    if (currentGroup) {
      items.push(currentGroup);
      currentGroup = null;
    }
  };

  for (const msg of messages) {
    if (msg.role === 'user') {
      flushGroup();
      items.push({ type: 'user', message: msg });
    } else if (msg.role === 'assistant' && msg.toolCalls) {
      // assistant 带 toolCalls：归入当前组的 steps
      if (!currentGroup) {
        currentGroup = { type: 'response', id: `group-${msg.id}`, steps: [], reply: null };
      }
      currentGroup.steps.push(msg);
    } else if (msg.role === 'tool') {
      // tool 结果：归入当前组的 steps
      if (!currentGroup) {
        currentGroup = { type: 'response', id: `group-${msg.id}`, steps: [], reply: null };
      }
      currentGroup.steps.push(msg);
    } else if (msg.role === 'assistant') {
      // 纯文本 assistant：作为当前组的 reply
      if (!currentGroup) {
        currentGroup = { type: 'response', id: `group-${msg.id}`, steps: [], reply: null };
      }
      currentGroup.reply = msg;
      flushGroup();
    }
  }

  flushGroup();
  return items;
};
