// MCP 多连接管理器：管理所有 MCP server 连接、配置持久化、工具路由

import { McpServerConfig, McpServerStatus, McpToolInfo } from '../../../src/types/index';
import { getConfig, setConfig } from '../config';
import { McpConnection } from './client';
import { mcpToolToOpenAI, mcpResultToSkillResult, parseMcpToolName } from './converter';
import { SkillExecuteResult } from '../skills/base';

class McpManager {
  // server name -> McpConnection
  private connections = new Map<string, McpConnection>();

  // -- 配置持久化 --

  /**
   * 从数据库加载所有 MCP server 配置
   */
  private loadConfigs(): McpServerConfig[] {
    const raw = getConfig('mcp.servers');
    if (!raw) return [];
    try {
      return JSON.parse(raw) as McpServerConfig[];
    } catch {
      console.error('[MCP Manager] 解析 mcp.servers 配置失败');
      return [];
    }
  }

  /**
   * 保存所有 MCP server 配置到数据库
   */
  private saveConfigs(configs: McpServerConfig[]): void {
    setConfig('mcp.servers', JSON.stringify(configs));
  }

  /**
   * 获取当前所有配置（包括未连接的）
   */
  private getAllConfigs(): McpServerConfig[] {
    return this.loadConfigs();
  }

  // -- 连接管理 --

