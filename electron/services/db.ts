import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database | null = null;

// 初始化数据库，创建表结构
export const initDatabase = (): void => {
  const dbPath = path.join(app.getPath('userData'), 'hexwork.db');
  db = new Database(dbPath);

  // 启用 WAL 模式提高并发读写性能
  db.pragma('journal_mode = WAL');
  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      metadata TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS operation_log (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      skill_name TEXT NOT NULL,
      arguments TEXT,
      result TEXT,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_skills (
      name TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      path TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('local', 'git', 'builtin', 'market')),
      source_url TEXT,
      enabled INTEGER DEFAULT 1,
      metadata TEXT,
      installed_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      cron_expr TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      auto_approve INTEGER DEFAULT 1,
      last_run_at INTEGER,
      last_status TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      conversation_id TEXT,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      error_message TEXT,
      FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
    );
  `);

  // 数据库迁移：agent_skills 表添加 'builtin' source 类型
  const skillsTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='agent_skills'").get() as { sql: string } | undefined;
  if (skillsTableInfo && !skillsTableInfo.sql.includes("'builtin'")) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE agent_skills_new (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        path TEXT NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('local', 'git', 'builtin', 'market')),
        source_url TEXT,
        enabled INTEGER DEFAULT 1,
        metadata TEXT,
        installed_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO agent_skills_new SELECT * FROM agent_skills;
      DROP TABLE agent_skills;
      ALTER TABLE agent_skills_new RENAME TO agent_skills;
    `);
    db.pragma('foreign_keys = ON');
  }

  // 数据库迁移：agent_skills 表添加 'market' source 类型
  const skillsTableInfo2 = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='agent_skills'").get() as { sql: string } | undefined;
  if (skillsTableInfo2 && !skillsTableInfo2.sql.includes("'market'")) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE agent_skills_new2 (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        path TEXT NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('local', 'git', 'builtin', 'market')),
        source_url TEXT,
        enabled INTEGER DEFAULT 1,
        metadata TEXT,
        installed_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO agent_skills_new2 SELECT * FROM agent_skills;
      DROP TABLE agent_skills;
      ALTER TABLE agent_skills_new2 RENAME TO agent_skills;
    `);
    db.pragma('foreign_keys = ON');
  }

  // 数据库迁移：conversations 表添加 pinned 列
  try {
    db.exec('ALTER TABLE conversations ADD COLUMN pinned INTEGER DEFAULT 0');
  } catch {
    // 列已存在，忽略
  }

  // 数据库迁移：检查 messages 表是否需要升级
  // SQLite 无法直接修改 CHECK 约束，需通过重建表来迁移
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='messages'").get() as { sql: string } | undefined;
  if (tableInfo && !tableInfo.sql.includes("'tool'")) {
    // 旧表不包含 'tool' 角色，需要重建
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE messages_new (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
      INSERT INTO messages_new (id, conversation_id, role, content, created_at)
        SELECT id, conversation_id, role, content, created_at FROM messages;
      DROP TABLE messages;
      ALTER TABLE messages_new RENAME TO messages;
    `);
    db.pragma('foreign_keys = ON');
  }
};

// 获取数据库实例，未初始化时抛出错误
export const getDatabase = (): Database.Database => {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
};

// 关闭数据库连接
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};
