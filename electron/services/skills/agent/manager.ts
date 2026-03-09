// Agent Skill 管理器：安装、卸载、启用/禁用、Git 同步
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../../db';
import { agentSkillLoader, getSkillsDir, AgentSkillMeta } from './loader';

// 内置技能目录（打包在应用内）
const getBuiltinSkillsDir = (): string => {
  // 开发模式：__dirname 是 dist-electron/，向上一级再进 electron/builtin-skills
  const devPath = path.join(__dirname, '../electron/builtin-skills');
  if (fs.existsSync(devPath)) return devPath;
  // 打包后：从 resources 目录读取
  const prodPath = path.join(process.resourcesPath, 'builtin-skills');
  if (fs.existsSync(prodPath)) return prodPath;
  return devPath;
};

class AgentSkillManager {
  // 从本地文件夹安装（复制到 skills 目录）
  installFromLocal(sourcePath: string): AgentSkillMeta {
    // 校验源目录
    const validation = agentSkillLoader.validate(sourcePath);
    if (!validation.valid) {
      throw new Error(`Skill 校验失败: ${validation.errors.join('; ')}`);
    }

    const { frontmatter } = agentSkillLoader.parseSKILLMD(sourcePath);
    const name = frontmatter.name as string;
    const skillsDir = getSkillsDir();
    const targetPath = path.join(skillsDir, name);

    // 检查是否已存在
    if (fs.existsSync(targetPath)) {
      throw new Error(`Skill "${name}" 已存在`);
    }

    // 复制目录
    this.copyDir(sourcePath, targetPath);

    // 写入数据库
    const now = Date.now();
    const meta = agentSkillLoader.loadMeta(targetPath, {
      enabled: true,
      source: 'local',
      installedAt: now,
      updatedAt: now,
    });

    const db = getDatabase();
    db.prepare(
      'INSERT INTO agent_skills (name, description, path, source, source_url, enabled, metadata, installed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      meta.name,
      meta.description,
      meta.path,
      meta.source,
      null,
      1,
      meta.metadata ? JSON.stringify(meta.metadata) : null,
      meta.installedAt,
      meta.updatedAt,
    );

    return meta;
  }

