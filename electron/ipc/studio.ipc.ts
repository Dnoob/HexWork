import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { generateContent } from '../services/contentStudio/generator';
import { setConfig } from '../services/config';

let currentAbortController: AbortController | null = null;

export const registerStudioIPC = (): void => {
  // 开始生成
  ipcMain.on('studio:generate', (event: IpcMainEvent, params: {
    topic: string;
    audience: string[];
    style: string[];
    scene: string[];
  }) => {
    // 取消之前的生成
    if (currentAbortController) {
      currentAbortController.abort();
    }
    const abortController = new AbortController();
    currentAbortController = abortController;

    generateContent(
      params.topic,
      params.audience,
      params.style,
      params.scene,
      {
        onSearchDone: (summary) => {
          event.sender.send('studio:searchDone', summary);
        },
        onPlatformContent: (platform, content) => {
          event.sender.send('studio:chunk', {
            platform,
            content,
            done: true,
          });
        },
        onError: (error) => {
          event.sender.send('studio:error', error);
        },
        onDone: () => {
          event.sender.send('studio:done');
          if (currentAbortController === abortController) {
            currentAbortController = null;
          }
        },
      },
      abortController.signal,
    ).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : '未知错误';
      event.sender.send('studio:error', msg);
    });
  });

  // 停止生成
  ipcMain.on('studio:stop', () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
  });

  // 测试并保存 Tavily API Key
  ipcMain.handle('studio:testTavily', async (_event: IpcMainInvokeEvent, apiKey: string) => {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: 'test',
          max_results: 1,
          search_depth: 'basic',
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `HTTP ${res.status}: ${text.slice(0, 100)}` };
      }
      // 验证通过，保存
      setConfig('tavily.apiKey', apiKey);
      return { success: true, message: '连接成功' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      return { success: false, message: msg };
    }
  });

};
