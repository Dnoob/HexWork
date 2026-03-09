import { useState, useRef, KeyboardEvent, DragEvent, ClipboardEvent } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useConfigStore } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { FolderOpen, Paperclip, ArrowUp, Square, X, FileText, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileAttachment } from '@/types';

// 支持的 MIME 类型映射
const MIME_MAP: Record<string, string> = {
  // 图片
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
  // 文本
  '.txt': 'text/plain', '.md': 'text/markdown', '.json': 'application/json',
  '.csv': 'text/csv', '.tsv': 'text/tab-separated-values',
  '.xml': 'text/xml', '.yaml': 'text/yaml', '.yml': 'text/yaml',
  // 代码
  '.js': 'text/javascript', '.ts': 'text/typescript', '.py': 'text/x-python',
  '.java': 'text/x-java', '.c': 'text/x-c', '.cpp': 'text/x-c++',
  '.go': 'text/x-go', '.rs': 'text/x-rust', '.html': 'text/html',
  '.css': 'text/css', '.sql': 'text/x-sql', '.sh': 'text/x-sh',
  '.rb': 'text/x-ruby', '.php': 'text/x-php', '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin', '.r': 'text/x-r', '.lua': 'text/x-lua',
  '.toml': 'text/toml', '.ini': 'text/ini', '.log': 'text/plain',
  // 文档
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const TEXT_EXTS = new Set([
  '.txt', '.md', '.json', '.csv', '.tsv', '.xml', '.yaml', '.yml',
  '.js', '.ts', '.py', '.java', '.c', '.cpp', '.go', '.rs', '.html',
  '.css', '.sql', '.sh', '.rb', '.php', '.swift', '.kt', '.r', '.lua',
  '.toml', '.ini', '.log',
]);
const DOC_EXTS = new Set(['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx']);

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const getCategory = (ext: string): FileAttachment['category'] | null => {
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (TEXT_EXTS.has(ext)) return 'text';
  if (DOC_EXTS.has(ext)) return 'document';
  return null;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export const InputBar = () => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useChatStore(s => s.sendMessage);
  const stopGeneration = useChatStore(s => s.stopGeneration);
  const isStreaming = useChatStore(s => s.isStreaming);
  const workingDir = useConfigStore(s => s.workingDir);
  const setField = useConfigStore(s => s.setField);
  const saveConfig = useConfigStore(s => s.saveConfig);

  // 添加文件到附件列表
  const addFiles = (files: Array<{ name: string; path: string; size: number }>) => {
    const newAttachments: FileAttachment[] = [];

    for (const file of files) {
      // 检查数量限制
      if (attachments.length + newAttachments.length >= MAX_FILES) break;

      // 检查文件大小
      if (file.size > MAX_FILE_SIZE) continue;

      // 检查重复
      if (attachments.some(a => a.path === file.path)) continue;

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const category = getCategory(ext);
      if (!category) continue; // 不支持的类型，静默跳过

      const mimeType = MIME_MAP[ext] || 'application/octet-stream';

      newAttachments.push({
        name: file.name,
        path: file.path,
        size: file.size,
        mimeType,
        category,
      });
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const content = input.trim();
    if ((!content && attachments.length === 0) || isStreaming) return;
    sendMessage(content, attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.4) + 'px';
    }
  };

  const handleSelectDir = async () => {
    const selected = await window.api.file.selectDir();
    if (selected) {
      setField('workingDir', selected);
      await saveConfig('workingDir', selected);
    }
  };

  // 回形针按钮：使用隐藏的文件输入框
  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  // 文件选择回调
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).map(f => ({
      name: f.name,
      path: (f as File & { path?: string }).path || f.name,
      size: f.size,
    }));
    addFiles(files);

    // 重置 input 以允许重复选择同一文件
    e.target.value = '';
  };

  // 拖拽处理
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).map(f => ({
      name: f.name,
      path: (f as File & { path?: string }).path || f.name,
      size: f.size,
    }));
    addFiles(files);
  };

  // 粘贴图片处理：读取为 base64 并保存临时文件
  const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;

        // 读取为 base64 并保存临时文件
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const ext = file.type.split('/')[1] || 'png';
          const fileName = `paste-${Date.now()}.${ext}`;
          try {
            const result = await window.api.file.saveTempFile(fileName, base64);
            addFiles([{ name: fileName, path: result.path, size: result.size }]);
          } catch (err) {
            console.error('保存粘贴图片失败:', err);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const dirDisplayName = workingDir ? workingDir.split('/').pop() || workingDir : '';

  // 附件图标
  const AttachmentIcon = ({ category }: { category: FileAttachment['category'] }) => {
    switch (category) {
      case 'image': return <ImageIcon className="h-3.5 w-3.5 text-accent-blue" />;
      case 'document': return <FileSpreadsheet className="h-3.5 w-3.5 text-accent-coral" />;
      default: return <FileText className="h-3.5 w-3.5 text-accent-green" />;
    }
  };

  const canSend = input.trim() || attachments.length > 0;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            'bg-card border rounded-2xl overflow-hidden transition-all duration-200',
            'border-border focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]',
            'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_20px_-4px_rgba(0,0,0,0.05)]',
            isDragOver && 'border-primary border-dashed bg-primary/5'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* 拖拽遮罩 */}
          {isDragOver && (
            <div className="px-4 py-3 text-center text-sm text-primary font-medium">
              拖放文件到此处
            </div>
          )}

          {/* 附件预览区 */}
          {attachments.length > 0 && (
            <div className="px-3 pt-3 flex gap-2 overflow-x-auto scrollbar-none">
              {attachments.map((attachment, index) => (
                <div
                  key={attachment.path + index}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded-lg text-xs shrink-0 group"
                >
                  <AttachmentIcon category={attachment.category} />
                  <span className="max-w-[120px] truncate text-foreground/80">{attachment.name}</span>
                  <span className="text-muted-foreground">{formatFileSize(attachment.size)}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 输入区 */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); handleInput(); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="输入消息..."
            rows={1}
            className="w-full resize-none px-4 pt-3 pb-2 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/50 text-foreground"
            style={{ maxHeight: '40vh' }}
          />

          {/* 隐藏的文件选择器 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* 底栏 */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              {isStreaming && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  思考中...
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground text-xs rounded-full hover:text-foreground"
                onClick={handleSelectDir}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {dirDisplayName || '选择工作目录'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleAttach}
                title="添加附件"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
            </div>
            {isStreaming ? (
              <button
                onClick={stopGeneration}
                className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-80 transition-opacity"
                title="停止生成"
              >
                <Square className="h-3.5 w-3.5" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center transition-all active:scale-90',
                  canSend
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
                title="发送"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
