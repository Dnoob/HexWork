import { getConfig } from '../config';
import { OpenAICompatibleProvider } from '../llm/openaiCompatible';
import { providers, DEFAULT_PROVIDER, getBaseURL } from '../llm/providers';
import { searchTopic } from './search';
import { buildPlatformPrompt } from './prompts';

// 平台 ID 列表
const PLATFORM_IDS = ['xiaohongshu', 'douyin', 'weibo', 'wechat', 'bilibili', 'zhihu'] as const;

export interface GenerateCallbacks {
  onSearchDone: (summary: string) => void;
  onPlatformContent: (platform: string, content: { title: string; content: string; tags: string[]; extra?: Record<string, string> }) => void;
  onError: (error: string) => void;
  onDone: () => void;
}

export const generateContent = async (
  topic: string,
  audience: string[],
  style: string[],
  scene: string[],
  callbacks: GenerateCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> => {
  // 读取 LLM 配置
  const providerId = getConfig('llm.provider') || DEFAULT_PROVIDER;
  const apiKey = getConfig(`llm.apiKey.${providerId}`) || getConfig('llm.apiKey');
  if (!apiKey) {
    callbacks.onError('请先在设置中配置 API Key');
    return;
  }
  const providerConfig = providers[providerId] || providers[DEFAULT_PROVIDER];
  const model = getConfig('llm.model') || providerConfig.defaultModel;
  const baseURL = getBaseURL(providerId, apiKey);

  // Step 1: 联网搜索（只搜一次）
  let searchContext = '';
  try {
    searchContext = await searchTopic(topic);
    const resultCount = (searchContext.match(/^### /gm) || []).length;
    const hasAnswer = searchContext.includes('## AI 摘要');
    const summary = resultCount > 0
      ? `已搜索到 ${resultCount} 条结果${hasAnswer ? '，含 AI 摘要' : ''}，正在并行生成 6 个平台内容...`
      : '搜索完成，正在并行生成 6 个平台内容...';
    callbacks.onSearchDone(summary);
  } catch {
    searchContext = '（搜索跳过）';
    callbacks.onSearchDone('跳过搜索，正在并行生成 6 个平台内容...');
  }

  if (abortSignal?.aborted) return;

  // Step 2: 并行生成 6 个平台
  const tasks = PLATFORM_IDS.map(platformId =>
    generateSinglePlatform(platformId, topic, searchContext, audience, style, scene, apiKey, baseURL, model, callbacks, abortSignal)
  );

  // 等待全部完成（每个任务独立处理错误，不会互相影响）
  await Promise.allSettled(tasks);

  if (!abortSignal?.aborted) {
    callbacks.onDone();
  }
};

// 单个平台的生成任务
const generateSinglePlatform = async (
  platformId: string,
  topic: string,
  searchContext: string,
  audience: string[],
  style: string[],
  scene: string[],
  apiKey: string,
  baseURL: string,
  model: string,
  callbacks: GenerateCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> => {
  const systemPrompt = buildPlatformPrompt(platformId, searchContext, audience, style, scene);
  const provider = new OpenAICompatibleProvider(apiKey, baseURL, model);
  let fullContent = '';

  try {
    for await (const chunk of provider.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请为以下主题创作内容：\n\n${topic}` },
      ],
      temperature: 0.8,
    }, abortSignal)) {
      if (abortSignal?.aborted) return;
      fullContent += chunk.delta;
      if (chunk.done) break;
    }

    // 解析结果
    const parsed = parseResponse(fullContent);
    if (parsed) {
      callbacks.onPlatformContent(platformId, parsed);
    }
  } catch (err: unknown) {
    if (!abortSignal?.aborted) {
      const msg = err instanceof Error ? err.message : '未知错误';
      console.error(`[studio] ${platformId} 生成失败:`, msg);
      // 单个平台失败不阻断整体，用空内容占位让前端知道失败了
      callbacks.onPlatformContent(platformId, {
        title: '生成失败',
        content: `该平台内容生成出错: ${msg}`,
        tags: [],
      });
    }
  }
};

// 尝试解析 JSON，支持多种容错
const tryParseJSON = (text: string): { title: string; content: string; tags: string[]; extra?: Record<string, string> } | null => {
  // 候选文本：依次尝试不同的提取方式
  const candidates: (string | undefined | null)[] = [
    // 1. 直接尝试
    text.trim(),
    // 2. 从 markdown 代码块中提取
    text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1],
    // 3. 提取第一个 { 到最后一个 } 之间的内容（处理 LLM 在 JSON 前后加了多余文本）
    (() => {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      return start !== -1 && end > start ? text.slice(start, end + 1) : null;
    })(),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    // 先直接解析
    try {
      const parsed = JSON.parse(raw);
      if (parsed.title && parsed.content) return parsed;
    } catch { /* 继续 */ }
    // 修复非法转义序列后重试（LLM 可能生成 \提 \去 等非法转义）
    try {
      const fixed = raw.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      const parsed = JSON.parse(fixed);
      if (parsed.title && parsed.content) return parsed;
    } catch { /* 继续 */ }
  }
  return null;
};

// 解析 LLM 返回的 JSON
const parseResponse = (raw: string): { title: string; content: string; tags: string[]; extra?: Record<string, string> } | null => {
  // 剥离 <think>...</think> 思考标签（部分模型会输出）
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>\s*/g, '');

  const parsed = tryParseJSON(stripped);
  if (parsed) {
    return {
      title: parsed.title,
      content: parsed.content,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      extra: parsed.extra,
    };
  }

  // 兜底：如果不是 JSON，把整个文本当 content
  const fallback = stripped.trim();
  if (fallback.length > 20) {
    const lines = fallback.split('\n');
    return {
      title: lines[0].slice(0, 50),
      content: fallback,
      tags: [],
    };
  }

  return null;
};
