import { IpcMainEvent, ipcMain } from 'electron';
import crypto from 'crypto';
import { getDatabase } from '../db';
import { getConfig } from '../config';
import { OpenAICompatibleProvider } from './openaiCompatible';
import { providers, DEFAULT_PROVIDER, getBaseURL } from './providers';
import { LLMProvider, ChatMessage, ToolCallData, ContentPart } from './provider';
import { processAttachments, FileAttachment } from '../attachment';
import { skillManager } from '../skills/manager';
import { mcpManager, isMcpTool } from '../mcp';
import { agentSkillManager } from '../skills/agent/manager';
import { agentSkillLoader } from '../skills/agent/loader';
import { agentSkillExecutor } from '../skills/agent/executor';
import { buildSystemPrompt } from './systemPrompt';

// 当前的 AbortController，用于取消生成
let currentAbortController: AbortController | null = null;

// 消息上下文最大条数
const MAX_CONTEXT_MESSAGES = 100;
// 工具调用最大轮次
const MAX_TOOL_ROUNDS = 15;

// 根据配置创建 LLM Provider
const createProvider = (apiKey: string, baseURL: string, model: string): LLMProvider => {
  return new OpenAICompatibleProvider(apiKey, baseURL, model);
};

// 停止当前生成
export const stopGeneration = (): void => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
};

