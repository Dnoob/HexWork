// Word 文件读写技能
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { Skill, SkillExecuteResult } from '../base';
import { skillManager } from '../manager';

// 读取 Word 文档
export const readWordSkill: Skill = {
  definition: {
    name: 'read_word',
    description: '读取 Word 文档（.docx）的文本内容',
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
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    // 截断过长内容
    const maxLen = 100 * 1024;
    const truncated = text.length > maxLen;
    const content = truncated ? text.slice(0, maxLen) : text;

    return {
      success: true,
      data: content,
      summary: truncated
        ? `已读取 Word 文档 ${args.file_path}（内容较长，仅显示前 ${maxLen / 1024}KB）`
        : `已读取 Word 文档 ${args.file_path}（${(Buffer.byteLength(text) / 1024).toFixed(1)}KB）`,
      preview: { type: 'text', content },
    };
  },
};

// 写入 Word 文档
export const writeWordSkill: Skill = {
  definition: {
    name: 'write_word',
    description: '创建 Word 文档（.docx），支持段落和标题',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: '文件路径（相对于工作目录）',
        },
        paragraphs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: '段落文本' },
              heading: {
                type: 'string',
                enum: ['title', 'heading1', 'heading2', 'heading3'],
                description: '标题级别（可选）',
              },
              bold: { type: 'boolean', description: '是否加粗' },
            },
            required: ['text'],
          },
          description: '段落列表',
        },
      },
      required: ['file_path', 'paragraphs'],
    },
    dangerous: true,
  },

  async execute(args, workingDir): Promise<SkillExecuteResult> {
    const filePath = skillManager.validatePath(args.file_path as string, workingDir);
    const paragraphs = args.paragraphs as Array<{
      text: string;
      heading?: string;
      bold?: boolean;
    }>;

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 映射标题级别
    const headingMap: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
      title: HeadingLevel.TITLE,
      heading1: HeadingLevel.HEADING_1,
      heading2: HeadingLevel.HEADING_2,
      heading3: HeadingLevel.HEADING_3,
    };

    const docParagraphs = paragraphs.map(p => {
      const heading = p.heading ? headingMap[p.heading] : undefined;
      return new Paragraph({
        heading,
        children: [
          new TextRun({
            text: p.text,
            bold: p.bold ?? false,
          }),
        ],
      });
    });

    const doc = new Document({
      sections: [{ children: docParagraphs }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);

    return {
      success: true,
      data: null,
      summary: `已创建 Word 文档 ${args.file_path}（${paragraphs.length} 个段落）`,
    };
  },
};
