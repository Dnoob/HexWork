import { safeStorage } from 'electron';
import { getDatabase } from './db';

// 需要加密存储的配置键前缀
const ENCRYPTED_KEY_PREFIXES = ['llm.apiKey'];

// 判断是否需要加密
const isEncryptedKey = (key: string): boolean =>
  ENCRYPTED_KEY_PREFIXES.some(prefix => key === prefix || key.startsWith(prefix + '.'));

// 获取配置值，加密键会自动解密
export const getConfig = (key: string): string | null => {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as
    | { value: string }
    | undefined;

  if (!row) return null;

  // 对加密键进行解密
  if (isEncryptedKey(key) && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(row.value, 'base64'));
    } catch {
      // 兼容未加密的旧值，直接返回原始值
      return row.value;
    }
  }

  return row.value;
};

// 设置配置值，加密键会自动加密
export const setConfig = (key: string, value: string): void => {
  const db = getDatabase();
  let storedValue = value;

  // 对加密键进行加密
  if (isEncryptedKey(key) && safeStorage.isEncryptionAvailable()) {
    storedValue = safeStorage.encryptString(value).toString('base64');
  }

  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(
    key,
    storedValue,
  );
};
