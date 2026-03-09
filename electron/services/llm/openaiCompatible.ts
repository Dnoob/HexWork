import OpenAI from 'openai';
import { LLMProvider, ChatParams, ChatChunkData, ToolCallData } from './provider';

// 通用 OpenAI 兼容 Provider，支持 MiniMax / Kimi / GLM 等服务商
export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL: string, model: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async *chat(params: ChatParams, signal?: AbortSignal): AsyncIterable<ChatChunkData> {
    // 构建消息（兼容 tool 角色）
    const messages = params.messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content || '',
          tool_call_id: m.tool_call_id || '',
        };
      }
      if (m.role === 'assistant' && m.tool_calls) {
        return {
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        };
      }
      if (m.role === 'user' && Array.isArray(m.content)) {
        return {
          role: 'user' as const,
          content: m.content as OpenAI.Chat.Completions.ChatCompletionContentPart[],
        };
      }
      return {
        role: m.role as 'user' | 'assistant' | 'system',
        content: (m.content as string) || '',
      };
    });

    // 构建请求参数
    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: params.model || this.model,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      stream: true,
    };

    // 添加工具定义
    if (params.tools && params.tools.length > 0) {
      requestParams.tools = params.tools.map(t => ({
        type: 'function' as const,
        function: t.function,
      }));
      requestParams.tool_choice = params.tool_choice ?? 'auto';
    }

    const stream = await this.client.chat.completions.create(requestParams, { signal });

    // 累积工具调用数据（可能跨多个 chunk 分片发送）
    const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
    let hasToolCalls = false;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;
      const textDelta = delta?.content || '';
      const finishReason = choice.finish_reason;

      // 累积工具调用分片
      if (delta?.tool_calls) {
        hasToolCalls = true;
        for (const tc of delta.tool_calls) {
          const existing = toolCallsMap.get(tc.index);
          if (existing) {
            // 追加参数片段
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
            }
          } else {
            toolCallsMap.set(tc.index, {
              id: tc.id || '',
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '',
            });
          }
        }
      }

      // finish_reason 为 'stop' 或 'tool_calls' 等字符串时表示结束
      const done = typeof finishReason === 'string';

      if (done) {
        // 最终 chunk：组装工具调用结果
        const toolCalls: ToolCallData[] | undefined = hasToolCalls
          ? Array.from(toolCallsMap.values()).map(tc => ({
              id: tc.id,
              function: { name: tc.name, arguments: tc.arguments },
            }))
          : undefined;

        yield { delta: textDelta, done: true, toolCalls };
      } else if (textDelta) {
        yield { delta: textDelta, done: false };
      }
    }
  }
}
