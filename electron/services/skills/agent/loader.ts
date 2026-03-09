// Agent Skill 加载器：解析 SKILL.md、校验、扫描目录
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { app } from 'electron';

// Agent Skill 元数据（frontmatter）
export interface AgentSkillMeta {
  name: string;
  description: string;
  path: string;
  license?: string;
  metadata?: Record<string, string>;
  enabled: boolean;
  source: 'local' | 'git' | 'builtin' | 'market';
  sourceUrl?: string;
  installedAt: number;
  updatedAt: number;
}

// Agent Skill 完整数据（含指令正文）
export interface AgentSkillFull extends AgentSkillMeta {
  instructions: string;
  files: string[];
}

// 获取 skills 存储根目录
export const getSkillsDir = (): string => {
  const dir = path.join(app.getPath('userData'), 'skills');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// 递归列出目录下所有文件（相对路径）
const listFiles = (dir: string, base = ''): string[] => {
  const result: string[] = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // 跳过 .git 目录
      if (entry.name === '.git') continue;
      result.push(...listFiles(path.join(dir, entry.name), rel));
    } else {
      result.push(rel);
    }
  }
  return result;
};

class AgentSkillLoader {
  // 解析单个 SKILL.md，返回 frontmatter 数据和 body
  parseSKILLMD(skillPath: string): { frontmatter: Record<string, unknown>; body: string } {
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
      throw new Error(`SKILL.md 不存在: ${skillMdPath}`);
    }
    const raw = fs.readFileSync(skillMdPath, 'utf-8');
    const { data, content } = matter(raw);
    return { frontmatter: data, body: content.trim() };
  }

  // 校验 skill 目录是否合法
  validate(skillPath: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) {
      errors.push('缺少 SKILL.md 文件');
      return { valid: false, errors };
    }

    try {
      const { frontmatter } = this.parseSKILLMD(skillPath);
      if (!frontmatter.name || typeof frontmatter.name !== 'string') {
        errors.push('SKILL.md frontmatter 缺少 name 字段');
      }
      if (!frontmatter.description || typeof frontmatter.description !== 'string') {
        errors.push('SKILL.md frontmatter 缺少 description 字段');
      }
    } catch (err: unknown) {
      errors.push(`SKILL.md 解析失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }

    return { valid: errors.length === 0, errors };
  }

  // 从 skill 目录加载完整数据
  loadFull(skillPath: string, dbMeta?: { enabled: boolean; source: 'local' | 'git' | 'builtin' | 'market'; sourceUrl?: string; installedAt: number; updatedAt: number }): AgentSkillFull {
    const { frontmatter, body } = this.parseSKILLMD(skillPath);
    const meta = (frontmatter.metadata || {}) as Record<string, string>;
    const now = Date.now();

    return {
      name: frontmatter.name as string,
      description: frontmatter.description as string,
      path: skillPath,
      license: frontmatter.license as string | undefined,
      metadata: Object.keys(meta).length > 0 ? meta : undefined,
      enabled: dbMeta?.enabled ?? true,
      source: dbMeta?.source ?? 'local',
      sourceUrl: dbMeta?.sourceUrl,
      installedAt: dbMeta?.installedAt ?? now,
      updatedAt: dbMeta?.updatedAt ?? now,
      instructions: body,
      files: listFiles(skillPath),
    };
  }

  // 从 skill 目录只加载元数据（不加载 body）
  loadMeta(skillPath: string, dbMeta?: { enabled: boolean; source: 'local' | 'git' | 'builtin' | 'market'; sourceUrl?: string; installedAt: number; updatedAt: number }): AgentSkillMeta {
    const { frontmatter } = this.parseSKILLMD(skillPath);
    const meta = (frontmatter.metadata || {}) as Record<string, string>;
    const now = Date.now();

    return {
      name: frontmatter.name as string,
      description: frontmatter.description as string,
      path: skillPath,
      license: frontmatter.license as string | undefined,
      metadata: Object.keys(meta).length > 0 ? meta : undefined,
      enabled: dbMeta?.enabled ?? true,
      source: dbMeta?.source ?? 'local',
      sourceUrl: dbMeta?.sourceUrl,
      installedAt: dbMeta?.installedAt ?? now,
      updatedAt: dbMeta?.updatedAt ?? now,
    };
  }

  // 读取 skill 目录内的子文件
  readResource(skillPath: string, relativePath: string): string {
    // 安全检查：不允许路径穿越
    const resolved = path.resolve(skillPath, relativePath);
    if (!resolved.startsWith(path.resolve(skillPath) + path.sep)) {
      throw new Error(`路径安全检查失败: ${relativePath}`);
    }
    if (!fs.existsSync(resolved)) {
      throw new Error(`文件不存在: ${relativePath}`);
    }
    return fs.readFileSync(resolved, 'utf-8');
  }
}

export const agentSkillLoader = new AgentSkillLoader();
