import { contextBridge, ipcRenderer } from 'electron';

// 通过 contextBridge 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('api', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
  chat: {
    // 发送消息
    send: (conversationId: string, content: string, attachments?: Array<{ name: string; path: string; size: number; mimeType: string; category: string }>) => {
      ipcRenderer.send('chat:send', conversationId, content, attachments);
    },
    // 停止生成
    stop: () => {
      ipcRenderer.send('chat:stop');
    },
    // 监听流式响应块
    onChunk: (callback: (chunk: { delta: string; done: boolean }) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        chunk: { delta: string; done: boolean },
      ) => callback(chunk);
      ipcRenderer.on('chat:chunk', handler);
      return () => {
        ipcRenderer.removeListener('chat:chunk', handler);
      };
    },
    // 监听错误
    onError: (callback: (error: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, error: string) =>
        callback(error);
      ipcRenderer.on('chat:error', handler);
      return () => {
        ipcRenderer.removeListener('chat:error', handler);
      };
    },
    // 监听工具调用状态
    onToolCall: (callback: (data: { name: string; args: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { name: string; args: string }) =>
        callback(data);
      ipcRenderer.on('chat:toolCall', handler);
      return () => {
        ipcRenderer.removeListener('chat:toolCall', handler);
      };
    },
    // 监听工具执行结果
    onToolResult: (callback: (data: { name: string; summary: string; preview?: unknown }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { name: string; summary: string; preview?: unknown }) =>
        callback(data);
      ipcRenderer.on('chat:toolResult', handler);
      return () => {
        ipcRenderer.removeListener('chat:toolResult', handler);
      };
    },
    // 监听危险操作确认请求
    onConfirmToolCall: (callback: (data: { id: string; name: string; description: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { id: string; name: string; description: string }) =>
        callback(data);
      ipcRenderer.on('chat:confirmToolCall', handler);
      return () => {
        ipcRenderer.removeListener('chat:confirmToolCall', handler);
      };
    },
    // 回复危险操作确认
    confirmToolCall: (id: string, approved: boolean) => {
      ipcRenderer.send('chat:confirmToolCallResult', id, approved);
    },
    // 测试 API Key 连接
    testConnection: (providerId: string, apiKey: string, model: string) =>
      ipcRenderer.invoke('llm:testConnection', providerId, apiKey, model),
  },
  conversation: {
    // 获取会话列表
    list: () => ipcRenderer.invoke('conversation:list'),
    // 创建新会话
    create: (title?: string) => ipcRenderer.invoke('conversation:create', title),
    // 删除会话
    delete: (id: string) => ipcRenderer.invoke('conversation:delete', id),
    // 重命名会话
    rename: (id: string, title: string) =>
      ipcRenderer.invoke('conversation:rename', id, title),
    // 置顶/取消置顶会话
    pin: (id: string, pinned: boolean) => ipcRenderer.invoke('conversation:pin', id, pinned),
  },
  message: {
    // 获取消息列表
    list: (conversationId: string) =>
      ipcRenderer.invoke('message:list', conversationId),
  },
  config: {
    // 获取配置
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    // 设置配置
    set: (key: string, value: string) =>
      ipcRenderer.invoke('config:set', key, value),
  },
  file: {
    // 选择目录
    selectDir: () => ipcRenderer.invoke('file:selectDir'),
    // 选择文件
    selectFile: () => ipcRenderer.invoke('file:selectFile') as Promise<string[] | null>,
    // 列出目录内容
    listDir: (dirPath: string) => ipcRenderer.invoke('file:listDir', dirPath),
    // 保存临时文件（粘贴图片）
    saveTempFile: (fileName: string, base64Data: string) =>
      ipcRenderer.invoke('file:saveTempFile', fileName, base64Data) as Promise<{ path: string; size: number }>,
  },
  browser: {
    // 关闭浏览器
    close: () => ipcRenderer.invoke('browser:close'),
  },
  mcp: {
    // 获取所有 MCP server 状态
    getServers: () => ipcRenderer.invoke('mcp:getServers'),
    // 添加 server
    addServer: (config: { name: string; transport: string; command?: string; args?: string[]; env?: Record<string, string>; url?: string; headers?: Record<string, string>; enabled: boolean; trusted?: boolean }) =>
      ipcRenderer.invoke('mcp:addServer', config),
    // 更新 server 配置
    updateServer: (name: string, config: { name: string; transport: string; command?: string; args?: string[]; env?: Record<string, string>; url?: string; headers?: Record<string, string>; enabled: boolean; trusted?: boolean }) =>
      ipcRenderer.invoke('mcp:updateServer', name, config),
    // 删除 server
    removeServer: (name: string) => ipcRenderer.invoke('mcp:removeServer', name),
    // 启用/禁用 server
    toggleServer: (name: string, enabled: boolean) => ipcRenderer.invoke('mcp:toggleServer', name, enabled),
    // 重连 server
    reconnect: (name: string) => ipcRenderer.invoke('mcp:reconnect', name),
    // 获取指定 server 的工具列表
    getTools: (name: string) => ipcRenderer.invoke('mcp:getTools', name),
  },
  skill: {
    // 获取所有已安装 skill 列表
    list: () => ipcRenderer.invoke('skill:list'),
    // 获取单个 skill 详情
    detail: (name: string) => ipcRenderer.invoke('skill:detail', name),
    // 从本地文件夹安装
    installLocal: (sourcePath: string) => ipcRenderer.invoke('skill:installLocal', sourcePath),
    // 从 Git URL 安装
    installGit: (url: string) => ipcRenderer.invoke('skill:installGit', url),
    // 从 ClawHub 安装
    installClawHub: (slug: string, author: string) => ipcRenderer.invoke('skill:installClawHub', slug, author),
    // 卸载
    uninstall: (name: string) => ipcRenderer.invoke('skill:uninstall', name),
    // 启用/禁用
    toggle: (name: string, enabled: boolean) => ipcRenderer.invoke('skill:toggle', name, enabled),
    // 更新 Git 来源的 skill
    update: (name: string) => ipcRenderer.invoke('skill:update', name),
    // 创建新 skill
    create: (name: string, description: string, options: { scripts?: boolean; references?: boolean; assets?: boolean }) =>
      ipcRenderer.invoke('skill:create', name, description, options),
    // 选择目录
    selectDir: () => ipcRenderer.invoke('skill:selectDir'),
    // 搜索技能市场（ClawHub）
    searchMarket: (query: string) => ipcRenderer.invoke('skill:searchMarket', query),
    // 获取热门技能（ClawHub top-downloads）
    featuredMarket: () => ipcRenderer.invoke('skill:featuredMarket'),
    // 获取市场统计
    marketStats: () => ipcRenderer.invoke('skill:marketStats'),
  },
  scheduler: {
    // 获取所有定时任务
    list: () => ipcRenderer.invoke('scheduler:list'),
    // 创建任务
    create: (params: { name: string; prompt: string; cronExpr: string; autoApprove?: boolean }) =>
      ipcRenderer.invoke('scheduler:create', params),
    // 更新任务
    update: (id: string, params: { name?: string; prompt?: string; cronExpr?: string; autoApprove?: boolean }) =>
      ipcRenderer.invoke('scheduler:update', id, params),
    // 删除任务
    delete: (id: string) => ipcRenderer.invoke('scheduler:delete', id),
    // 启用/禁用
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke('scheduler:toggle', id, enabled),
    // 手动立即执行
    runNow: (id: string) => ipcRenderer.invoke('scheduler:runNow', id),
    // 获取执行历史
    history: (taskId: string, limit?: number) => ipcRenderer.invoke('scheduler:history', taskId, limit),
    // 监听任务完成通知
    onTaskComplete: (callback: (data: { taskId: string; taskName: string; status: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { taskId: string; taskName: string; status: string }) =>
        callback(data);
      ipcRenderer.on('scheduler:onTaskComplete', handler);
      return () => {
        ipcRenderer.removeListener('scheduler:onTaskComplete', handler);
      };
    },
  },
  studio: {
    generate: (params: { topic: string; audience: string[]; style: string[]; scene: string[] }) => {
      ipcRenderer.send('studio:generate', params);
    },
    stop: () => {
      ipcRenderer.send('studio:stop');
    },
    onChunk: (callback: (chunk: { platform: string; content: unknown; done: boolean }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, chunk: { platform: string; content: unknown; done: boolean }) => callback(chunk);
      ipcRenderer.on('studio:chunk', handler);
      return () => { ipcRenderer.removeListener('studio:chunk', handler); };
    },
    onSearchDone: (callback: (summary: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, summary: string) => callback(summary);
      ipcRenderer.on('studio:searchDone', handler);
      return () => { ipcRenderer.removeListener('studio:searchDone', handler); };
    },
    onError: (callback: (error: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error);
      ipcRenderer.on('studio:error', handler);
      return () => { ipcRenderer.removeListener('studio:error', handler); };
    },
    onDone: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('studio:done', handler);
      return () => { ipcRenderer.removeListener('studio:done', handler); };
    },
    testTavily: (apiKey: string) =>
      ipcRenderer.invoke('studio:testTavily', apiKey),
  },
});
