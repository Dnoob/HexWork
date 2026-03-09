import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './services/db';
import { registerAllIPC } from './ipc';
import { registerAllSkills } from './services/skills';
import { agentSkillManager } from './services/skills/agent/manager';
import { browserController } from './services/skills/browser/controller';
import { mcpManager } from './services/mcp';
import { taskScheduler } from './services/scheduler';

// 主窗口引用
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
// 标记是否真正退出（区分关闭窗口和退出应用）
let isQuitting = false;

// 判断是否为开发模式
const isDev = !app.isPackaged;

const createWindow = (): void => {
  const iconPath = path.join(__dirname, isDev ? '../resources/icon-256.png' : '../resources/icon-256.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 开发模式从 Vite dev server 加载，生产模式从构建产物加载
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 点击关闭按钮时隐藏到托盘而非退出
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// 应用就绪后初始化
app.whenReady().then(() => {
  // 初始化数据库
  initDatabase();

  // 注册所有内置技能（file/browser skills）
  registerAllSkills();

  // 安装预置 Agent Skills（首次启动才安装）
  agentSkillManager.installBuiltinSkills();

  // 注册所有 IPC 处理器
  registerAllIPC();

  // 窗口控制 IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // 创建系统托盘
  const trayIconPath = path.join(__dirname, isDev ? '../resources/icon-32.png' : '../resources/icon-32.png');
  const trayIcon = nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip('HexWork');

  const trayMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(trayMenu);

  // 单击托盘图标显示/隐藏窗口
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  // 创建主窗口
  createWindow();

  // 非阻塞加载 MCP 连接
  mcpManager.loadAndConnect().catch(err => {
    console.error('MCP 初始化失败:', err);
  });

  // 启动定时任务调度器
  try {
    taskScheduler.start();
  } catch (err) {
    console.error('定时任务调度器启动失败:', err);
  }

  // macOS 下点击 dock 图标重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 窗口关闭后不退出（托盘常驻），macOS 同理
app.on('window-all-closed', () => {
  // 不退出，由托盘菜单"退出"控制
});

// 应用退出前清理资源
app.on('before-quit', async () => {
  isQuitting = true;
  taskScheduler.stopAll();
  await browserController.close();
  await mcpManager.closeAll();
  closeDatabase();
});
