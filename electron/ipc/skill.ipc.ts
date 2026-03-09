// Agent Skills IPC 处理器
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { agentSkillManager } from '../services/skills/agent';

// ClawHub API 基础地址
const CLAWHUB_API = 'https://topclawhubskills.com/api';

export const registerSkillIPC = (): void => {
  // 获取所有已安装 skill 列表
  ipcMain.handle('skill:list', async () => {
    return agentSkillManager.listAll();
  });

  // 获取单个 skill 详情
  ipcMain.handle('skill:detail', async (_event, name: string) => {
    return agentSkillManager.getDetail(name);
  });

  // 从本地文件夹安装
  ipcMain.handle('skill:installLocal', async (_event, sourcePath: string) => {
    return agentSkillManager.installFromLocal(sourcePath);
  });

  // 从 Git URL 安装
  ipcMain.handle('skill:installGit', async (_event, url: string) => {
    return agentSkillManager.installFromGit(url);
  });

  // 卸载
  ipcMain.handle('skill:uninstall', async (_event, name: string) => {
    agentSkillManager.uninstall(name);
  });

  // 启用/禁用
  ipcMain.handle('skill:toggle', async (_event, name: string, enabled: boolean) => {
    agentSkillManager.toggle(name, enabled);
  });

  // 更新 Git 来源的 skill
  ipcMain.handle('skill:update', async (_event, name: string) => {
    return agentSkillManager.update(name);
  });

  // 创建新 skill
  ipcMain.handle('skill:create', async (_event, name: string, description: string, options: { scripts?: boolean; references?: boolean; assets?: boolean }) => {
    return agentSkillManager.create(name, description, options);
  });

  // 从 ClawHub 安装
  ipcMain.handle('skill:installClawHub', async (_event, slug: string, author: string) => {
    return agentSkillManager.installFromClawHub(slug, author);
  });

  // 搜索技能市场（ClawHub API）
  ipcMain.handle('skill:searchMarket', async (_event, query: string) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return [];
    }
    if (query.length > 200) {
      throw new Error('搜索关键词过长');
    }

    try {
      const url = `${CLAWHUB_API}/search?q=${encodeURIComponent(query.trim())}&limit=30`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ClawHub API 返回 ${response.status}`);
      }
      const json = await response.json();
      if (!json?.ok || !Array.isArray(json?.data)) return [];
      return json.data.map((s: { display_name?: string; slug?: string; summary?: string; downloads?: number; stars?: number; owner_handle?: string; clawhub_url?: string; is_certified?: boolean }) => ({
        name: s.display_name || s.slug || 'unknown',
        slug: s.slug || '',
        description: s.summary || '',
        downloads: s.downloads || 0,
        stars: s.stars || 0,
        author: s.owner_handle || '',
        url: s.clawhub_url || '',
        certified: s.is_certified || false,
      }));
    } catch (err) {
      console.error('ClawHub 搜索失败:', err);
      throw err;
    }
  });

  // 获取热门技能（ClawHub top-downloads）
  ipcMain.handle('skill:featuredMarket', async () => {
    try {
      const url = `${CLAWHUB_API}/top-downloads?limit=20`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ClawHub API 返回 ${response.status}`);
      }
      const json = await response.json();
      if (!json?.ok || !Array.isArray(json?.data)) return [];
      return json.data.map((s: { display_name?: string; slug?: string; summary?: string; downloads?: number; stars?: number; owner_handle?: string; clawhub_url?: string; is_certified?: boolean }) => ({
        name: s.display_name || s.slug || 'unknown',
        slug: s.slug || '',
        description: s.summary || '',
        downloads: s.downloads || 0,
        stars: s.stars || 0,
        author: s.owner_handle || '',
        url: s.clawhub_url || '',
        certified: s.is_certified || false,
      }));
    } catch (err) {
      console.error('ClawHub 热门技能加载失败:', err);
      throw err;
    }
  });

  // 获取市场统计
  ipcMain.handle('skill:marketStats', async () => {
    try {
      const url = `${CLAWHUB_API}/stats`;
      const response = await fetch(url);
      if (!response.ok) return { totalSkills: 0, totalDownloads: 0 };
      const json = await response.json();
      return {
        totalSkills: json?.total_skills || 0,
        totalDownloads: json?.total_downloads || 0,
      };
    } catch {
      return { totalSkills: 0, totalDownloads: 0 };
    }
  });

  // 选择目录（复用 dialog）
  ipcMain.handle('skill:selectDir', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: '选择 Skill 目录',
    });
    return result.canceled ? null : result.filePaths[0];
  });
};
