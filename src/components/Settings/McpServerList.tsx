// MCP Server 列表组件：展示所有 MCP server 状态与管理操作
import { useEffect, useState } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import { McpServerForm } from './McpServerForm';
import { McpServerConfig, McpConnectionStatus } from '../../types';

// 状态颜色映射
const statusColorMap: Record<McpConnectionStatus, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500',
  error: 'bg-red-500',
  disconnected: 'bg-muted-foreground/50',
};

// 状态文字映射
const statusTextMap: Record<McpConnectionStatus, string> = {
  connected: '已连接',
  connecting: '连接中',
  error: '错误',
  disconnected: '未连接',
};

export const McpServerList = () => {
  const {
    servers,
    loaded,
    selectedServer,
    tools,
    loadServers,
    addServer,
    updateServer,
    removeServer,
    toggleServer,
    reconnectServer,
    selectServer,
    refreshServers,
  } = useMcpStore();

  // 表单状态
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null);
  // 删除确认
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // 初始加载 + 定时轮询
  useEffect(() => {
    if (!loaded) {
      loadServers();
    }

    const timer = setInterval(() => {
      refreshServers();
    }, 30000);

    return () => clearInterval(timer);
  }, [loaded, loadServers, refreshServers]);

  // 添加 server
  const handleAdd = async (config: McpServerConfig) => {
    try {
      await addServer(config);
      setShowAddForm(false);
    } catch (err) {
      console.error('添加 MCP server 失败:', err);
    }
  };

  // 编辑 server
  const handleUpdate = async (config: McpServerConfig) => {
    if (!editingServer) return;
    try {
      await updateServer(editingServer.name, config);
      setEditingServer(null);
    } catch (err) {
      console.error('更新 MCP server 失败:', err);
    }
  };

  // 删除 server
  const handleDelete = async (name: string) => {
    try {
      await removeServer(name);
      setConfirmingDelete(null);
    } catch (err) {
      console.error('删除 MCP server 失败:', err);
    }
  };

  // 切换启用/禁用
  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      await toggleServer(name, enabled);
    } catch (err) {
      console.error('切换 MCP server 失败:', err);
    }
  };

  // 重连
  const handleReconnect = async (name: string) => {
    try {
      await reconnectServer(name);
    } catch (err) {
      console.error('重连 MCP server 失败:', err);
    }
  };

  return (
    <div>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">MCP（Model Context Protocol）允许 AI 调用外部工具和服务</p>
        <button
          onClick={() => { setShowAddForm(true); setEditingServer(null); }}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          + 添加
        </button>
      </div>

      {/* Server 列表 */}
      {servers.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          暂无 MCP Server，点击「+ 添加」开始配置
        </div>
      )}

      <div className="space-y-1">
        {servers.map((server) => {
          const isSelected = selectedServer === server.config.name;
          const isConfirmingDelete = confirmingDelete === server.config.name;
          const isEditing = editingServer?.name === server.config.name;

          return (
            <div key={server.config.name}>
              {/* Server 行 */}
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-accent' : 'hover:bg-muted/50'
                }`}
                onClick={() => selectServer(server.config.name)}
              >
                {/* 状态指示灯 */}
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColorMap[server.status]}`}
                  title={statusTextMap[server.status]}
                />

                {/* 名称 */}
                <span className="font-medium text-sm text-foreground min-w-0 truncate">
                  {server.config.name}
                </span>

                {/* 传输类型标签 */}
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {server.config.transport}
                </span>

                {/* 工具数量 */}
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {server.status === 'connected' ? `${server.toolCount} tools` : '—'}
                </span>

                {/* 右侧操作区 */}
                <div className="ml-auto flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {/* 启用/禁用开关 */}
                  <button
                    type="button"
                    onClick={() => handleToggle(server.config.name, !server.config.enabled)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${
                      server.config.enabled ? 'bg-green-500' : 'bg-muted-foreground/30'
                    }`}
                    title={server.config.enabled ? '禁用' : '启用'}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                        server.config.enabled ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>

                  {/* 重连按钮 */}
                  {server.config.enabled && (server.status === 'error' || server.status === 'disconnected') && (
                    <button
                      onClick={() => handleReconnect(server.config.name)}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors"
                      title="重新连接"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}

                  {/* 编辑按钮 */}
                  <button
                    onClick={() => { setEditingServer(server.config); setShowAddForm(false); }}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="编辑"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => setConfirmingDelete(server.config.name)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 删除确认 */}
              {isConfirmingDelete && (
                <div className="mx-4 mt-1 mb-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive mb-2">
                    确定要删除「{server.config.name}」吗？此操作不可撤销。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(server.config.name)}
                      className="px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                    >
                      确认删除
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(null)}
                      className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-accent transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* 错误信息 */}
              {server.status === 'error' && server.errorMessage && (
                <div className="mx-4 mt-1 mb-1 px-3 py-1.5 bg-destructive/10 rounded text-xs text-destructive">
                  {server.errorMessage}
                </div>
              )}

              {/* 展开的工具列表 */}
              {isSelected && !isEditing && (
                <div className="mx-4 mt-1 mb-2 p-3 bg-muted/50 rounded-lg border border-border">
                  {server.status !== 'connected' ? (
                    <p className="text-xs text-muted-foreground">服务未连接，无法查看工具列表</p>
                  ) : tools.length === 0 ? (
                    <p className="text-xs text-muted-foreground">该服务未提供任何工具</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        可用工具（{tools.length}）
                      </p>
                      <div className="space-y-1.5">
                        {tools.map((tool) => (
                          <div key={tool.prefixedName} className="flex items-start gap-2">
                            <span className="text-xs font-mono text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5">
                              {tool.toolName}
                            </span>
                            <span className="text-xs text-muted-foreground leading-relaxed">
                              {tool.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 编辑表单 */}
              {isEditing && (
                <div className="mx-4">
                  <McpServerForm
                    server={server.config}
                    onSave={handleUpdate}
                    onCancel={() => setEditingServer(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <McpServerForm
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};
