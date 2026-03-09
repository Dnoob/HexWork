// Agent Skill 脚本执行器：在受限子进程中运行脚本
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getSkillsDir } from './loader';
import { getDatabase } from '../../db';

// 脚本执行结果
export interface ScriptResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

// 默认超时 30 秒
const DEFAULT_TIMEOUT = 30000;

// 根据文件扩展名选择解释器
const getInterpreter = (scriptPath: string): string | null => {
  const ext = path.extname(scriptPath).toLowerCase();
  switch (ext) {
    case '.py': return 'python3';
    case '.js': return 'node';
    case '.ts': return 'npx';
    case '.sh': return 'bash';
    case '.rb': return 'ruby';
    default: return null;
  }
};

// 获取解释器参数
const getInterpreterArgs = (scriptPath: string): string[] => {
  const ext = path.extname(scriptPath).toLowerCase();
  if (ext === '.ts') return ['tsx', scriptPath];
  return [scriptPath];
};

class AgentSkillExecutor {
  // 执行 skill 中的脚本
  async execute(
    skillName: string,
    scriptPath: string,
    args: string[] = [],
    stdin?: string,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<ScriptResult> {
    // 查找 skill
    const db = getDatabase();
    const row = db.prepare('SELECT path FROM agent_skills WHERE name = ?').get(skillName) as { path: string } | undefined;
    if (!row) {
      return { success: false, stdout: '', stderr: `Skill "${skillName}" 不存在`, exitCode: null };
    }

    const skillDir = row.path;

    // 安全检查：脚本必须在 skill 的 scripts/ 目录内
    const resolvedScript = path.resolve(skillDir, scriptPath);
    const scriptsDir = path.resolve(skillDir, 'scripts');
    if (!resolvedScript.startsWith(scriptsDir + path.sep) && resolvedScript !== scriptsDir) {
      return { success: false, stdout: '', stderr: `脚本必须位于 scripts/ 目录内: ${scriptPath}`, exitCode: null };
    }

    if (!fs.existsSync(resolvedScript)) {
      return { success: false, stdout: '', stderr: `脚本文件不存在: ${scriptPath}`, exitCode: null };
    }

    // 选择解释器
    const interpreter = getInterpreter(resolvedScript);
    if (!interpreter) {
      return { success: false, stdout: '', stderr: `不支持的脚本类型: ${path.extname(resolvedScript)}`, exitCode: null };
    }

    const interpreterArgs = getInterpreterArgs(resolvedScript);

    return new Promise((resolve) => {
      const proc = spawn(interpreter, [...interpreterArgs, ...args], {
        cwd: skillDir,
        timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          SKILL_DIR: skillDir,
          SKILLS_ROOT: getSkillsDir(),
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        // 限制输出大小（最多 1MB）
        if (stdout.length > 1024 * 1024) {
          proc.kill();
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        if (stderr.length > 1024 * 1024) {
          proc.kill();
        }
      });

      // 写入 stdin
      if (stdin) {
        proc.stdin.write(stdin);
      }
      proc.stdin.end();

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.slice(0, 100000), // 截断到 100KB
          stderr: stderr.slice(0, 100000),
          exitCode: code,
        });
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          stdout,
          stderr: err.message,
          exitCode: null,
        });
      });
    });
  }
}

export const agentSkillExecutor = new AgentSkillExecutor();
