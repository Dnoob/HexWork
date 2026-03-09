// MCP 服务管理 IPC：提供 MCP server 的增删改查和工具查询
import { ipcMain } from 'electron';
import { mcpManager } from '../services/mcp';
import { McpServerConfig } from '../../src/types';

export const registerMcpIPC = (): void => {
  // 获取所有 server 状态
  ipcMain.handle('mcp:getServers', () => {
    return mcpManager.getStatus();
  });

  // 添加 server
  ipcMain.handle('mcp:addServer', async (_event, config: McpServerConfig) => {
    await mcpManager.addServer(config);
  });

  // 更新 server 配置
  ipcMain.handle('mcp:updateServer', async (_event, name: string, config: McpServerConfig) => {
    await mcpManager.updateServer(name, config);
  });

  // 删除 server
  ipcMain.handle('mcp:removeServer', async (_event, name: string) => {
    await mcpManager.removeServer(name);
  });

  // 启用/禁用 server
  ipcMain.handle('mcp:toggleServer', async (_event, name: string, enabled: boolean) => {
    await mcpManager.toggleServer(name, enabled);
  });

  // 重连 server（先禁用再启用）
  ipcMain.handle('mcp:reconnect', async (_event, name: string) => {
    await mcpManager.toggleServer(name, false);
    await mcpManager.toggleServer(name, true);
  });

  // 获取指定 server 的工具列表
  ipcMain.handle('mcp:getTools', (_event, name: string) => {
    return mcpManager.getServerTools(name);
  });
};
