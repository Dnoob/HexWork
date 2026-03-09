// 会话
export interface Conversation {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

// 文件附件
export interface FileAttachment {
  name: string;       // 文件名
  path: string;       // 文件绝对路径
  size: number;       // 文件大小（字节）
  mimeType: string;   // MIME 类型
  category: 'image' | 'text' | 'document';
}

// 消息
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: number;
  // 工具调用元数据（assistant 消息）
  toolCalls?: ToolCall[];
  // 工具结果元数据（tool 消息）
  toolCallId?: string;
  toolName?: string;
  // 工具结果预览数据
  preview?: ToolPreview;
  // 附件元数据（用户消息）
  attachments?: FileAttachment[];
}

// 工具调用（LLM 发起）
export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

// 工具定义（OpenAI function calling 格式）
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// 工具结果预览
export interface ToolPreview {
  type: 'table' | 'text' | 'diff' | 'file-info' | 'screenshot';
  content: unknown;
}

// 表格预览数据
export interface TablePreview {
  headers: string[];
  rows: string[][];
  totalRows?: number;
}

// 文件条目（文件树）
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
}

// 流式响应块
export interface ChatChunk {
  delta: string;
  done: boolean;
  // 工具调用数据
  toolCalls?: ToolCall[];
}

// LLM 配置
export interface LLMConfig {
  provider: string;
  apiKey: string;
  model: string;
}

// Electron API 类型（preload 暴露给渲染进程）
export interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  chat: {
    send: (conversationId: string, content: string, attachments?: FileAttachment[]) => void;
    stop: () => void;
    onChunk: (callback: (chunk: ChatChunk) => void) => () => void;
    onError: (callback: (error: string) => void) => () => void;
    // 工具调用状态事件
    onToolCall: (callback: (data: { name: string; args: string }) => void) => () => void;
    onToolResult: (callback: (data: { name: string; summary: string; preview?: ToolPreview }) => void) => () => void;
    // 危险操作确认
    onConfirmToolCall: (callback: (data: { id: string; name: string; description: string }) => void) => () => void;
    confirmToolCall: (id: string, approved: boolean) => void;
    // 测试连接
    testConnection: (providerId: string, apiKey: string, model: string) => Promise<{ success: boolean; message: string }>;
  };
  conversation: {
    list: () => Promise<Conversation[]>;
    create: (title?: string) => Promise<Conversation>;
    delete: (id: string) => Promise<void>;
    rename: (id: string, title: string) => Promise<void>;
    pin: (id: string, pinned: boolean) => Promise<void>;
  };
  message: {
    list: (conversationId: string) => Promise<Message[]>;
  };
  config: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
  };
  file: {
    selectDir: () => Promise<string | null>;
    selectFile: () => Promise<string[] | null>;
    listDir: (dirPath: string) => Promise<FileEntry[]>;
    saveTempFile: (fileName: string, base64Data: string) => Promise<{ path: string; size: number }>;
  };
  browser: {
    close: () => Promise<void>;
  };
  mcp: {
    getServers: () => Promise<McpServerStatus[]>;
    addServer: (config: McpServerConfig) => Promise<void>;
    updateServer: (name: string, config: McpServerConfig) => Promise<void>;
    removeServer: (name: string) => Promise<void>;
    toggleServer: (name: string, enabled: boolean) => Promise<void>;
    reconnect: (name: string) => Promise<void>;
    getTools: (name: string) => Promise<McpToolInfo[]>;
  };
  skill: {
    list: () => Promise<AgentSkillMeta[]>;
    detail: (name: string) => Promise<AgentSkillFull>;
    installLocal: (sourcePath: string) => Promise<AgentSkillMeta>;
    installGit: (url: string) => Promise<AgentSkillMeta>;
    installClawHub: (slug: string, author: string) => Promise<AgentSkillMeta>;
    uninstall: (name: string) => Promise<void>;
    toggle: (name: string, enabled: boolean) => Promise<void>;
    update: (name: string) => Promise<AgentSkillMeta>;
    create: (name: string, description: string, options: { scripts?: boolean; references?: boolean; assets?: boolean }) => Promise<AgentSkillMeta>;
    selectDir: () => Promise<string | null>;
    searchMarket: (query: string) => Promise<MarketSkillResult[]>;
    featuredMarket: () => Promise<MarketSkillResult[]>;
    marketStats: () => Promise<{ totalSkills: number; totalDownloads: number }>;
  };
  scheduler: {
    list: () => Promise<ScheduledTask[]>;
    create: (params: CreateTaskParams) => Promise<ScheduledTask>;
    update: (id: string, params: UpdateTaskParams) => Promise<ScheduledTask>;
    delete: (id: string) => Promise<void>;
    toggle: (id: string, enabled: boolean) => Promise<void>;
    runNow: (id: string) => Promise<void>;
    history: (taskId: string, limit?: number) => Promise<TaskRun[]>;
    onTaskComplete: (callback: (data: { taskId: string; taskName: string; status: string }) => void) => () => void;
  };
  studio: {
    generate: (params: StudioGenerateParams) => void;
    stop: () => void;
    onChunk: (callback: (chunk: StudioChunk) => void) => () => void;
    onSearchDone: (callback: (summary: string) => void) => () => void;
    onError: (callback: (error: string) => void) => () => void;
    onDone: (callback: () => void) => () => void;
    testTavily: (apiKey: string) => Promise<{ success: boolean; message: string }>;
  };
}

