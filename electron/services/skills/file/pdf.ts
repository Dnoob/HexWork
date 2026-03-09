// PDF 文件读取技能
import fs from 'fs';
import { Skill, SkillExecuteResult } from '../base';
import { skillManager } from '../manager';

// pdf-parse v1 没有自带类型，使用动态导入的方式在 execute 中加载
let pdfParseModule: ((buffer: Buffer) => Promise<{ text: string; numpages: number; info?: Record<string, unknown> }>) | null = null;

const getPdfParse = async () => {
  if (!pdfParseModule) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pdfParseModule = require('pdf-parse');
  }
  return pdfParseModule!;
};

// 读取 PDF
export const readPDFSkill: Skill = {
  definition: {
    name: 'read_pdf',
    description: '读取 PDF 文件的文本内容',
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
    const buffer = fs.readFileSync(filePath);
    const pdfParse = await getPdfParse();
    const data = await pdfParse(buffer);

    const text = data.text;
    const numpages = data.numpages;
    const info = data.info;

    const maxLen = 100 * 1024;
    const truncated = text.length > maxLen;
    const content = truncated ? text.slice(0, maxLen) : text;

    const infoStr = [
      `页数: ${numpages}`,
      info?.Title ? `标题: ${info.Title}` : null,
      info?.Author ? `作者: ${info.Author}` : null,
    ].filter(Boolean).join('，');

    return {
      success: true,
      data: { text: content, pages: numpages, info },
      summary: truncated
        ? `已读取 PDF 文件 ${args.file_path}（${infoStr}，内容较长仅显示前 ${maxLen / 1024}KB）`
        : `已读取 PDF 文件 ${args.file_path}（${infoStr}）`,
      preview: { type: 'text', content },
    };
  },
};
