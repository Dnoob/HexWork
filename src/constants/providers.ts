// Key 前缀匹配模式
export interface KeyPattern {
  prefix: string;
  type: string;
  baseURL: string;
}

// 服务商配置
export interface ProviderConfig {
  name: string;
  enabled?: boolean;          // 默认 true，设为 false 则 UI 中隐藏
  keyPatterns: KeyPattern[];  // 长前缀优先排列
  models: string[];
  defaultModel: string;
}

// 服务商注册表
export const providers: Record<string, ProviderConfig> = {
  minimax: {
    name: 'MiniMax',
    keyPatterns: [
      { prefix: 'sk-cp-', type: 'Coding Plan', baseURL: 'https://api.minimaxi.com/v1' },
      { prefix: 'sk-api-', type: '按量付费', baseURL: 'https://api.minimaxi.com/v1' },
    ],
    models: ['MiniMax-M2.5'],
    defaultModel: 'MiniMax-M2.5',
  },
  kimi: {
    name: 'Kimi',
    enabled: false,
    keyPatterns: [
      { prefix: 'sk-kimi-', type: 'Kimi Code', baseURL: 'https://api.kimi.com/coding/' },
      { prefix: 'sk-', type: '按量付费', baseURL: 'https://api.moonshot.cn/v1' },
    ],
    models: ['kimi-k2.5', 'moonshot-v1-auto', 'moonshot-v1-128k'],
    defaultModel: 'kimi-k2.5',
  },
  glm: {
    name: 'GLM',
    enabled: false,
    keyPatterns: [
      { prefix: 'sk-sp-', type: 'GLM Coding Plan', baseURL: 'https://open.bigmodel.cn/api/coding/paas/v4' },
      { prefix: 'sk-', type: '按量付费', baseURL: 'https://open.bigmodel.cn/api/paas/v4/' },
    ],
    models: ['glm-5', 'glm-4-plus', 'glm-4-flash'],
    defaultModel: 'glm-5',
  },
};

export const DEFAULT_PROVIDER = 'minimax';

// 根据 API Key 前缀识别 key 类型
export const detectKeyType = (providerId: string, apiKey: string): KeyPattern | null => {
  const provider = providers[providerId];
  if (!provider || !apiKey) return null;
  for (const pattern of provider.keyPatterns) {
    if (apiKey.startsWith(pattern.prefix)) {
      return pattern;
    }
  }
  return null;
};

// 根据服务商和 API Key 获取 base URL
export const getBaseURL = (providerId: string, apiKey: string): string => {
  const pattern = detectKeyType(providerId, apiKey);
  if (pattern) return pattern.baseURL;
  const provider = providers[providerId];
  if (!provider) return providers[DEFAULT_PROVIDER].keyPatterns[0].baseURL;
  return provider.keyPatterns[provider.keyPatterns.length - 1].baseURL;
};
