import { create } from 'zustand';
import { PlatformId, PlatformContent, StudioChunk } from '@/types';

interface ContentStudioState {
  // 输入
  topic: string;
  selectedAudience: string[];
  selectedStyle: string[];
  selectedScene: string[];

  // 生成状态
  generating: boolean;
  searchSummary: string;
  results: Partial<Record<PlatformId, PlatformContent>>;
  error: string | null;

  // 详情弹窗
  detailPlatform: PlatformId | null;

  // Actions
  setTopic: (topic: string) => void;
  toggleTag: (category: 'audience' | 'style' | 'scene', tag: string) => void;
  generate: () => void;
  stop: () => void;
  handleChunk: (chunk: StudioChunk) => void;
  setSearchSummary: (summary: string) => void;
  setError: (error: string | null) => void;
  setDone: () => void;
  openDetail: (platform: PlatformId) => void;
  closeDetail: () => void;
  reset: () => void;
}

export const useContentStudioStore = create<ContentStudioState>((set, get) => ({
  topic: '',
  selectedAudience: [],
  selectedStyle: [],
  selectedScene: [],
  generating: false,
  searchSummary: '',
  results: {},
  error: null,
  detailPlatform: null,

  setTopic: (topic) => set({ topic }),

  toggleTag: (category, tag) => {
    const key = category === 'audience' ? 'selectedAudience'
      : category === 'style' ? 'selectedStyle' : 'selectedScene';
    const current = get()[key];
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    set({ [key]: next });
  },

  generate: () => {
    const { topic, selectedAudience, selectedStyle, selectedScene } = get();
    if (!topic.trim()) return;

    set({
      generating: true,
      results: {},
      error: null,
      searchSummary: '',
    });

    window.api.studio.generate({
      topic: topic.trim(),
      audience: selectedAudience,
      style: selectedStyle,
      scene: selectedScene,
    });
  },

  stop: () => {
    window.api.studio.stop();
    set({ generating: false });
  },

  handleChunk: (chunk) => {
    set((state) => {
      const prev = state.results[chunk.platform] || { platform: chunk.platform, title: '', content: '', tags: [] };
      const updated = { ...prev, ...chunk.content };
      return { results: { ...state.results, [chunk.platform]: updated } };
    });
  },

  setSearchSummary: (summary) => set({ searchSummary: summary }),
  setError: (error) => set({ error, generating: false }),
  setDone: () => set({ generating: false }),

  openDetail: (platform) => set({ detailPlatform: platform }),
  closeDetail: () => set({ detailPlatform: null }),

  reset: () => set({
    topic: '',
    selectedAudience: [],
    selectedStyle: [],
    selectedScene: [],
    generating: false,
    searchSummary: '',
    results: {},
    error: null,
    detailPlatform: null,
  }),
}));
