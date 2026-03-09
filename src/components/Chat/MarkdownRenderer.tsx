import { useState, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

// 代码块顶部栏：语言标签 + 复制按钮
const CodeBlockHeader = ({ language, code }: { language: string; code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between bg-[#282c34] text-muted-foreground px-3 py-1.5 rounded-t-lg text-xs">
      <span>{language}</span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <div className="message-content text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }: { children?: ReactNode }) {
            return <>{children}</>;
          },
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            if (match) {
              return (
                <div className="my-3 rounded-lg overflow-hidden border border-border">
                  <CodeBlockHeader language={match[1]} code={codeString} />
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ margin: 0, borderRadius: 0 }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return (
              <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[13px]">
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full text-sm border-collapse border border-border rounded">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-3 py-1.5 text-left font-semibold text-foreground border border-border text-xs">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3 py-1.5 text-muted-foreground border border-border text-xs">
                {children}
              </td>
            );
          },
          tr({ children }) {
            return <tr className="even:bg-muted/50">{children}</tr>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-3 border-primary/40 bg-muted/30 pl-3 py-1 my-2 text-muted-foreground italic">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
