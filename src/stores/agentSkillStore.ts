import { create } from 'zustand';
import type { AgentSkillMeta, AgentSkillFull } from '../types';

interface AgentSkillState {
  skills: AgentSkillMeta[];
  loading: boolean;
  error: string | null;

  // 操作
  loadSkills: () => Promise<void>;
  installLocal: (sourcePath: string) => Promise<void>;
  installGit: (url: string) => Promise<void>;
  installClawHub: (slug: string, author: string) => Promise<void>;
  uninstall: (name: string) => Promise<void>;
  toggle: (name: string, enabled: boolean) => Promise<void>;
  update: (name: string) => Promise<void>;
  create: (name: string, description: string, options: { scripts?: boolean; references?: boolean; assets?: boolean }) => Promise<void>;
  getDetail: (name: string) => Promise<AgentSkillFull>;
}

export const useAgentSkillStore = create<AgentSkillState>((set, get) => ({
  skills: [],
  loading: false,
  error: null,

  loadSkills: async () => {
    set({ loading: true, error: null });
    try {
      const skills = await window.api.skill.list();
      set({ skills, loading: false });
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '加载失败' });
    }
  },

  installLocal: async (sourcePath: string) => {
    set({ error: null });
    try {
      await window.api.skill.installLocal(sourcePath);
      await get().loadSkills();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '安装失败';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  installGit: async (url: string) => {
    set({ error: null });
    try {
      await window.api.skill.installGit(url);
      await get().loadSkills();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '安装失败';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  installClawHub: async (slug: string, author: string) => {
    set({ error: null });
    try {
      await window.api.skill.installClawHub(slug, author);
      await get().loadSkills();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '安装失败';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  uninstall: async (name: string) => {
    try {
      await window.api.skill.uninstall(name);
      await get().loadSkills();
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : '卸载失败' });
    }
  },

  toggle: async (name: string, enabled: boolean) => {
    try {
      await window.api.skill.toggle(name, enabled);
      // 乐观更新
      set(state => ({
        skills: state.skills.map(s => s.name === name ? { ...s, enabled } : s),
      }));
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : '操作失败' });
      await get().loadSkills();
    }
  },

  update: async (name: string) => {
    try {
      await window.api.skill.update(name);
      await get().loadSkills();
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : '更新失败' });
    }
  },

  create: async (name: string, description: string, options) => {
    set({ error: null });
    try {
      await window.api.skill.create(name, description, options);
      await get().loadSkills();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建失败';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  getDetail: async (name: string) => {
    return window.api.skill.detail(name);
  },
}));
