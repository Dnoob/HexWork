import { create } from 'zustand';
import { McpServerConfig, McpServerStatus, McpToolInfo } from '../types';

interface McpState {
  servers: McpServerStatus[];
  loaded: boolean;
  selectedServer: string | null;
  tools: McpToolInfo[];

  loadServers: () => Promise<void>;
  addServer: (config: McpServerConfig) => Promise<void>;
  updateServer: (name: string, config: McpServerConfig) => Promise<void>;
  removeServer: (name: string) => Promise<void>;
  toggleServer: (name: string, enabled: boolean) => Promise<void>;
  reconnectServer: (name: string) => Promise<void>;
  selectServer: (name: string | null) => Promise<void>;
  refreshServers: () => Promise<void>;
}

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  loaded: false,
  selectedServer: null,
  tools: [],

  loadServers: async () => {
    try {
      const servers = await window.api.mcp.getServers();
      set({ servers, loaded: true });
    } catch (err) {
      console.error('加载 MCP servers 失败:', err);
      set({ loaded: true });
    }
  },

  addServer: async (config: McpServerConfig) => {
    await window.api.mcp.addServer(config);
    await get().loadServers();
  },

  updateServer: async (name: string, config: McpServerConfig) => {
    await window.api.mcp.updateServer(name, config);
    await get().loadServers();
  },

  removeServer: async (name: string) => {
    await window.api.mcp.removeServer(name);
    // 如果删除的是当前选中的 server，清除选中状态
    if (get().selectedServer === name) {
      set({ selectedServer: null, tools: [] });
    }
    await get().loadServers();
  },

  toggleServer: async (name: string, enabled: boolean) => {
    await window.api.mcp.toggleServer(name, enabled);
    await get().loadServers();
  },

  reconnectServer: async (name: string) => {
    await window.api.mcp.reconnect(name);
    await get().loadServers();
  },

  selectServer: async (name: string | null) => {
    if (name === get().selectedServer) {
      // 点击已选中的 server 则折叠
      set({ selectedServer: null, tools: [] });
      return;
    }
    set({ selectedServer: name, tools: [] });
    if (name) {
      try {
        const tools = await window.api.mcp.getTools(name);
        // 确保选中状态未变（避免竞态）
        if (get().selectedServer === name) {
          set({ tools });
        }
      } catch (err) {
        console.error('加载工具列表失败:', err);
      }
    }
  },

  refreshServers: async () => {
    try {
      const servers = await window.api.mcp.getServers();
      set({ servers });
    } catch (err) {
      console.error('刷新 MCP servers 失败:', err);
    }
  },
}));
