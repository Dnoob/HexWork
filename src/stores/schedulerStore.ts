import { create } from 'zustand';
import { ScheduledTask, TaskRun, CreateTaskParams, UpdateTaskParams } from '../types';

interface SchedulerState {
  tasks: ScheduledTask[];
  loading: boolean;
  // 当前查看历史的任务
  historyTaskId: string | null;
  historyRuns: TaskRun[];
  historyLoading: boolean;
  // 表单状态
  showForm: boolean;
  editingTask: ScheduledTask | null;

  loadTasks: () => Promise<void>;
  createTask: (params: CreateTaskParams) => Promise<void>;
  updateTask: (id: string, params: UpdateTaskParams) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string, enabled: boolean) => Promise<void>;
  runNow: (id: string) => Promise<void>;
  loadHistory: (taskId: string) => Promise<void>;
  closeHistory: () => void;
  openForm: (task?: ScheduledTask) => void;
  closeForm: () => void;
}

export const useSchedulerStore = create<SchedulerState>((set, get) => ({
  tasks: [],
  loading: false,
  historyTaskId: null,
  historyRuns: [],
  historyLoading: false,
  showForm: false,
  editingTask: null,

  loadTasks: async () => {
    set({ loading: true });
    try {
      const tasks = await window.api.scheduler.list();
      set({ tasks });
    } catch (err) {
      console.error('加载定时任务失败:', err);
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (params) => {
    await window.api.scheduler.create(params);
    await get().loadTasks();
    set({ showForm: false, editingTask: null });
  },

  updateTask: async (id, params) => {
    await window.api.scheduler.update(id, params);
    await get().loadTasks();
    set({ showForm: false, editingTask: null });
  },

  deleteTask: async (id) => {
    await window.api.scheduler.delete(id);
    await get().loadTasks();
  },

  toggleTask: async (id, enabled) => {
    await window.api.scheduler.toggle(id, enabled);
    await get().loadTasks();
  },

  runNow: async (id) => {
    await window.api.scheduler.runNow(id);
    await get().loadTasks();
  },

  loadHistory: async (taskId) => {
    set({ historyTaskId: taskId, historyLoading: true });
    try {
      const historyRuns = await window.api.scheduler.history(taskId);
      set({ historyRuns });
    } catch (err) {
      console.error('加载执行历史失败:', err);
    } finally {
      set({ historyLoading: false });
    }
  },

  closeHistory: () => {
    set({ historyTaskId: null, historyRuns: [] });
  },

  openForm: (task) => {
    set({ showForm: true, editingTask: task || null });
  },

  closeForm: () => {
    set({ showForm: false, editingTask: null });
  },
}));
