// 注册所有技能
import { skillManager } from './manager';
import { readFileSkill, writeFileSkill, listDirectorySkill } from './file/text';
import { readCSVSkill, writeCSVSkill } from './file/csv';
import { listExcelSheetsSkill, readExcelSkill, writeExcelSkill } from './file/excel';
import { readWordSkill, writeWordSkill } from './file/word';
import { readPDFSkill } from './file/pdf';
import {
  browserNavigateSkill,
  browserGetPageSkill,
  browserClickSkill,
  browserTypeSkill,
  browserPressKeySkill,
  browserScrollSkill,
  browserExtractTextSkill,
  browserSelectSkill,
  browserBackSkill,
  browserScreenshotSkill,
  browserCloseSkill,
} from './browser/actions';

export const registerAllSkills = (): void => {
  // 文本/JSON/Markdown
  skillManager.register(readFileSkill);
  skillManager.register(writeFileSkill);
  skillManager.register(listDirectorySkill);

  // CSV
  skillManager.register(readCSVSkill);
  skillManager.register(writeCSVSkill);

  // Excel
  skillManager.register(listExcelSheetsSkill);
  skillManager.register(readExcelSkill);
  skillManager.register(writeExcelSkill);

  // Word
  skillManager.register(readWordSkill);
  skillManager.register(writeWordSkill);

  // PDF
  skillManager.register(readPDFSkill);

  // 浏览器自动化（puppeteer-core + Accessibility Tree）
  skillManager.register(browserNavigateSkill);
  skillManager.register(browserGetPageSkill);
  skillManager.register(browserClickSkill);
  skillManager.register(browserTypeSkill);
  skillManager.register(browserPressKeySkill);
  skillManager.register(browserScrollSkill);
  skillManager.register(browserExtractTextSkill);
  skillManager.register(browserSelectSkill);
  skillManager.register(browserBackSkill);
  skillManager.register(browserScreenshotSkill);
  skillManager.register(browserCloseSkill);
};
