// 纯文本 / JSON / Markdown 文件读写技能
import fs from 'fs';
import path from 'path';
import { Skill, SkillExecuteResult } from '../base';
import { skillManager } from '../manager';

// 读取最大文件大小（100KB）
const MAX_READ_SIZE = 100 * 1024;

// 读取文件
export const readFileSkill: Skill = {
  definition: {
    name: 'read_file',
    description: '读取文本文件内容（支持 txt、json、md、js、ts、py 等纯文本文件）',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: '文件路径（相对于工作目录）',
        },
      },
      required: ['file_path'],
    },
  },

  async execute(args, workingDir): Promise<SkillExecuteResult> {
    const filePath = skillManager.validatePath(args.file_path as string, workingDir);
    const stat = fs.statSync(filePath);

    if (stat.size > MAX_READ_SIZE) {
      // 大文件只读取前部分
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(MAX_READ_SIZE);
      fs.readSync(fd, buffer, 0, MAX_READ_SIZE, 0);
      fs.closeSync(fd);
      const content = buffer.toString('utf-8');
      return {
        success: true,
        data: content,
        summary: `已读取文件 ${args.file_path}（文件较大，仅显示前 ${MAX_READ_SIZE / 1024}KB，总大小 ${(stat.size / 1024).toFixed(1)}KB）`,
        preview: { type: 'text', content },
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      success: true,
      data: content,
      summary: `已读取文件 ${args.file_path}（${(stat.size / 1024).toFixed(1)}KB）`,
      preview: { type: 'text', content },
    };
  },
};

// 写入文件
export const writeFileSkill: Skill = {
  definition: {
    name: 'write_file',
    description: '写入内容到文本文件（会覆盖已有内容）',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: '文件路径（相对于工作目录）',
        },
        content: {
          type: 'string',
          description: '要写入的文件内容',
        },
      },
      required: ['file_path', 'content'],
    },
    dangerous: true,
  },

  async execute(args, workingDir): Promise<SkillExecuteResult> {
    const filePath = skillManager.validatePath(args.file_path as string, workingDir);
    const content = args.content as string;

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const existed = fs.existsSync(filePath);
    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      success: true,
      data: null,
      summary: existed
        ? `已覆盖写入文件 ${args.file_path}（${(Buffer.byteLength(content) / 1024).toFixed(1)}KB）`
        : `已创建文件 ${args.file_path}（${(Buffer.byteLength(content) / 1024).toFixed(1)}KB）`,
    };
  },
};

// 列出目录内容
export const listDirectorySkill: Skill = {
  definition: {
    name: 'list_directory',
    description: '列出目录下的文件和子目录',
    parameters: {
      type: 'object',
      properties: {
        dir_path: {
          type: 'string',
          description: '目录路径（相对于工作目录，默认为工作目录根目录）',
        },
      },
      required: [],
    },
  },

  async execute(args, workingDir): Promise<SkillExecuteResult> {
    const dirPath = args.dir_path
      ? skillManager.validatePath(args.dir_path as string, workingDir)
      : workingDir;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      size: entry.isDirectory() ? undefined : fs.statSync(path.join(dirPath, entry.name)).size,
    }));

    // 按目录优先、名称排序
    items.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const summary = `目录 ${args.dir_path || '/'} 包含 ${items.filter(i => i.isDirectory).length} 个子目录和 ${items.filter(i => !i.isDirectory).length} 个文件`;
    const content = items.map(i =>
      i.isDirectory
        ? `📁 ${i.name}/`
        : `📄 ${i.name} (${((i.size ?? 0) / 1024).toFixed(1)}KB)`,
    ).join('\n');

    return {
      success: true,
      data: items,
      summary,
      preview: { type: 'text', content },
    };
  },
};