  /**
   * 启动时加载配置并连接所有已启用的 server
   * 非阻塞：单个 server 连接失败不影响其他
   */
  async loadAndConnect(): Promise<void> {
    const configs = this.loadConfigs();
    console.log(`[MCP Manager] 加载了 ${configs.length} 个 MCP server 配置`);

    const connectPromises: Promise<void>[] = [];

    for (const config of configs) {
      if (!config.enabled) {
        console.log(`[MCP Manager] ${config.name}: 已禁用，跳过连接`);
        // 创建连接对象但不连接，以保留状态
        const conn = new McpConnection(config);
        this.connections.set(config.name, conn);
        continue;
      }

      const conn = new McpConnection(config);
      this.connections.set(config.name, conn);

      // 非阻塞连接
      connectPromises.push(
        conn.connect().catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : '未知错误';
          console.error(`[MCP Manager] ${config.name}: 连接失败 - ${msg}`);
        }),
      );
    }

    // 等待所有连接完成（每个都已内部捕获错误）
    await Promise.all(connectPromises);
    console.log('[MCP Manager] 所有 MCP server 连接初始化完成');
  }

  /**
   * 添加新的 MCP server
   */
  async addServer(config: McpServerConfig): Promise<void> {
    // 检查名称是否重复
    const configs = this.loadConfigs();
    if (configs.some(c => c.name === config.name)) {
      throw new Error(`MCP server "${config.name}" 已存在`);
    }

    // 持久化配置
    configs.push(config);
    this.saveConfigs(configs);
    console.log(`[MCP Manager] 添加 MCP server: ${config.name}`);

    // 创建连接并（如果启用）连接
    const conn = new McpConnection(config);
    this.connections.set(config.name, conn);

    if (config.enabled) {
      await conn.connect();
    }
  }

  /**
   * 删除 MCP server
   */
  async removeServer(name: string): Promise<void> {
    // 断开连接
    const conn = this.connections.get(name);
    if (conn) {
      await conn.disconnect();
      this.connections.delete(name);
    }

    // 从配置中删除
    const configs = this.loadConfigs().filter(c => c.name !== name);
    this.saveConfigs(configs);
    console.log(`[MCP Manager] 删除 MCP server: ${name}`);
  }

  /**
   * 更新 MCP server 配置
   */
  async updateServer(name: string, newConfig: McpServerConfig): Promise<void> {
    // 断开旧连接
    const oldConn = this.connections.get(name);
    if (oldConn) {
      await oldConn.disconnect();
      this.connections.delete(name);
    }

    // 更新配置
    const configs = this.loadConfigs();
    const idx = configs.findIndex(c => c.name === name);
    if (idx === -1) {
      throw new Error(`MCP server "${name}" 不存在`);
    }

    // 如果名称发生变化，检查新名称是否冲突
    if (newConfig.name !== name && configs.some(c => c.name === newConfig.name)) {
      throw new Error(`MCP server "${newConfig.name}" 已存在`);
    }

    configs[idx] = newConfig;
    this.saveConfigs(configs);
    console.log(`[MCP Manager] 更新 MCP server: ${name} -> ${newConfig.name}`);

    // 创建新连接并（如果启用）连接
    const conn = new McpConnection(newConfig);
    this.connections.set(newConfig.name, conn);

    if (newConfig.enabled) {
      await conn.connect();
    }
  }

  /**
   * 启用/禁用 MCP server
   */
  async toggleServer(name: string, enabled: boolean): Promise<void> {
    // 更新配置
    const configs = this.loadConfigs();
    const config = configs.find(c => c.name === name);
    if (!config) {
      throw new Error(`MCP server "${name}" 不存在`);
    }

    config.enabled = enabled;
    this.saveConfigs(configs);
    console.log(`[MCP Manager] ${name}: ${enabled ? '启用' : '禁用'}`);

    // 处理连接
    const conn = this.connections.get(name);
    if (enabled) {
      if (conn) {
        // 已有连接对象，更新配置并重连
        await conn.connect(config);
      } else {
        // 创建新连接
        const newConn = new McpConnection(config);
        this.connections.set(name, newConn);
        await newConn.connect();
      }
    } else {
      // 禁用：断开连接
      if (conn) {
        await conn.disconnect();
      }
    }
  }

  // -- 工具操作 --

  /**
   * 收集所有已连接 server 的工具定义，转为 OpenAI function calling 格式
   */
  getAllToolDefinitions(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    const definitions: Array<{
      type: 'function';
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }> = [];

    for (const [, conn] of this.connections) {
      if (conn.status !== 'connected') continue;

      for (const tool of conn.tools) {
        definitions.push(mcpToolToOpenAI(conn.config.name, tool));
      }
    }

    return definitions;
  }

  /**
   * 执行 MCP 工具：解析前缀名，路由到对应连接执行
   */
  async executeTool(prefixedName: string, argsJson: string): Promise<SkillExecuteResult> {
    // 解析 server 名和工具名
    const parsed = parseMcpToolName(prefixedName);
    if (!parsed) {
      return { success: false, data: null, summary: `无法解析 MCP 工具名: ${prefixedName}` };
    }

    const { serverName, toolName } = parsed;

    // 查找对应连接
    const conn = this.connections.get(serverName);
    if (!conn) {
      return { success: false, data: null, summary: `MCP server "${serverName}" 未找到` };
    }
    if (conn.status !== 'connected') {
      return { success: false, data: null, summary: `MCP server "${serverName}" 未连接（状态: ${conn.status}）` };
    }

    // 解析参数
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsJson);
    } catch {
      return { success: false, data: null, summary: `参数解析失败: ${argsJson}` };
    }

    // 调用工具
    try {
      const result = await conn.callTool(toolName, args);
      return mcpResultToSkillResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      return { success: false, data: null, summary: `MCP 工具执行失败: ${msg}` };
    }
  }

  /**
   * 检查工具所属 server 是否被信任（跳过危险操作确认）
   */
  isToolTrusted(prefixedName: string): boolean {
    const parsed = parseMcpToolName(prefixedName);
    if (!parsed) return false;

    const configs = this.loadConfigs();
    const config = configs.find(c => c.name === parsed.serverName);
    return config?.trusted === true;
  }

  // -- 状态查询 --

  /**
   * 返回所有 server 的运行时状态
   */
  getStatus(): McpServerStatus[] {
    const configs = this.getAllConfigs();
    return configs.map(config => {
      const conn = this.connections.get(config.name);
      return {
        config,
        status: conn?.status ?? 'disconnected',
        toolCount: conn?.tools.length ?? 0,
        errorMessage: conn?.errorMessage,
      };
    });
  }

  /**
   * 返回指定 server 的工具列表
   */
  getServerTools(name: string): McpToolInfo[] {
    const conn = this.connections.get(name);
    if (!conn || conn.status !== 'connected') {
      return [];
    }

    return conn.tools.map(tool => ({
      serverName: name,
      toolName: tool.name,
      prefixedName: `mcp_${name}_${tool.name}`,
      description: tool.description || '',
    }));
  }

  /**
   * 重新连接指定 server
   */
  async reconnectServer(name: string): Promise<void> {
    const conn = this.connections.get(name);
    if (!conn) {
      throw new Error(`MCP server "${name}" 未找到`);
    }
    await conn.reconnect();
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    console.log('[MCP Manager] 关闭所有 MCP 连接...');
    const closePromises: Promise<void>[] = [];

    for (const [, conn] of this.connections) {
      closePromises.push(
        conn.disconnect().catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : '未知错误';
          console.error(`[MCP Manager] 关闭连接出错: ${msg}`);
        }),
      );
    }

    await Promise.all(closePromises);
    this.connections.clear();
    console.log('[MCP Manager] 所有 MCP 连接已关闭');
  }
}

// 单例
export const mcpManager = new McpManager();
