// 技能系统基础定义

// 技能定义
export interface SkillDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  // 是否为危险操作（需用户确认）
  dangerous?: boolean;
}

// 技能执行结果
export interface SkillExecuteResult {
  success: boolean;
  data: unknown;
  // 人类可读的摘要
  summary: string;
  // 可选：预览数据
  preview?: {
    type: 'table' | 'text' | 'diff' | 'file-info' | 'screenshot';
    content: unknown;
  };
}

// 技能接口
export interface Skill {
  definition: SkillDefinition;
  execute(args: Record<string, unknown>, workingDir: string): Promise<SkillExecuteResult>;
}