// MCP Server 配置
export interface McpServerConfig {
  name: string;                       // 唯一标识（如 "filesystem"、"github"）
  transport: 'stdio' | 'http';       // 传输类型
  // stdio 专用
  command?: string;                   // 可执行程序（如 "npx"、"node"）
  args?: string[];                    // 命令行参数
  env?: Record<string, string>;       // 环境变量
  // http 专用
  url?: string;                       // 服务端 URL
  headers?: Record<string, string>;   // 自定义请求头
  // 通用
  enabled: boolean;                   // 是否启用
  trusted?: boolean;                  // 是否信任（跳过操作确认）
}

// MCP Server 连接状态
export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// MCP Server 运行时状态（配置 + 连接状态）
export interface McpServerStatus {
  config: McpServerConfig;
  status: McpConnectionStatus;
  toolCount: number;
  errorMessage?: string;
}

// MCP 工具信息
export interface McpToolInfo {
  serverName: string;
  toolName: string;
  prefixedName: string;
  description: string;
}

// Agent Skill 元数据
export interface AgentSkillMeta {
  name: string;
  description: string;
  path: string;
  license?: string;
  metadata?: Record<string, string>;
  enabled: boolean;
  source: 'local' | 'git' | 'builtin' | 'market';
  sourceUrl?: string;
  installedAt: number;
  updatedAt: number;
}

// Agent Skill 完整数据（含指令内容）
export interface AgentSkillFull extends AgentSkillMeta {
  instructions: string;
  files: string[];  // skill 目录下的文件列表
}

// 技能市场搜索结果（ClawHub）
export interface MarketSkillResult {
  name: string;
  slug: string;
  description: string;
  downloads: number;
  stars: number;
  author: string;
  url: string;          // clawhub_url
  certified?: boolean;
}

// 定时任务
export interface ScheduledTask {
  id: string;
  name: string;
  prompt: string;
  cronExpr: string;
  enabled: boolean;
  autoApprove: boolean;
  lastRunAt: number | null;
  lastStatus: 'success' | 'error' | 'running' | null;
  nextRunAt: number | null;  // 前端计算或后端提供
  createdAt: number;
  updatedAt: number;
}

// 任务执行记录
export interface TaskRun {
  id: string;
  taskId: string;
  conversationId: string | null;
  status: 'success' | 'error' | 'missed' | 'cancelled';
  startedAt: number;
  finishedAt: number | null;
  errorMessage: string | null;
}

// 创建任务参数
export interface CreateTaskParams {
  name: string;
  prompt: string;
  cronExpr: string;
  autoApprove?: boolean;
}

// 更新任务参数
export interface UpdateTaskParams {
  name?: string;
  prompt?: string;
  cronExpr?: string;
  autoApprove?: boolean;
}

// ===== Content Studio =====

// 平台标识
export type PlatformId = 'xiaohongshu' | 'douyin' | 'weibo' | 'wechat' | 'bilibili' | 'zhihu';

// 单个平台的生成结果
export interface PlatformContent {
  platform: PlatformId;
  title: string;
  content: string;
  tags: string[];
  // 平台特有字段
  extra?: Record<string, string>;
}

// 生成请求参数
export interface StudioGenerateParams {
  topic: string;
  audience: string[];
  style: string[];
  scene: string[];
}

// 流式生成 chunk（主进程 → 渲染进程）
export interface StudioChunk {
  platform: PlatformId;
  content: Partial<PlatformContent>;
  done: boolean;
}

// 扩展 Window 类型
declare global {
  interface Window {
    api: ElectronAPI;
  }
}
