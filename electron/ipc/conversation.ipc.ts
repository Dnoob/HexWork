import { ipcMain } from 'electron';
import crypto from 'crypto';
import { getDatabase } from '../services/db';

// 注册会话管理相关的 IPC 处理器
export const registerConversationIPC = (): void => {
  // 获取会话列表，置顶优先，再按更新时间倒序
  ipcMain.handle('conversation:list', () => {
    const db = getDatabase();
    const rows = db
      .prepare(
        'SELECT id, title, pinned, created_at as createdAt, updated_at as updatedAt FROM conversations ORDER BY pinned DESC, updated_at DESC',
      )
      .all() as Array<{ id: string; title: string; pinned: number; createdAt: number; updatedAt: number }>;
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      pinned: row.pinned === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  });

  // 创建新会话
  ipcMain.handle('conversation:create', (_event, title?: string) => {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();
    db.prepare(
      'INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).run(id, title || '新对话', now, now);
    return { id, title: title || '新对话', pinned: false, createdAt: now, updatedAt: now };
  });

  // 删除会话及其消息
  ipcMain.handle('conversation:delete', (_event, id: string) => {
    const db = getDatabase();
    // 先删消息再删会话（虽然有 ON DELETE CASCADE，显式删除更安全）
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  });

  // 置顶/取消置顶会话
  ipcMain.handle('conversation:pin', async (_event, id: string, pinned: boolean) => {
    const db = getDatabase();
    db.prepare('UPDATE conversations SET pinned = ? WHERE id = ?').run(pinned ? 1 : 0, id);
  });

  // 重命名会话
  ipcMain.handle('conversation:rename', (_event, id: string, title: string) => {
    const db = getDatabase();
    db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(
      title,
      Date.now(),
      id,
    );
  });

  // 获取会话的消息列表，按创建时间正序（包含 metadata）
  ipcMain.handle('message:list', (_event, conversationId: string) => {
    const db = getDatabase();
    const rows = db
      .prepare(
        'SELECT id, conversation_id as conversationId, role, content, created_at as createdAt, metadata FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      )
      .all(conversationId) as Array<{
        id: string;
        conversationId: string;
        role: string;
        content: string;
        createdAt: number;
        metadata: string | null;
      }>;

    // 解析 metadata 并合并到消息对象
    return rows.map(row => {
      const msg: Record<string, unknown> = {
        id: row.id,
        conversationId: row.conversationId,
        role: row.role,
        content: row.content,
        createdAt: row.createdAt,
      };
      if (row.metadata) {
        try {
          const meta = JSON.parse(row.metadata);
          if (meta.toolCalls) msg.toolCalls = meta.toolCalls;
          if (meta.toolCallId) msg.toolCallId = meta.toolCallId;
          if (meta.toolName) msg.toolName = meta.toolName;
          if (meta.preview) msg.preview = meta.preview;
        } catch {
          // 忽略无效的 metadata
        }
      }
      return msg;
    });
  });
};
