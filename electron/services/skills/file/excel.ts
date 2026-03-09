// Excel 文件读写技能
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { Skill, SkillExecuteResult } from '../base';
import { skillManager } from '../manager';

// 最大预览行数
const MAX_PREVIEW_ROWS = 50;

// 列出工作表
export const listExcelSheetsSkill: Skill = {
  definition: {
    name: 'list_excel_sheets',
    description: '列出 Excel 文件中的所有工作表名称',
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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheets = workbook.worksheets.map(ws => ({
      name: ws.name,
      rowCount: ws.rowCount,
      columnCount: ws.columnCount,
    }));

    return {
      success: true,
      data: sheets,
      summary: `Excel 文件 ${args.file_path} 包含 ${sheets.length} 个工作表：${sheets.map(s => s.name).join('、')}`,
      preview: {
        type: 'text',
        content: sheets.map(s => `📊 ${s.name}（${s.rowCount} 行 × ${s.columnCount} 列）`).join('\n'),
      },
    };
  },
};

// 读取 Excel
export const readExcelSkill: Skill = {
  definition: {
    name: 'read_excel',
    description: '读取 Excel 文件的指定工作表数据',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: '文件路径（相对于工作目录）',
        },
        sheet_name: {
          type: 'string',
          description: '工作表名称（不指定则读取第一个工作表）',
        },
      },
      required: ['file_path'],
    },
  },

  async execute(args, workingDir): Promise<SkillExecuteResult> {
    const filePath = skillManager.validatePath(args.file_path as string, workingDir);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheetName = args.sheet_name as string | undefined;
    const worksheet = sheetName
      ? workbook.getWorksheet(sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      return { success: false, data: null, summary: `未找到工作表: ${sheetName ?? '(空)'}` };
    }

    // 提取表头（第一行）
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '');
    });

    // 提取数据行
    const allRows: string[][] = [];
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowData: string[] = [];
      for (let j = 0; j < headers.length; j++) {
        const cell = row.getCell(j + 1);
        rowData.push(String(cell.value ?? ''));
      }
      allRows.push(rowData);
    }

    const totalRows = allRows.length;
    const previewRows = allRows.slice(0, MAX_PREVIEW_ROWS);

    return {
      success: true,
      data: { headers, rows: allRows, sheetName: worksheet.name },
      summary: `已读取工作表「${worksheet.name}」（${headers.length} 列，${totalRows} 行数据）`,
      preview: {
        type: 'table',
        content: { headers, rows: previewRows, totalRows },
      },
    };
  },
};

// 写入 Excel
export const writeExcelSkill: Skill = {
  definition: {
    name: 'write_excel',
    description: '创建或写入 Excel 文件',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: '文件路径（相对于工作目录）',
        },
        sheet_name: {
          type: 'string',
          description: '工作表名称（默认 Sheet1）',
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
    const sheetName = (args.sheet_name as string) || 'Sheet1';
    const headers = args.headers as string[];
    const rows = args.rows as string[][];

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // 设置表头
    worksheet.addRow(headers);
    // 表头加粗
    const headerRowObj = worksheet.getRow(1);
    headerRowObj.font = { bold: true };

    // 添加数据行
    for (const row of rows) {
      worksheet.addRow(row);
    }

    // 自动调整列宽
    worksheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = String(cell.value ?? '').length;
        if (len > maxLen) maxLen = Math.min(len, 50);
      });
      col.width = maxLen + 2;
    });

    await workbook.xlsx.writeFile(filePath);

    return {
      success: true,
      data: null,
      summary: `已写入 Excel 文件 ${args.file_path}（工作表「${sheetName}」，${headers.length} 列，${rows.length} 行数据）`,
    };
  },
};
