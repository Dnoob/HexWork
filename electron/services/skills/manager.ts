// 技能管理器：注册、查找、执行技能
import path from 'path';
import crypto from 'crypto';
import { getDatabase } from '../db';
import { Skill, SkillExecuteResult } from './base';

class SkillManager {
  private skills = new Map<string, Skill>();

  // 注册技能
  register(skill: Skill): void {
    this.skills.set(skill.definition.name, skill);
  }

  // 获取所有工具定义（OpenAI function calling 格式）
  getToolDefinitions(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return Array.from(this.skills.values()).map(skill => ({
      type: 'function' as const,
      function: {
        name: skill.definition.name,
        description: skill.definition.description,
        parameters: skill.definition.parameters,
      },
    }));
  }

  // 检查技能是否为危险操作
  isDangerous(name: string): boolean {
    const skill = this.skills.get(name);
    return skill?.definition.dangerous ?? false;
  }

  // 校验路径安全性：确保目标路径在工作目录内
  validatePath(filePath: string, workingDir: string): string {
    const resolved = path.resolve(workingDir, filePath);
    const normalizedWorkDir = path.resolve(workingDir);
    if (!resolved.startsWith(normalizedWorkDir + path.sep) && resolved !== normalizedWorkDir) {
      throw new Error(`路径安全检查失败：${filePath} 不在工作目录 ${workingDir} 内`);
    }
    return resolved;
  }

  // 执行技能
  async execute(
    name: string,
    argsJson: string,
    workingDir: string,
    conversationId?: string,
  ): Promise<SkillExecuteResult> {
    const skill = this.skills.get(name);
    if (!skill) {
      return { success: false, data: null, summary: `未知技能: ${name}` };
    }

    // 非浏览器技能需要工作目录
    if (!workingDir && !name.startsWith('browser_')) {
      return { success: false, data: null, summary: '请先在设置中配置工作目录后再使用文件操作' };
    }

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsJson);
    } catch {
      return { success: false, data: null, summary: `参数解析失败: ${argsJson}` };
    }

    const logId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      const result = await skill.execute(args, workingDir);
      // 记录操作日志
      this.logOperation(logId, conversationId, name, argsJson, result.summary, result.success ? 'success' : 'failed', startTime);
      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      this.logOperation(logId, conversationId, name, argsJson, errorMsg, 'error', startTime);
      return { success: false, data: null, summary: `执行失败: ${errorMsg}` };
    }
  }

  // 记录操作日志
  private logOperation(
    id: string,
    conversationId: string | undefined,
    skillName: string,
    args: string,
    result: string,
    status: string,
    createdAt: number,
  ): void {
    try {
      const db = getDatabase();
      db.prepare(
        'INSERT INTO operation_log (id, conversation_id, skill_name, arguments, result, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(id, conversationId ?? null, skillName, args, result, status, createdAt);
    } catch {
      // 日志记录失败不影响主流程
    }
  }
}

// 单例导出
export const skillManager = new SkillManager();
