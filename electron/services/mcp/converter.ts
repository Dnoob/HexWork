// MCP 与 OpenAI 格式转换工具

import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SkillExecuteResult } from '../skills/base';

// MCP 工具名前缀
const MCP_PREFIX = 'mcp_';

/**
 * 将 MCP Tool 转为 OpenAI function calling 格式
 * 工具名加 mcp_{serverName}_ 前缀以区分来源
 */
export const mcpToolToOpenAI = (
  serverName: string,
  tool: Tool,
): {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} => {
  return {
    type: 'function',
    function: {
      name: `${MCP_PREFIX}${serverName}_${tool.name}`,
      description: tool.description || '',
      parameters: (tool.inputSchema as Record<string, unknown>) || { type: 'object', properties: {} },
    },
  };
};

/**
 * 将 MCP callTool 结果转为 SkillExecuteResult
 */
export const mcpResultToSkillResult = (result: CallToolResult): SkillExecuteResult => {
  const isError = result.isError === true;
  const contents = result.content || [];

  // 收集文本内容
  const textParts: string[] = [];
  let imageBase64: string | null = null;

  for (const item of contents) {
    if (item.type === 'text') {
      textParts.push(item.text);
    } else if (item.type === 'image') {
      imageBase64 = item.data;
    }
  }

  const summary = textParts.join('\n') || (isError ? '工具执行失败' : '工具执行完成');

  // 构建预览
  let preview: SkillExecuteResult['preview'];

  if (imageBase64) {
    // 有图片内容，使用 screenshot 预览
    preview = {
      type: 'screenshot',
      content: imageBase64,
    };
  } else if (textParts.length > 0) {
    // 纯文本预览
    preview = {
      type: 'text',
      content: summary,
    };
  }

  return {
    success: !isError,
    data: contents.length === 1 && contents[0].type === 'text' ? contents[0].text : contents,
    summary,
    preview,
  };
};

/**
 * 判断工具名是否为 MCP 工具（以 mcp_ 开头）
 */
export const isMcpTool = (name: string): boolean => {
  return name.startsWith(MCP_PREFIX);
};

/**
 * 从带前缀的工具名解析出 serverName 和 toolName
 * 格式：mcp_{serverName}_{toolName}
 * 注意：serverName 和 toolName 本身可能包含下划线，
 * 因此使用第一个 _ 分割出 "mcp"，第二个 _ 分割出 serverName，剩余为 toolName
 */
export const parseMcpToolName = (prefixedName: string): { serverName: string; toolName: string } | null => {
  if (!isMcpTool(prefixedName)) {
    return null;
  }

  // 去掉 "mcp_" 前缀
  const rest = prefixedName.slice(MCP_PREFIX.length);
  // 第一个 _ 分割 serverName 和 toolName
  const idx = rest.indexOf('_');
  if (idx === -1) {
    return null;
  }

  const serverName = rest.slice(0, idx);
  const toolName = rest.slice(idx + 1);

  if (!serverName || !toolName) {
    return null;
  }

  return { serverName, toolName };
};
