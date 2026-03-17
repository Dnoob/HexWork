// 浏览器控制器：基于 puppeteer-core + CDP Accessibility Tree
import puppeteer from 'puppeteer-core';
import type { Browser, Page, CDPSession } from 'puppeteer-core';
import { spawn } from 'child_process';
import net from 'net';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app } from 'electron';

// 可交互的 AX 节点
export interface AXNode {
  idx: number;         // 展示给 LLM 的索引号
  role: string;        // 角色（button, link, textbox 等）
  name: string;        // 无障碍名称
  backendId: number;   // DOM 后端节点 ID，用于定位操作
  value?: string;      // 当前值（输入框等）
  description?: string;
  focused?: boolean;
}

// 查找系统 Edge/Chrome 路径（Edge 优先）
const findBrowserPath = (): string | null => {
  const platform = os.platform();
  const candidates: string[] = [];

  if (platform === 'win32') {
    const programFiles = process.env['PROGRAMFILES'] || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || '';
    candidates.push(
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    );
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    );
    // WSL: 检查 Windows 侧浏览器
    const winPF = '/mnt/c/Program Files';
    const winPFx86 = '/mnt/c/Program Files (x86)';
    candidates.push(
      path.join(winPF, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(winPFx86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(winPF, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    );
  }

  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch { /* 跳过 */ }
  }
  return null;
};

// 反自动化检测脚本：覆盖浏览器指纹，让网站无法识别 puppeteer
const STEALTH_SCRIPT = `
  // 1. 隐藏 navigator.webdriver 标志
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // 2. 伪造 navigator.plugins（正常浏览器有插件）
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ];
      plugins.length = 3;
      return plugins;
    },
  });

  // 3. 伪造 navigator.languages
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US', 'en'] });

  // 4. 修复 Permissions API（自动化模式下行为异常）
  const origQuery = window.Permissions?.prototype?.query;
  if (origQuery) {
    window.Permissions.prototype.query = function(params) {
      if (params?.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return origQuery.call(this, params);
    };
  }

  // 5. 修复 chrome.runtime（puppeteer 缺少此对象）
  if (!window.chrome) window.chrome = {};
  if (!window.chrome.runtime) window.chrome.runtime = { connect: () => {}, sendMessage: () => {} };

  // 6. 隐藏 HeadlessChrome 标识
  Object.defineProperty(navigator, 'userAgent', {
    get: () => navigator.userAgent.replace(/HeadlessChrome/, 'Chrome'),
  });

  // 7. 伪造 WebGL 渲染器信息（部分网站通过此检测）
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return 'Intel Inc.';          // UNMASKED_VENDOR_WEBGL
    if (param === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
    return getParameter.call(this, param);
  };
`;

// 可交互的角色集合
const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'textbox', 'searchbox', 'combobox',
  'checkbox', 'radio', 'switch', 'slider', 'spinbutton',
  'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'tab', 'option', 'treeitem',
]);

// 找一个可用的端口
const findAvailablePort = (startPort: number): Promise<number> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
};

// 轮询等待浏览器调试端口就绪，返回 WebSocket URL
const waitForBrowserReady = (port: number, timeoutMs = 30000): Promise<string> => {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`等待浏览器就绪超时(${timeoutMs}ms), port=${port}`));
        return;
      }
      const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.webSocketDebuggerUrl) {
              resolve(json.webSocketDebuggerUrl);
            } else {
              setTimeout(poll, 300);
            }
          } catch {
            setTimeout(poll, 300);
          }
        });
      });
      req.on('error', () => setTimeout(poll, 300));
      req.setTimeout(3000, () => {
        req.destroy();
        setTimeout(poll, 300);
      });
    };
    poll();
  });
};

class BrowserController {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdp: CDPSession | null = null;
  // 当前页面的 AX 节点映射（idx → AXNode）
  private axNodes: Map<number, AXNode> = new Map();
  get isOpen(): boolean {
    return this.browser !== null && this.browser.connected;
  }

  get currentUrl(): string | null {
    try {
      return this.page?.url() ?? null;
    } catch {
      return null;
    }
  }

  // 启动浏览器：手动 spawn + 固定端口 + HTTP 轮询 + puppeteer.connect
  // 不依赖 puppeteer.launch()，避免打包后 Windows GUI 应用 stdio/进程 relaunch 问题
  async launch(): Promise<void> {
    if (this.browser?.connected) return;

    const executablePath = findBrowserPath();
    if (!executablePath) {
      throw new Error('未找到 Chrome 或 Edge 浏览器，请确认已安装 Chrome 或 Edge');
    }

    const userDataDir = path.join(app.getPath('userData'), 'browser-profile');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    await this.close();

    // 清理 Electron 注入的环境变量
    const cleanEnv = { ...process.env };
    delete cleanEnv['ELECTRON_RUN_AS_NODE'];
    delete cleanEnv['ELECTRON_NO_ASAR'];

    // 找一个可用端口
    const port = await findAvailablePort(9222);

    const browserArgs = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
    ];

