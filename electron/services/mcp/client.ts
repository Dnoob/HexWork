// MCP 单连接封装：管理与一个 MCP server 的连接生命周期

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpServerConfig, McpConnectionStatus } from '../../../src/types/index';

export class McpConnection {
  private client: Client | null = null;
  private _status: McpConnectionStatus = 'disconnected';
  private _tools: Tool[] = [];
  private _errorMessage?: string;
  private _config: McpServerConfig;

  constructor(config: McpServerConfig) {
    this._config = config;
  }

  // -- 公开属性 --

  get status(): McpConnectionStatus {
    return this._status;
  }

  get tools(): Tool[] {
    return this._tools;
  }

  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  get config(): McpServerConfig {
    return this._config;
  }

  // -- 连接管理 --

  /**
   * 根据传输类型创建传输层并连接到 MCP server
   */
  async connect(config?: McpServerConfig): Promise<void> {
    if (config) {
      this._config = config;
    }

    // 防止重复连接
    if (this._status === 'connecting') {
      console.log(`[MCP] ${this._config.name}: 正在连接中，跳过重复连接请求`);
      return;
    }

    this._status = 'connecting';
    this._errorMessage = undefined;
    this._tools = [];

    try {
      // 创建 MCP Client
      this.client = new Client({
        name: 'hexwork',
        version: '1.0.0',
      });

      // 根据传输类型创建传输层
      let transport;
      if (this._config.transport === 'stdio') {
        if (!this._config.command) {
          throw new Error('stdio 传输需要指定 command');
        }
        transport = new StdioClientTransport({
          command: this._config.command,
          args: this._config.args,
          env: this._config.env ? { ...process.env, ...this._config.env } as Record<string, string> : undefined,
        });
      } else if (this._config.transport === 'http') {
        if (!this._config.url) {
          throw new Error('http 传输需要指定 url');
        }
        transport = new StreamableHTTPClientTransport(
          new URL(this._config.url),
        );
      } else {
        throw new Error(`不支持的传输类型: ${this._config.transport}`);
      }

      // 连接
      await this.client.connect(transport);
      console.log(`[MCP] ${this._config.name}: 已连接`);

      // 发现工具
      await this.discoverTools();

      this._status = 'connected';
      console.log(`[MCP] ${this._config.name}: 发现 ${this._tools.length} 个工具`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      this._status = 'error';
      this._errorMessage = msg;
      this._tools = [];
      console.error(`[MCP] ${this._config.name}: 连接失败 - ${msg}`);

      // 清理可能半初始化的 client
      if (this.client) {
        try {
          await this.client.close();
        } catch {
          // 忽略关闭错误
        }
        this.client = null;
      }
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.log(`[MCP] ${this._config.name}: 已断开连接`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '未知错误';
        console.error(`[MCP] ${this._config.name}: 断开连接出错 - ${msg}`);
      }
      this.client = null;
    }
    this._status = 'disconnected';
    this._tools = [];
    this._errorMessage = undefined;
  }

  /**
   * 重新连接（断开后重连）
   */
  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  // -- 工具操作 --

  /**
   * 发现（刷新）服务器提供的工具列表
   */
  async discoverTools(): Promise<Tool[]> {
    if (!this.client) {
      throw new Error('未连接到 MCP server');
    }

    const result = await this.client.listTools();
    this._tools = result.tools;
    return this._tools;
  }

  /**
   * 调用 MCP 工具
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    if (!this.client) {
      throw new Error('未连接到 MCP server');
    }

    console.log(`[MCP] ${this._config.name}: 调用工具 ${name}`);
    const result = await this.client.callTool({ name, arguments: args });
    return result as CallToolResult;
  }
}
