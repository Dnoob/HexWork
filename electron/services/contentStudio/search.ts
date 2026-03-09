import { getConfig } from '../config';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

// 调用 Tavily Search API 搜索主题相关信息
export const searchTopic = async (query: string): Promise<string> => {
  const apiKey = getConfig('tavily.apiKey');
  if (!apiKey) {
    return '（未配置 Tavily API Key，跳过联网搜索）';
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        search_depth: 'basic',
        include_answer: true,
      }),
    });

    if (!res.ok) {
      return `（搜索失败: HTTP ${res.status}）`;
    }

    const data = await res.json() as TavilyResponse & { answer?: string };

    // 组装搜索摘要
    let summary = '';
    if (data.answer) {
      summary += `## AI 摘要\n${data.answer}\n\n`;
    }
    if (data.results && data.results.length > 0) {
      summary += '## 搜索结果\n';
      for (const r of data.results) {
        summary += `### ${r.title}\n${r.content}\n来源: ${r.url}\n\n`;
      }
    }

    return summary || '（未找到相关信息）';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return `（搜索出错: ${msg}）`;
  }
};
