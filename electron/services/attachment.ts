// 附件处理服务：将文件附件转换为 LLM 可用的内容
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import { ContentPart } from './llm/provider';

// 动态导入模块缓存
let pdfParseModule: ((buffer: Buffer) => Promise<{ text: string; numpages: number }>) | null = null;
let WordExtractorClass: (new () => { extract: (path: string) => Promise<{ getBody: () => string }> }) | null = null;
let officeParserModule: { parseOfficeAsync: (buffer: Buffer) => Promise<string> } | null = null;

const getPdfParse = async () => {
  if (!pdfParseModule) pdfParseModule = require('pdf-parse');
  return pdfParseModule!;
};

const getWordExtractor = async () => {
  if (!WordExtractorClass) WordExtractorClass = require('word-extractor');
  return new WordExtractorClass!();
};

const getOfficeParser = async () => {
  if (!officeParserModule) officeParserModule = require('officeparser');
  return officeParserModule!;
};

// 文件附件接口
export interface FileAttachment {
  name: string;
  path: string;
  size: number;
  mimeType: string;
  category: 'image' | 'text' | 'document';
}

// 处理结果
export interface AttachmentResult {
  imageParts: ContentPart[];
  textContext: string;
  errors: string[];
}

// 文件大小限制 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;
// 文本内容截断 100KB
const MAX_TEXT_LENGTH = 100 * 1024;

// 处理单个图片附件
const processImage = async (attachment: FileAttachment): Promise<ContentPart> => {
  const buffer = fs.readFileSync(attachment.path);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${attachment.mimeType};base64,${base64}`;
  return { type: 'image_url', image_url: { url: dataUrl } };
};

// 处理单个文本附件
const processText = async (attachment: FileAttachment): Promise<string> => {
  const content = fs.readFileSync(attachment.path, 'utf-8');
  return content.length > MAX_TEXT_LENGTH
    ? content.slice(0, MAX_TEXT_LENGTH) + '\n\n[内容过长，已截断]'
    : content;
};

// 处理单个文档附件
const processDocument = async (attachment: FileAttachment): Promise<string> => {
  const ext = path.extname(attachment.name).toLowerCase();

  switch (ext) {
    case '.pdf': {
      const pdfParse = await getPdfParse();
      const buffer = fs.readFileSync(attachment.path);
      const data = await pdfParse(buffer);
      return truncateText(data.text);
    }

    case '.docx': {
      const buffer = fs.readFileSync(attachment.path);
      const result = await mammoth.extractRawText({ buffer });
      return truncateText(result.value);
    }

    case '.doc': {
      const extractor = await getWordExtractor();
      const doc = await extractor.extract(attachment.path);
      return truncateText(doc.getBody());
    }

    case '.xlsx':
    case '.xls': {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(attachment.path);
      const lines: string[] = [];
      workbook.eachSheet((sheet) => {
        lines.push(`## 工作表: ${sheet.name}`);
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 100) return; // 限制行数
          const values = (row.values as (string | number | null)[]).slice(1); // ExcelJS 的 row.values[0] 为 undefined，从索引 1 开始
          lines.push(values.map(v => v ?? '').join('\t'));
        });
        lines.push('');
      });
      return truncateText(lines.join('\n'));
    }

    case '.pptx': {
      const parser = await getOfficeParser();
      const buffer = fs.readFileSync(attachment.path);
      const text = await parser.parseOfficeAsync(buffer);
      return truncateText(text);
    }

    default:
      throw new Error(`不支持的文档格式: ${ext}`);
  }
};

const truncateText = (text: string): string => {
  if (text.length > MAX_TEXT_LENGTH) {
    return text.slice(0, MAX_TEXT_LENGTH) + '\n\n[内容过长，已截断]';
  }
  return text;
};

// 处理所有附件
export const processAttachments = async (
  attachments: FileAttachment[],
): Promise<AttachmentResult> => {
  const result: AttachmentResult = {
    imageParts: [],
    textContext: '',
    errors: [],
  };

  const textParts: string[] = [];

  for (const attachment of attachments) {
    try {
      // 校验文件大小
      if (attachment.size > MAX_FILE_SIZE) {
        result.errors.push(`${attachment.name}: 文件过大（最大 20MB）`);
        continue;
      }

      // 校验文件存在
      if (!fs.existsSync(attachment.path)) {
        result.errors.push(`${attachment.name}: 文件不存在`);
        continue;
      }

      switch (attachment.category) {
        case 'image': {
          const part = await processImage(attachment);
          result.imageParts.push(part);
          break;
        }
        case 'text': {
          const content = await processText(attachment);
          textParts.push(`--- 附件: ${attachment.name} ---\n${content}`);
          break;
        }
        case 'document': {
          const content = await processDocument(attachment);
          textParts.push(`--- 附件: ${attachment.name} ---\n${content}`);
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      result.errors.push(`${attachment.name}: 处理失败 (${msg})`);
    }
  }

  if (textParts.length > 0) {
    result.textContext = '\n\n' + textParts.join('\n\n');
  }

  return result;
};
