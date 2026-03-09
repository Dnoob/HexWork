import { useState } from 'react';
import { Message, TablePreview } from '@/types';
import { DataTable } from './DataTable';
import { CheckCircle2, Loader2, ChevronRight, ChevronDown } from 'lucide-react';

// 工具名称友好显示
const toolNameMap: Record<string, string> = {
  read_file: '读取文件',
  write_file: '写入文件',
  list_directory: '列出目录',
  read_csv: '读取 CSV',
  write_csv: '写入 CSV',
  list_excel_sheets: '查看工作表',
  read_excel: '读取 Excel',
  write_excel: '写入 Excel',
  read_word: '读取 Word',
  write_word: '写入 Word',
  read_pdf: '读取 PDF',
  browser_navigate: '打开网页',
  browser_act: '执行操作',
  browser_extract: '提取数据',
  browser_observe: '分析页面',
  browser_screenshot: '页面截图',
  browser_close: '关闭浏览器',
  activate_skill: '激活技能',
  read_skill_resource: '读取技能资源',
  run_skill_script: '执行技能脚本',
};

// 解析 MCP 工具显示名
const getMcpDisplayName = (name: string): string => {
  const rest = name.substring(4);
  const firstUnderscore = rest.indexOf('_');
  const serverName = firstUnderscore > 0 ? rest.substring(0, firstUnderscore) : rest;
  const toolName = firstUnderscore > 0 ? rest.substring(firstUnderscore + 1) : '';
  return toolName ? `[${serverName}] ${toolName}` : `[${serverName}]`;
};

const getDisplayName = (name: string): string => {
  if (name.startsWith('mcp_')) return getMcpDisplayName(name);
  return toolNameMap[name] || name;
};

// 从 tool 消息的 steps 中提取工具调用步骤
interface ToolStep {
  id: string;
  name: string;
  displayName: string;
  args: string;
  completed: boolean;
  resultMessage?: Message;  // 对应的 tool 结果消息
}

const extractSteps = (stepMessages: Message[]): ToolStep[] => {
  const steps: ToolStep[] = [];
  const resultMap = new Map<string, Message>();

  // 先收集所有 tool 结果
  for (const msg of stepMessages) {
    if (msg.role === 'tool' && msg.toolCallId) {
      resultMap.set(msg.toolCallId, msg);
    }
  }

  // 再从 assistant toolCalls 中提取步骤
  for (const msg of stepMessages) {
    if (msg.role === 'assistant' && msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        let argsDisplay = '';
        try {
          const parsed = JSON.parse(tc.function.arguments);
          argsDisplay = parsed.file_path || parsed.url || parsed.instruction || parsed.key || parsed.name || '';
        } catch {
          argsDisplay = tc.function.arguments;
        }

        steps.push({
          id: tc.id,
          name: tc.function.name,
          displayName: getDisplayName(tc.function.name),
          args: argsDisplay,
          completed: resultMap.has(tc.id),
          resultMessage: resultMap.get(tc.id),
        });
      }
    }
  }

  return steps;
};

// 单步结果预览
const StepPreview = ({ message }: { message: Message }) => {
  if (!message.preview) {
    return <p className="text-xs text-muted-foreground mt-1 break-all">{message.content}</p>;
  }

  if (message.preview.type === 'table') {
    return (
      <div className="mt-1">
        <DataTable data={message.preview.content as TablePreview} />
      </div>
    );
  }

  if (message.preview.type === 'text') {
    const text = String(message.preview.content);
    return (
      <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-1 max-h-[200px] overflow-auto whitespace-pre-wrap border border-border">
        {text.slice(0, 2000)}
        {text.length > 2000 && '\n...（内容已截断）'}
      </pre>
    );
  }

  if (message.preview.type === 'screenshot') {
    return (
      <div className="mt-1">
        <img
          src={`data:image/png;base64,${message.preview.content}`}
          alt="页面截图"
          className="rounded border border-border max-w-full max-h-[300px] object-contain"
        />
      </div>
    );
  }

  return null;
};

interface StepsSectionProps {
  steps: Message[];
  isStreaming?: boolean;
}

export const StepsSection = ({ steps, isStreaming }: StepsSectionProps) => {
  // hooks 必须在条件返回之前调用
  const [expanded, setExpanded] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const toolSteps = extractSteps(steps);
  if (toolSteps.length === 0) return null;

  const allCompleted = toolSteps.every(s => s.completed);
  const completedCount = toolSteps.filter(s => s.completed).length;

  const shouldExpand = expanded || (isStreaming && !allCompleted);

  // 摘要文本：取前 3 个工具名
  const summaryNames = toolSteps.slice(0, 3).map(s => s.displayName).join('、');
  const moreCount = toolSteps.length > 3 ? toolSteps.length - 3 : 0;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {shouldExpand
          ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        }
        <span>
          {allCompleted
            ? `执行了 ${toolSteps.length} 个步骤`
            : `正在执行... (${completedCount}/${toolSteps.length})`
          }
        </span>
        {!shouldExpand && (
          <span className="text-muted-foreground/60 truncate">
            — {summaryNames}{moreCount > 0 ? ` 等 ${moreCount} 项` : ''}
          </span>
        )}
        {allCompleted && !shouldExpand && (
          <CheckCircle2 className="h-3 w-3 text-accent-green flex-shrink-0" />
        )}
      </button>

      {shouldExpand && (
        <div className="mt-1.5 ml-1 border-l-2 border-border pl-3 space-y-0.5">
          {toolSteps.map(step => (
            <div key={step.id}>
              <button
                onClick={() => setExpandedStepId(expandedStepId === step.id ? null : step.id)}
                className="flex items-center gap-2 text-xs py-0.5 w-full hover:text-foreground transition-colors"
              >
                {step.completed
                  ? <CheckCircle2 className="h-3 w-3 text-accent-green flex-shrink-0" />
                  : <Loader2 className="h-3 w-3 text-accent-blue animate-spin flex-shrink-0" />
                }
                <span className="font-medium">{step.displayName}</span>
                {step.args && (
                  <span className="text-muted-foreground truncate">{step.args}</span>
                )}
              </button>
              {/* 展开的结果预览 */}
              {expandedStepId === step.id && step.resultMessage && (
                <div className="ml-5 mb-1">
                  <StepPreview message={step.resultMessage} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
