import { create } from 'zustand';

type ConfigField = 'provider' | 'apiKey' | 'model' | 'workingDir';

interface ConfigState {
  provider: string;
  apiKey: string;
  model: string;
  workingDir: string;
  loaded: boolean;

  loadConfig: () => Promise<void>;
  saveConfig: (key: string, value: string) => Promise<void>;
  setField: (field: ConfigField, value: string) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  provider: 'minimax',
  apiKey: '',
  model: 'MiniMax-M2.5',
  workingDir: '',
  loaded: false,

  loadConfig: async () => {
    const provider = await window.api.config.get('llm.provider') || 'minimax';
    // 优先读取按服务商存储的 Key，兼容旧的全局 Key
    const apiKey = await window.api.config.get(`llm.apiKey.${provider}`)
      || await window.api.config.get('llm.apiKey')
      || '';
    const model = await window.api.config.get('llm.model') || 'MiniMax-M2.5';
    const workingDir = await window.api.config.get('workingDir') || '';
    set({ provider, apiKey, model, workingDir, loaded: true });
  },

  saveConfig: async (key: string, value: string) => {
    await window.api.config.set(key, value);
  },

  setField: (field, value) => {
    set({ [field]: value } as Pick<ConfigState, ConfigField>);
  },
}));