  // 从 Git URL 安装
  async installFromGit(url: string): Promise<AgentSkillMeta> {
    const { simpleGit } = await import('simple-git');
    const git = simpleGit();

    // 先 clone 到临时目录
    const skillsDir = getSkillsDir();
    const tempName = `_temp_${Date.now()}`;
    const tempPath = path.join(skillsDir, tempName);

    try {
      await git.clone(url, tempPath);

      // 校验
      const validation = agentSkillLoader.validate(tempPath);
      if (!validation.valid) {
        throw new Error(`Skill 校验失败: ${validation.errors.join('; ')}`);
      }

      const { frontmatter } = agentSkillLoader.parseSKILLMD(tempPath);
      const name = frontmatter.name as string;
      const targetPath = path.join(skillsDir, name);

      // 检查是否已存在
      if (fs.existsSync(targetPath)) {
        throw new Error(`Skill "${name}" 已存在`);
      }

      // 重命名临时目录
      fs.renameSync(tempPath, targetPath);

      // 写入数据库
      const now = Date.now();
      const meta = agentSkillLoader.loadMeta(targetPath, {
        enabled: true,
        source: 'git',
        sourceUrl: url,
        installedAt: now,
        updatedAt: now,
      });

      const db = getDatabase();
      db.prepare(
        'INSERT INTO agent_skills (name, description, path, source, source_url, enabled, metadata, installed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        meta.name,
        meta.description,
        meta.path,
        meta.source,
        url,
        1,
        meta.metadata ? JSON.stringify(meta.metadata) : null,
        meta.installedAt,
        meta.updatedAt,
      );

      return meta;
    } catch (err) {
      // 清理临时目录
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true });
      }
      throw err;
    }
  }

  // 从 ClawHub 安装（腾讯 COS 镜像下载 zip）
  async installFromClawHub(slug: string, _author: string): Promise<AgentSkillMeta> {
    const AdmZip = (await import('adm-zip')).default;
    const skillsDir = getSkillsDir();

    // 优先使用腾讯 COS 镜像（国内快），fallback 到 GitHub raw
    const cosUrl = `https://skillhub-1388575217.cos.ap-guangzhou.myqcloud.com/skills/${encodeURIComponent(slug)}.zip`;
    const githubUrl = `https://raw.githubusercontent.com/openclaw/skills/main/skills/${encodeURIComponent(_author)}/${encodeURIComponent(slug)}/SKILL.md`;
    const tempName = `_temp_${Date.now()}`;
    const tempPath = path.join(skillsDir, tempName);
    fs.mkdirSync(tempPath, { recursive: true });

    try {
      // 尝试从腾讯 COS 下载 zip
      let downloaded = false;
      try {
        const response = await fetch(cosUrl, { signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          const zip = new AdmZip(buffer);
          zip.extractAllTo(tempPath, true);
          downloaded = true;
        }
      } catch (err) {
        console.warn('[ClawHub] COS 下载失败，尝试 GitHub:', err);
      }

      // fallback: 从 GitHub raw 下载 SKILL.md
      if (!downloaded) {
        const response = await fetch(githubUrl, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) {
          throw new Error(`下载失败: HTTP ${response.status}`);
        }
        fs.writeFileSync(path.join(tempPath, 'SKILL.md'), await response.text(), 'utf-8');
      }

      // 校验
      const validation = agentSkillLoader.validate(tempPath);
      if (!validation.valid) {
        throw new Error(`Skill 校验失败: ${validation.errors.join('; ')}`);
      }

      const { frontmatter } = agentSkillLoader.parseSKILLMD(tempPath);
      const name = frontmatter.name as string;
      const targetPath = path.join(skillsDir, name);

      const db = getDatabase();
      if (fs.existsSync(targetPath)) {
        // 检查 DB 中是否有记录
        const existing = db.prepare('SELECT name FROM agent_skills WHERE name = ?').get(name);
        if (existing) {
          throw new Error(`Skill "${name}" 已安装`);
        }
        // 孤立目录（上次安装失败残留），清理后继续
        fs.rmSync(targetPath, { recursive: true, force: true });
      }

      fs.renameSync(tempPath, targetPath);

      // 写入数据库
      const now = Date.now();
      const clawhubPageUrl = `https://clawhub.ai/skills/${slug}`;
      const meta = agentSkillLoader.loadMeta(targetPath, {
        enabled: true,
        source: 'market',
        sourceUrl: clawhubPageUrl,
        installedAt: now,
        updatedAt: now,
      });

      db.prepare(
        'INSERT INTO agent_skills (name, description, path, source, source_url, enabled, metadata, installed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        meta.name, meta.description, meta.path, 'market', clawhubPageUrl, 1,
        meta.metadata ? JSON.stringify(meta.metadata) : null, meta.installedAt, meta.updatedAt,
      );

      return meta;
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true });
      }
      throw err;
    }
  }

  // 卸载 skill
  uninstall(name: string): void {
    const db = getDatabase();
    const row = db.prepare('SELECT path, source FROM agent_skills WHERE name = ?').get(name) as { path: string; source: string } | undefined;
    if (!row) {
      throw new Error(`Skill "${name}" 不存在`);
    }
    if (row.source === 'builtin') {
      throw new Error(`内置技能 "${name}" 不允许卸载`);
    }

    // 删除目录
    if (fs.existsSync(row.path)) {
      fs.rmSync(row.path, { recursive: true, force: true });
    }

    // 删除数据库记录
    db.prepare('DELETE FROM agent_skills WHERE name = ?').run(name);
  }

  // 启用/禁用
  toggle(name: string, enabled: boolean): void {
    const db = getDatabase();
    const result = db.prepare('UPDATE agent_skills SET enabled = ?, updated_at = ? WHERE name = ?').run(
      enabled ? 1 : 0,
      Date.now(),
      name,
    );
    if (result.changes === 0) {
      throw new Error(`Skill "${name}" 不存在`);
    }
  }

  // 更新 Git 来源的 skill（git pull）
  async update(name: string): Promise<AgentSkillMeta> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM agent_skills WHERE name = ?').get(name) as {
      name: string; path: string; source: string; source_url: string | null; enabled: number;
    } | undefined;

    if (!row) {
      throw new Error(`Skill "${name}" 不存在`);
    }
    if (row.source !== 'git') {
      throw new Error(`Skill "${name}" 不是 Git 来源，无法更新`);
    }

    const { simpleGit } = await import('simple-git');
    const git = simpleGit(row.path);
    await git.pull();

    // 重新加载元数据
    const now = Date.now();
    const meta = agentSkillLoader.loadMeta(row.path, {
      enabled: row.enabled === 1,
      source: 'git',
      sourceUrl: row.source_url ?? undefined,
      installedAt: now,
      updatedAt: now,
    });

    // 更新数据库
    db.prepare(
      'UPDATE agent_skills SET description = ?, metadata = ?, updated_at = ? WHERE name = ?',
    ).run(meta.description, meta.metadata ? JSON.stringify(meta.metadata) : null, now, name);

    return meta;
  }

  // 获取所有已安装 skill 列表
  listAll(): AgentSkillMeta[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM agent_skills ORDER BY installed_at DESC').all() as Array<{
      name: string; description: string; path: string; source: string;
      source_url: string | null; enabled: number; metadata: string | null;
      installed_at: number; updated_at: number;
    }>;

    return rows.map(row => ({
      name: row.name,
      description: row.description,
      path: row.path,
      source: row.source as 'local' | 'git' | 'builtin' | 'market',
      sourceUrl: row.source_url ?? undefined,
      enabled: row.enabled === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      installedAt: row.installed_at,
      updatedAt: row.updated_at,
    }));
  }

  // 获取所有启用 skill 的 name + description（用于系统提示词注入）
  getEnabledSummaries(): Array<{ name: string; description: string }> {
    const db = getDatabase();
    const rows = db.prepare('SELECT name, description FROM agent_skills WHERE enabled = 1').all() as Array<{
      name: string; description: string;
    }>;
    return rows;
  }

  // 获取单个 skill 详情
  getDetail(name: string): import('./loader').AgentSkillFull {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM agent_skills WHERE name = ?').get(name) as {
      name: string; path: string; source: string; source_url: string | null;
      enabled: number; installed_at: number; updated_at: number;
    } | undefined;

    if (!row) {
      throw new Error(`Skill "${name}" 不存在`);
    }

    return agentSkillLoader.loadFull(row.path, {
      enabled: row.enabled === 1,
      source: row.source as 'local' | 'git' | 'builtin' | 'market',
      sourceUrl: row.source_url ?? undefined,
      installedAt: row.installed_at,
      updatedAt: row.updated_at,
    });
  }

  // 创建新 skill（生成模板）
  create(name: string, description: string, options: { scripts?: boolean; references?: boolean; assets?: boolean } = {}): AgentSkillMeta {
    const skillsDir = getSkillsDir();
    const targetPath = path.join(skillsDir, name);

    if (fs.existsSync(targetPath)) {
      throw new Error(`Skill "${name}" 已存在`);
    }

    // 创建目录结构
    fs.mkdirSync(targetPath, { recursive: true });
    if (options.scripts) fs.mkdirSync(path.join(targetPath, 'scripts'));
    if (options.references) fs.mkdirSync(path.join(targetPath, 'references'));
    if (options.assets) fs.mkdirSync(path.join(targetPath, 'assets'));

    // 生成 SKILL.md 模板
    const skillMd = `---
name: ${name}
description: >
  ${description}
license: MIT
metadata:
  author: user
  version: "1.0"
  tags: ""
---

## 使用场景
描述何时激活此技能...

## 指令
详细的操作指令...

## 输出格式
期望的输出格式说明...

## 注意事项
- 注意事项 1
- 注意事项 2
`;
    fs.writeFileSync(path.join(targetPath, 'SKILL.md'), skillMd, 'utf-8');

    // 写入数据库
    const now = Date.now();
    const meta: AgentSkillMeta = {
      name,
      description,
      path: targetPath,
      license: 'MIT',
      metadata: { author: 'user', version: '1.0', tags: '' },
      enabled: true,
      source: 'local',
      installedAt: now,
      updatedAt: now,
    };

    const db = getDatabase();
    db.prepare(
      'INSERT INTO agent_skills (name, description, path, source, source_url, enabled, metadata, installed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(name, description, targetPath, 'local', null, 1, JSON.stringify(meta.metadata), now, now);

    return meta;
  }

  // 安装内置技能（首次启动时调用，已存在的跳过）
  installBuiltinSkills(): void {
    const builtinDir = getBuiltinSkillsDir();
    if (!fs.existsSync(builtinDir)) {
      console.log('内置技能目录不存在，跳过:', builtinDir);
      return;
    }

    const db = getDatabase();
    const entries = fs.readdirSync(builtinDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sourcePath = path.join(builtinDir, entry.name);
      const skillMdPath = path.join(sourcePath, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      try {
        const { frontmatter } = agentSkillLoader.parseSKILLMD(sourcePath);
        const name = frontmatter.name as string;
        if (!name) continue;

        // 检查数据库中是否已存在
        const existing = db.prepare('SELECT name FROM agent_skills WHERE name = ?').get(name);
        if (existing) continue;

        // 复制到 skills 目录（如果目录已存在则跳过复制）
        const skillsDir = getSkillsDir();
        const targetPath = path.join(skillsDir, name);
        if (!fs.existsSync(targetPath)) {
          this.copyDir(sourcePath, targetPath);
        }

        // 写入数据库，source 标记为 'builtin'
        const now = Date.now();
        const meta = agentSkillLoader.loadMeta(targetPath, {
          enabled: true,
          source: 'builtin',
          installedAt: now,
          updatedAt: now,
        });

        db.prepare(
          'INSERT INTO agent_skills (name, description, path, source, source_url, enabled, metadata, installed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          meta.name,
          meta.description,
          meta.path,
          'builtin',
          null,
          1,
          meta.metadata ? JSON.stringify(meta.metadata) : null,
          meta.installedAt,
          meta.updatedAt,
        );

        console.log(`内置技能已安装: ${name}`);
      } catch (err) {
        console.warn(`内置技能安装失败 (${entry.name}):`, err);
      }
    }
  }

  // 辅助：递归复制目录
  private copyDir(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        // 跳过 .git 和 node_modules
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        this.copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

export const agentSkillManager = new AgentSkillManager();
