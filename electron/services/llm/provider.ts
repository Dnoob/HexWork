// LLM Provider 抽象接口

// 工具调用
export interface ToolCallData {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

// 工具定义
export interface ToolDefinitionData {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// Content array 部件（OpenAI 兼容 vision 格式）
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

// 消息（支持工具调用）
export interface ChatMessage {
  role: MessageRole;
  content: string | ContentPart[] | null;
  // assistant 消息的工具调用
  tool_calls?: ToolCallData[];
  // tool 消息的调用 ID
  tool_call_id?: string;
}

// 对话请求参数
export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  // 工具定义
  tools?: ToolDefinitionData[];
  tool_choice?: 'auto' | 'none';
}

// 流式响应数据块
export interface ChatChunkData {
  delta: string;
  done: boolean;
  // 工具调用（在 done=true 时携带）
  toolCalls?: ToolCallData[];
}

// LLM Provider 接口，所有供应商实现此接口
export interface LLMProvider {
  chat(params: ChatParams, signal?: AbortSignal): AsyncIterable<ChatChunkData>;
}
