// CSV 文件读写技能
import fs from 'fs';
import path from 'path';
import { Skill, SkillExecuteResult } from '../base';
import { skillManager } from '../manager';

// 最大预览行数
const MAX_PREVIEW_ROWS = 50;

// 简单 CSV 解析（支持引号转义）
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\n' || (char === '\r' && text[i + 1] === '\n')) {
        row.push(current);
        current = '';
        if (row.some(cell => cell.length > 0)) rows.push(row);
        row = [];
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
  }
  // 最后一行
  if (current || row.length > 0) {
    row.push(current);
    if (row.some(cell => cell.length > 0)) rows.push(row);
  }

  return rows;
};

// 生成 CSV 字符串
const generateCSV = (headers: string[], rows: string[][]): string => {
  const escape = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
};

// 读取 CSV
export const readCSVSkill: Skill = {
  definition: {
    name: 'read_csv',
    description: '读取 CSV 文件内容，返回表头和数据行',
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
    const content = fs.readFileSync(filePath, 'utf-8');
    const allRows = parseCSV(content);

    if (allRows.length === 0) {
      return { success: true, data: { headers: [], rows: [] }, summary: 'CSV 文件为空' };
    }

    const headers = allRows[0];
    const dataRows = allRows.slice(1);
    const totalRows = dataRows.length;
    const previewRows = dataRows.slice(0, MAX_PREVIEW_ROWS);

    return {
      success: true,
      data: { headers, rows: dataRows },
      summary: `已读取 CSV 文件 ${args.file_path}（${headers.length} 列，${totalRows} 行数据）`,
      preview: {
        type: 'table',
        content: { headers, rows: previewRows, totalRows },
      },
    };
  },
};

// 写入 CSV
export const writeCSVSkill: Skill = {
  definition: {
    name: 'write_csv',
    description: '将数据写入 CSV 文件',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: '文件路径（相对于工作目录）',
        },
        headers: {
          type: 'array',
          items: { type: 'string' },
          description: '表头列表',
        },
        rows: {
          type: 'array',
          items: { type: 'array', items: { type: 'string' } },
          description: '数据行列表',
        },
      },
      required: ['file_path', 'headers', 'rows'],
    },
    dangerous: true,
  },

  async execute(args, workingDir): Promise<SkillExecuteResult> {
    const filePath = skillManager.validatePath(args.file_path as string, workingDir);
    const headers = args.headers as string[];
    const rows = args.rows as string[][];

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const csvContent = generateCSV(headers, rows);
    fs.writeFileSync(filePath, csvContent, 'utf-8');

    return {
      success: true,
      data: null,
      summary: `已写入 CSV 文件 ${args.file_path}（${headers.length} 列，${rows.length} 行数据）`,
    };
  },
};
