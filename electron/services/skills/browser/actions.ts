// 浏览器自动化技能：基于 puppeteer-core + CDP Accessibility Tree
import { Skill, SkillExecuteResult } from '../base';
import { browserController } from './controller';

// browser_navigate：打开网页
export const browserNavigateSkill: Skill = {
  definition: {
    name: 'browser_navigate',
    description: '打开浏览器并导航到指定 URL。返回页面标题和可交互元素列表（带索引号）。',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '要访问的网址（含 http:// 或 https://）' },
      },
      required: ['url'],
    },
  },
  async execute(args): Promise<SkillExecuteResult> {
    const url = args.url as string;
    const result = await browserController.navigate(url);
    const info = `已打开: ${result.title} (${result.url})\n\n可交互元素:\n${result.axTree}`;
    return {
      success: true,
      data: info,
      summary: `已打开页面: ${result.title}`,
      preview: { type: 'text', content: info },
    };
  },
};

// browser_get_page：获取当前页面信息和可交互元素
export const browserGetPageSkill: Skill = {
  definition: {
    name: 'browser_get_page',
    description: '获取当前页面的标题、URL 和可交互元素列表（带索引号）。用于刷新页面状态或操作后确认结果。',
    parameters: { type: 'object', properties: {} },
  },
  async execute(): Promise<SkillExecuteResult> {
    const result = await browserController.getPage();
    const info = `页面: ${result.title} (${result.url})\n\n可交互元素:\n${result.axTree}`;
    return {
      success: true,
      data: info,
      summary: `当前页面: ${result.title}`,
      preview: { type: 'text', content: info },
    };
  },
};

// browser_click：点击指定索引的元素
export const browserClickSkill: Skill = {
  definition: {
    name: 'browser_click',
    description: '点击页面上指定索引号的可交互元素。索引号来自 browser_navigate 或 browser_get_page 返回的元素列表。',
    parameters: {
      type: 'object',
      properties: {
        idx: { type: 'number', description: '元素索引号（来自可交互元素列表）' },
      },
      required: ['idx'],
    },
  },
  async execute(args): Promise<SkillExecuteResult> {
    const idx = args.idx as number;
    const result = await browserController.click(idx);
    return {
      success: true,
      data: result,
      summary: `已点击 ${result.clicked}`,
    };
  },
};

// browser_type：在指定元素中输入文本
export const browserTypeSkill: Skill = {
  definition: {
    name: 'browser_type',
    description: '在指定索引号的输入框中输入文本。会先清空已有内容再输入。',
    parameters: {
      type: 'object',
      properties: {
        idx: { type: 'number', description: '输入框元素的索引号' },
        text: { type: 'string', description: '要输入的文本' },
      },
      required: ['idx', 'text'],
    },
  },
  async execute(args): Promise<SkillExecuteResult> {
    const idx = args.idx as number;
    const text = args.text as string;
    const result = await browserController.type(idx, text);
    return {
      success: true,
      data: result,
      summary: `已在 ${result.into} 输入 "${text}"`,
    };
  },
};

// browser_press_key：按下键盘按键
export const browserPressKeySkill: Skill = {
  definition: {
    name: 'browser_press_key',
    description: '按下键盘按键。支持 Enter、Tab、Escape、Backspace、Delete、ArrowUp/Down/Left/Right、Space 以及普通字符。',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: '按键名称（如 Enter、Tab、Escape）' },
      },
      required: ['key'],
    },
  },
  async execute(args): Promise<SkillExecuteResult> {
    const key = args.key as string;
    await browserController.pressKey(key);
    return {
      success: true,
      data: null,
      summary: `已按下 ${key}`,
    };
  },
};

// browser_scroll：滚动页面
export const browserScrollSkill: Skill = {
  definition: {
    name: 'browser_scroll',
    description: '滚动页面。',
    parameters: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down'], description: '滚动方向' },
        amount: { type: 'number', description: '滚动幅度（1-10，默认 3）' },
      },
      required: ['direction'],
    },
  },
  async execute(args): Promise<SkillExecuteResult> {
    const direction = args.direction as 'up' | 'down';
    const amount = args.amount as number | undefined;
    await browserController.scroll(direction, amount);
    return {
      success: true,
      data: null,
      summary: `已向${direction === 'down' ? '下' : '上'}滚动`,
    };
  },
};

// browser_extract_text：提取页面文本
export const browserExtractTextSkill: Skill = {
  definition: {
    name: 'browser_extract_text',
    description: '提取当前页面的可见文本内容（最多 8000 字符）。',
    parameters: { type: 'object', properties: {} },
  },
  async execute(): Promise<SkillExecuteResult> {
    const text = await browserController.extractText();
    return {
      success: true,
      data: text,
      summary: `已提取文本（${text.length} 字符）`,
      preview: { type: 'text', content: text },
    };
  },
};

// browser_select：选择下拉选项
export const browserSelectSkill: Skill = {
  definition: {
    name: 'browser_select',
    description: '在下拉菜单中选择指定选项。',
    parameters: {
      type: 'object',
      properties: {
        idx: { type: 'number', description: '下拉菜单元素的索引号' },
        value: { type: 'string', description: '要选择的选项值' },
      },
      required: ['idx', 'value'],
    },
  },
  async execute(args): Promise<SkillExecuteResult> {
    const idx = args.idx as number;
    const value = args.value as string;
    const result = await browserController.select(idx, value);
    return {
      success: true,
      data: result,
      summary: `已选择 ${result.selected}`,
    };
  },
};

// browser_back：后退
export const browserBackSkill: Skill = {
  definition: {
    name: 'browser_back',
    description: '浏览器后退到上一页。',
    parameters: { type: 'object', properties: {} },
  },
  async execute(): Promise<SkillExecuteResult> {
    await browserController.back();
    return {
      success: true,
      data: null,
      summary: '已后退到上一页',
    };
  },
};

// browser_screenshot：截图
export const browserScreenshotSkill: Skill = {
  definition: {
    name: 'browser_screenshot',
    description: '对当前页面进行截图。',
    parameters: { type: 'object', properties: {} },
  },
  async execute(): Promise<SkillExecuteResult> {
    const base64 = await browserController.screenshot();
    return {
      success: true,
      data: null,
      summary: '已截取页面截图',
      preview: { type: 'screenshot', content: base64 },
    };
  },
};

// browser_close：关闭浏览器
export const browserCloseSkill: Skill = {
  definition: {
    name: 'browser_close',
    description: '关闭浏览器，结束浏览器自动化任务。',
    parameters: { type: 'object', properties: {} },
  },
  async execute(): Promise<SkillExecuteResult> {
    await browserController.close();
    return { success: true, data: null, summary: '浏览器已关闭' };
  },
};