// 测试 API Key 连接
export const testConnection = async (
  providerId: string,
  apiKey: string,
  model: string,
): Promise<{ success: boolean; message: string }> => {
  const baseURL = getBaseURL(providerId, apiKey);
  const provider = createProvider(apiKey, baseURL, model);

  try {
    let received = false;
    for await (const chunk of provider.chat({
      model,
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 8,
    })) {
      received = true;
      if (chunk.done) break;
    }
    return received
      ? { success: true, message: '连接成功' }
      : { success: false, message: '未收到响应' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return { success: false, message: msg };
  }
};

// 自动生成会话标题：取用户消息前 20 个字符
const autoGenerateTitle = (conversationId: string, userContent: string): void => {
  const db = getDatabase();
  const conversation = db
    .prepare('SELECT title FROM conversations WHERE id = ?')
    .get(conversationId) as { title: string } | undefined;

  if (conversation && conversation.title === '新对话') {
    const newTitle = userContent.length > 20
      ? userContent.slice(0, 20) + '...'
      : userContent;
    db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(
      newTitle,
      Date.now(),
      conversationId,
    );
  }
};

// 保存消息到数据库
const saveMessage = (
  conversationId: string,
  role: string,
  content: string,
  metadata?: Record<string, unknown>,
): string => {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  db.prepare(
    'INSERT INTO messages (id, conversation_id, role, content, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, conversationId, role, content, Date.now(), metadataJson);
  return id;
};

// Agent Skill 内置工具名
const AGENT_SKILL_TOOLS = ['activate_skill', 'read_skill_resource', 'run_skill_script'];

// 判断是否为 Agent Skill 内置工具
const isAgentSkillTool = (name: string): boolean => AGENT_SKILL_TOOLS.includes(name);

// 构建 Agent Skill 相关的 function calling 工具定义
const buildAgentSkillTools = (): Array<{
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> => {
  const summaries = agentSkillManager.getEnabledSummaries();
  if (summaries.length === 0) return [];

  return [
    {
      type: 'function',
      function: {
        name: 'activate_skill',
        description: '激活一个 Agent Skill，加载其完整指令到当前对话。当你判断需要使用某个技能来处理用户请求时调用。',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '要激活的技能名称' },
          },
          required: ['name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'read_skill_resource',
        description: '读取已激活 Agent Skill 中的参考文件或脚本内容',
        parameters: {
          type: 'object',
          properties: {
            skill_name: { type: 'string', description: '技能名称' },
            file_path: { type: 'string', description: '相对于 skill 根目录的路径，如 references/formulas.md' },
          },
          required: ['skill_name', 'file_path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'run_skill_script',
        description: '执行 Agent Skill 中的脚本文件。脚本在受限环境中运行，有超时限制。',
        parameters: {
          type: 'object',
          properties: {
            skill_name: { type: 'string', description: '技能名称' },
            script_path: { type: 'string', description: '相对于 skill 根目录的脚本路径，如 scripts/analyze.py' },
            args: { type: 'array', items: { type: 'string' }, description: '传给脚本的命令行参数' },
            stdin: { type: 'string', description: '传给脚本的标准输入' },
          },
          required: ['skill_name', 'script_path'],
        },
      },
    },
  ];
};

// 执行 Agent Skill 内置工具
const executeAgentSkillTool = async (
  name: string,
  argsJson: string,
): Promise<{ success: boolean; data: unknown; summary: string; preview?: { type: 'text'; content: string } }> => {
  try {
    const args = JSON.parse(argsJson);

    if (name === 'activate_skill') {
      const detail = agentSkillManager.getDetail(args.name);
      return {
        success: true,
        data: { name: detail.name, files: detail.files },
        summary: `已激活技能 "${detail.name}"，完整指令已加载`,
        preview: { type: 'text', content: detail.instructions },
      };
    }

    if (name === 'read_skill_resource') {
      const db = getDatabase();
      const row = db.prepare('SELECT path FROM agent_skills WHERE name = ?').get(args.skill_name) as { path: string } | undefined;
      if (!row) {
        return { success: false, data: null, summary: `Skill "${args.skill_name}" 不存在` };
      }
      const content = agentSkillLoader.readResource(row.path, args.file_path);
      return {
        success: true,
        data: content,
        summary: `已读取 ${args.skill_name}/${args.file_path}`,
        preview: { type: 'text', content: content.slice(0, 2000) },
      };
    }

    if (name === 'run_skill_script') {
      const result = await agentSkillExecutor.execute(
        args.skill_name,
        args.script_path,
        args.args || [],
        args.stdin,
      );
      const output = result.stdout + (result.stderr ? `\n[stderr] ${result.stderr}` : '');
      return {
        success: result.success,
        data: { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr },
        summary: result.success
          ? `脚本执行成功（exit code: ${result.exitCode}）`
          : `脚本执行失败（exit code: ${result.exitCode}）`,
        preview: { type: 'text', content: output.slice(0, 2000) },
      };
    }

    return { success: false, data: null, summary: `未知 Agent Skill 工具: ${name}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return { success: false, data: null, summary: `执行失败: ${msg}` };
  }
};

// ========== 核心对话循环（streamChat 和 headlessChat 共用） ==========

// 对话回调接口
export interface ChatCallbacks {
  onChunk?: (delta: string, done: boolean) => void;
  onToolCall?: (name: string, args: string) => void;
  onToolResult?: (name: string, summary: string, preview?: unknown) => void;
  onConfirmToolCall?: (id: string, name: string, description: string) => Promise<boolean>;
}

// 核心对话循环：消息管理 + LLM 调用 + 工具循环
export const executeChatLoop = async (
  conversationId: string,
  userContent: string,
  callbacks: ChatCallbacks,
  options?: { abortSignal?: AbortSignal; attachments?: FileAttachment[] },
): Promise<void> => {
  // 读取 LLM 配置
  const providerId = getConfig('llm.provider') || DEFAULT_PROVIDER;
  const apiKey = getConfig(`llm.apiKey.${providerId}`) || getConfig('llm.apiKey');
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }
  const providerConfig = providers[providerId] || providers[DEFAULT_PROVIDER];
  const model = getConfig('llm.model') || providerConfig.defaultModel;
  const baseURL = getBaseURL(providerId, apiKey);
  const workingDir = getConfig('workingDir');

  const db = getDatabase();

  // 保存用户消息到数据库（含附件元信息）
  const attachmentsMeta = options?.attachments && options.attachments.length > 0
    ? options.attachments.map(a => ({ name: a.name, size: a.size, mimeType: a.mimeType, category: a.category }))
    : undefined;
  saveMessage(conversationId, 'user', userContent, attachmentsMeta ? { attachments: attachmentsMeta } : undefined);

  // 更新会话的更新时间
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(Date.now(), conversationId);

  // 自动生成会话标题
  autoGenerateTitle(conversationId, userContent);

  // 从数据库加载历史消息（包含 metadata）
  const historyRows = db
    .prepare(
      'SELECT role, content, metadata FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    )
    .all(conversationId) as Array<{
      role: string;
      content: string;
      metadata: string | null;
    }>;

  // 裁剪消息上下文
  const trimmedRows =
    historyRows.length > MAX_CONTEXT_MESSAGES
      ? historyRows.slice(-MAX_CONTEXT_MESSAGES)
      : historyRows;

  // 构建消息上下文
  const finalSystemPrompt = buildSystemPrompt(workingDir);
  const contextMessages: ChatMessage[] = [
    { role: 'system', content: finalSystemPrompt },
  ];

  for (const row of trimmedRows) {
    const meta = row.metadata ? JSON.parse(row.metadata) : null;
    const msg: ChatMessage = {
      role: row.role as ChatMessage['role'],
      content: row.content,
    };
    if (meta?.toolCalls) msg.tool_calls = meta.toolCalls;
    if (meta?.toolCallId) msg.tool_call_id = meta.toolCallId;
    contextMessages.push(msg);
  }

  // 处理附件
  if (options?.attachments && options.attachments.length > 0) {
    const attachmentResult = await processAttachments(options.attachments);

    // 组装 content array 替换最后一条用户消息
    const lastMsg = contextMessages[contextMessages.length - 1];
    if (lastMsg.role === 'user') {
      const textContent = (typeof lastMsg.content === 'string' ? lastMsg.content : '') + attachmentResult.textContext;
      const parts: ContentPart[] = [
        ...attachmentResult.imageParts,
        { type: 'text', text: textContent },
      ];
      // 如果只有文本没有图片，保持 string 格式（兼容性更好）
      if (attachmentResult.imageParts.length > 0) {
        lastMsg.content = parts;
      } else if (attachmentResult.textContext) {
        lastMsg.content = textContent;
      }
    }

    // 如果有处理错误，通过 onChunk 通知前端
    if (attachmentResult.errors.length > 0) {
      callbacks.onChunk?.(`[附件处理警告: ${attachmentResult.errors.join('; ')}]\n`, false);
    }
  }

  // 获取工具定义（内置 + MCP + Agent Skill 工具）
  const builtinTools = skillManager.getToolDefinitions();
  const mcpTools = mcpManager.getAllToolDefinitions();
  const agentSkillTools = buildAgentSkillTools();
  const tools = [...builtinTools, ...mcpTools, ...agentSkillTools];

  // 创建 Provider
  const provider = createProvider(apiKey, baseURL, model);
  const abortSignal = options?.abortSignal;

  let toolRound = 0;

  // 工具调用循环
  while (toolRound <= MAX_TOOL_ROUNDS) {
    if (abortSignal?.aborted) break;

    let fullContent = '';
    let toolCalls: ToolCallData[] | undefined;

    // 流式调用 LLM
    for await (const chunk of provider.chat(
      { model, messages: contextMessages, tools: tools.length > 0 ? tools : undefined },
      abortSignal,
    )) {
      if (abortSignal?.aborted) break;

      fullContent += chunk.delta;

      if (chunk.toolCalls) {
        toolCalls = chunk.toolCalls;
      }

      // 发送流式内容
      if (chunk.delta || (chunk.done && !toolCalls)) {
        callbacks.onChunk?.(chunk.delta, chunk.done && !toolCalls);
      }

      if (chunk.done) break;
    }

    if (abortSignal?.aborted) {
      // 用户取消，保存已生成内容
      if (fullContent.length > 0) {
        saveMessage(conversationId, 'assistant', fullContent);
      }
      callbacks.onChunk?.('', true);
      break;
    }

    if (toolCalls && toolCalls.length > 0) {
      // LLM 请求调用工具
      // 保存 assistant 的 tool_calls 消息
      saveMessage(conversationId, 'assistant', fullContent || '', { toolCalls });
      contextMessages.push({
        role: 'assistant',
        content: fullContent || null,
        tool_calls: toolCalls,
      });

      // 执行每个工具调用
      for (const tc of toolCalls) {
        if (abortSignal?.aborted) break;

        // 通知工具调用
        callbacks.onToolCall?.(tc.function.name, tc.function.arguments);

        // 检查是否需要用户确认（内置危险操作、不信任的 MCP 工具、脚本执行）
        const needsConfirmation = tc.function.name === 'run_skill_script'
          ? true
          : isMcpTool(tc.function.name)
            ? !mcpManager.isToolTrusted(tc.function.name)
            : skillManager.isDangerous(tc.function.name);

        if (needsConfirmation && callbacks.onConfirmToolCall) {
          let argsDisplay = '';
          try {
            const parsed = JSON.parse(tc.function.arguments);
            argsDisplay = parsed.file_path || tc.function.arguments;
          } catch {
            argsDisplay = tc.function.arguments;
          }

          const approved = await callbacks.onConfirmToolCall(
            tc.id,
            tc.function.name,
            `AI 想要执行 ${tc.function.name}（${argsDisplay}）`,
          );

          if (!approved) {
            // 用户拒绝，将拒绝结果返回给 LLM
            const refusedResult = '用户拒绝了此操作';
            saveMessage(conversationId, 'tool', refusedResult, { toolCallId: tc.id, toolName: tc.function.name });
            contextMessages.push({
              role: 'tool',
              content: refusedResult,
              tool_call_id: tc.id,
            });
            callbacks.onToolResult?.(tc.function.name, refusedResult);
            continue;
          }
        }

        // 根据工具类型路由执行
        const result = isAgentSkillTool(tc.function.name)
          ? await executeAgentSkillTool(tc.function.name, tc.function.arguments)
          : isMcpTool(tc.function.name)
            ? await mcpManager.executeTool(tc.function.name, tc.function.arguments)
            : await skillManager.execute(tc.function.name, tc.function.arguments, workingDir || '', conversationId);

        // 保存 tool 结果消息
        const toolContent = result.success ? result.summary + '\n\n' + JSON.stringify(result.data) : result.summary;
        saveMessage(conversationId, 'tool', toolContent, {
          toolCallId: tc.id,
          toolName: tc.function.name,
          preview: result.preview,
        });

        contextMessages.push({
          role: 'tool',
          content: toolContent,
          tool_call_id: tc.id,
        });

        // 通知工具执行结果
        callbacks.onToolResult?.(tc.function.name, result.summary, result.preview);
      }

      toolRound++;
      // 继续循环，让 LLM 处理工具结果
    } else {
      // 普通文本响应，保存并结束
      if (fullContent.length > 0) {
        saveMessage(conversationId, 'assistant', fullContent);
      }
      break;
    }
  }

  // 达到最大工具调用轮次
  if (toolRound > MAX_TOOL_ROUNDS) {
    callbacks.onChunk?.('\n\n[已达到最大工具调用次数]', true);
    saveMessage(conversationId, 'assistant', '[已达到最大工具调用次数]');
  }
};

// ========== streamChat：IPC 版包装 ==========

// 处理一次流式对话（通过 IPC 事件桥接）
export const streamChat = async (
  conversationId: string,
  userContent: string,
  event: IpcMainEvent,
  attachments?: FileAttachment[],
): Promise<void> => {
  const abortController = new AbortController();
  currentAbortController = abortController;

  try {
    await executeChatLoop(conversationId, userContent, {
      onChunk: (delta, done) => {
        event.sender.send('chat:chunk', { delta, done });
      },
      onToolCall: (name, args) => {
        event.sender.send('chat:toolCall', { name, args });
      },
      onToolResult: (name, summary, preview) => {
        event.sender.send('chat:toolResult', { name, summary, preview });
      },
      onConfirmToolCall: (id, name, description) => {
        return new Promise((resolve) => {
          event.sender.send('chat:confirmToolCall', { id, name, description });
          const handler = (_e: Electron.IpcMainEvent, confirmId: string, approved: boolean) => {
            if (confirmId === id) {
              ipcMain.removeListener('chat:confirmToolCallResult', handler);
              resolve(approved);
            }
          };
          ipcMain.on('chat:confirmToolCallResult', handler);
        });
      },
    }, { abortSignal: abortController.signal, attachments });
  } catch (err: unknown) {
    if (!abortController.signal.aborted) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      event.sender.send('chat:error', errorMessage);
    } else {
      event.sender.send('chat:chunk', { delta: '', done: true });
    }
  }

  // 清理 AbortController
  if (currentAbortController === abortController) {
    currentAbortController = null;
  }
};