    // 启动浏览器，不跟踪进程生命周期（Windows 上进程可能 relaunch）
    spawn(executablePath, browserArgs, {
      detached: true,
      stdio: 'ignore',
      env: cleanEnv,
    }).unref();

    // 轮询等待浏览器调试端口就绪
    let wsUrl: string;
    try {
      wsUrl = await waitForBrowserReady(port, 30000);
    } catch (err) {
      throw new Error(
        `浏览器启动失败 [exe: ${executablePath} | port: ${port} | packaged: ${app.isPackaged}]。` +
        `${(err as Error).message}`
      );
    }

    // 通过 WebSocket 连接浏览器
    this.browser = await puppeteer.connect({
      browserWSEndpoint: wsUrl,
      defaultViewport: null,
    });

    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();

    // 关闭多余的恢复标签页
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close().catch(() => {});
    }

    this.cdp = await this.page.createCDPSession();

    // 注入反自动化检测脚本
    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: STEALTH_SCRIPT,
    });

    // 启用 Accessibility 和 DOM 域
    await this.cdp.send('Accessibility.enable');
    await this.cdp.send('DOM.enable');

    // 浏览器断开时清理
    this.browser.on('disconnected', () => {
      this.browser = null;
      this.page = null;
      this.cdp = null;
      this.axNodes.clear();
    });
  }

  // 确保浏览器和页面已就绪
  private ensureReady(): { page: Page; cdp: CDPSession } {
    if (!this.browser?.connected || !this.page || !this.cdp) {
      throw new Error('浏览器未启动，请先使用 browser_navigate 打开页面');
    }
    return { page: this.page, cdp: this.cdp };
  }

  // 获取 Accessibility Tree 并构建索引
  async getAccessibilityTree(): Promise<AXNode[]> {
    const { cdp } = this.ensureReady();

    const { nodes } = await cdp.send('Accessibility.getFullAXTree', { depth: -1 });
    this.axNodes.clear();

    let idx = 0;
    const result: AXNode[] = [];

    for (const node of nodes) {
      const role = node.role?.value as string;
      if (!role || node.ignored) continue;

      // 获取名称
      const name = (node.name?.value as string) || '';

      // 只保留可交互元素或有意义的内容节点
      const isInteractive = INTERACTIVE_ROLES.has(role);
      if (!isInteractive) continue;

      // 跳过无名称且无值的节点（通常是隐藏或装饰性的）
      const value = node.properties?.find(
        (p: { name: string }) => p.name === 'value'
      )?.value?.value as string | undefined;
      const description = node.properties?.find(
        (p: { name: string }) => p.name === 'description'
      )?.value?.value as string | undefined;
      const focused = node.properties?.find(
        (p: { name: string }) => p.name === 'focused'
      )?.value?.value as boolean | undefined;

      if (!name && !value && !description) continue;

      const backendId = node.backendDOMNodeId;
      if (!backendId) continue;

      const axNode: AXNode = {
        idx,
        role,
        name,
        backendId,
        value,
        description,
        focused,
      };

      this.axNodes.set(idx, axNode);
      result.push(axNode);
      idx++;
    }

    return result;
  }

  // 格式化 AX 树为紧凑文本（给 LLM 看）
  formatAXTree(nodes: AXNode[]): string {
    if (nodes.length === 0) return '(页面上未发现可交互元素)';

    return nodes.map(n => {
      let line = `[${n.idx}] <${n.role}>`;
      if (n.name) line += ` "${n.name}"`;
      if (n.value) line += ` value="${n.value}"`;
      if (n.focused) line += ' (focused)';
      return line;
    }).join('\n');
  }

  // 通过 AX 索引号解析 DOM 节点，返回 RemoteObjectId
  private async resolveNode(idx: number): Promise<string> {
    const { cdp } = this.ensureReady();
    const axNode = this.axNodes.get(idx);
    if (!axNode) {
      throw new Error(`元素 [${idx}] 不存在，请先用 browser_get_page 刷新页面信息`);
    }

    const { object } = await cdp.send('DOM.resolveNode', {
      backendNodeId: axNode.backendId,
    });

    if (!object.objectId) {
      throw new Error(`无法定位元素 [${idx}]，页面可能已变化，请重新获取页面信息`);
    }

    return object.objectId;
  }

  // 导航到 URL
  async navigate(url: string): Promise<{ title: string; url: string; axTree: string }> {
    if (!this.browser?.connected) await this.launch();
    const { page } = this.ensureReady();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 等待一小段时间让页面渲染
    await new Promise(r => setTimeout(r, 500));

    const title = await page.title();
    const finalUrl = page.url();
    const nodes = await this.getAccessibilityTree();
    const axTree = this.formatAXTree(nodes);

    return { title, url: finalUrl, axTree };
  }

  // 获取当前页面信息（刷新 AX 树）
  async getPage(): Promise<{ title: string; url: string; axTree: string }> {
    const { page } = this.ensureReady();
    const title = await page.title();
    const url = page.url();
    const nodes = await this.getAccessibilityTree();
    const axTree = this.formatAXTree(nodes);
    return { title, url, axTree };
  }

  // 点击元素
  async click(idx: number): Promise<{ clicked: string }> {
    const { cdp } = this.ensureReady();
    const objectId = await this.resolveNode(idx);
    const axNode = this.axNodes.get(idx)!;

    // 先滚动到可视区域
    await cdp.send('Runtime.callFunctionOn', {
      objectId,
      functionDeclaration: 'function() { this.scrollIntoView({ block: "center" }); }',
    });
    await new Promise(r => setTimeout(r, 200));

    // 获取元素中心坐标并点击
    const { model } = await cdp.send('DOM.getBoxModel', {
      objectId,
    });

    if (model) {
      // content quad: [x1,y1, x2,y2, x3,y3, x4,y4]
      const quad = model.content;
      const cx = (quad[0] + quad[2] + quad[4] + quad[6]) / 4;
      const cy = (quad[1] + quad[3] + quad[5] + quad[7]) / 4;

      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
    } else {
      // fallback: JS click
      await cdp.send('Runtime.callFunctionOn', {
        objectId,
        functionDeclaration: 'function() { this.click(); }',
      });
    }

    await new Promise(r => setTimeout(r, 300));
    return { clicked: `<${axNode.role}> "${axNode.name}"` };
  }

  // 在元素中输入文本
  async type(idx: number, text: string): Promise<{ typed: string; into: string }> {
    const { cdp } = this.ensureReady();
    const objectId = await this.resolveNode(idx);
    const axNode = this.axNodes.get(idx)!;

    // 聚焦元素
    await cdp.send('Runtime.callFunctionOn', {
      objectId,
      functionDeclaration: 'function() { this.focus(); }',
    });
    await new Promise(r => setTimeout(r, 100));

    // 清空现有内容
    await cdp.send('Runtime.callFunctionOn', {
      objectId,
      functionDeclaration: 'function() { this.value = ""; this.dispatchEvent(new Event("input", {bubbles: true})); }',
    });

    // 逐字符输入（模拟真实键盘）
    for (const char of text) {
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: char });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', text: char });
    }

    return { typed: text, into: `<${axNode.role}> "${axNode.name}"` };
  }

  // 按下键盘按键
  async pressKey(key: string): Promise<void> {
    const { cdp } = this.ensureReady();

    // 特殊键映射
    const keyMap: Record<string, { key: string; code: string; keyCode: number }> = {
      'Enter': { key: 'Enter', code: 'Enter', keyCode: 13 },
      'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
      'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
      'Backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8 },
      'Delete': { key: 'Delete', code: 'Delete', keyCode: 46 },
      'ArrowUp': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
      'ArrowDown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
      'ArrowLeft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
      'ArrowRight': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
      'Space': { key: ' ', code: 'Space', keyCode: 32 },
    };

    const mapped = keyMap[key];
    if (mapped) {
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: mapped.key,
        code: mapped.code,
        windowsVirtualKeyCode: mapped.keyCode,
      });
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: mapped.key,
        code: mapped.code,
        windowsVirtualKeyCode: mapped.keyCode,
      });
    } else {
      // 普通字符
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: key });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', text: key });
    }
  }

  // 滚动页面
  async scroll(direction: 'up' | 'down', amount?: number): Promise<void> {
    const { cdp } = this.ensureReady();
    const delta = (amount || 3) * 100;
    const y = direction === 'down' ? delta : -delta;

    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 640,
      y: 400,
      deltaX: 0,
      deltaY: y,
    });

    await new Promise(r => setTimeout(r, 300));
  }

  // 提取页面文本
  async extractText(): Promise<string> {
    const { page } = this.ensureReady();
    const text = await page.evaluate(() => {
      // 提取可见文本，排除 script/style
      const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent?.trim() || '';
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'svg'].includes(tag)) return '';
        const parts: string[] = [];
        for (const child of el.childNodes) {
          const t = walk(child);
          if (t) parts.push(t);
        }
        return parts.join(' ');
      };
      return walk(document.body).slice(0, 8000);
    });
    return text;
  }

  // 选择下拉选项
  async select(idx: number, value: string): Promise<{ selected: string }> {
    const { cdp } = this.ensureReady();
    const objectId = await this.resolveNode(idx);
    const axNode = this.axNodes.get(idx)!;

    await cdp.send('Runtime.callFunctionOn', {
      objectId,
      functionDeclaration: `function(v) {
        this.value = v;
        this.dispatchEvent(new Event('change', {bubbles: true}));
      }`,
      arguments: [{ value }],
    });

    return { selected: `"${value}" in <${axNode.role}> "${axNode.name}"` };
  }

  // 后退
  async back(): Promise<void> {
    const { page } = this.ensureReady();
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 500));
  }

  // 截图
  async screenshot(): Promise<string> {
    const { page } = this.ensureReady();
    const buffer = await page.screenshot({ type: 'png', encoding: 'base64' });
    return buffer as string;
  }

  // 关闭浏览器
  async close(): Promise<void> {
    if (this.cdp) {
      await this.cdp.detach().catch(() => {});
      this.cdp = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.page = null;
    }
    this.axNodes.clear();
  }
}

export const browserController = new BrowserController();
