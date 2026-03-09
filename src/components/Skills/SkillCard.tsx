import { useState } from 'react';
import type { AgentSkillMeta } from '../../types';
import { MoreHorizontal, Eye, RefreshCw, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import { getSkillColor } from './skillColors';

interface SkillCardProps {
  skill: AgentSkillMeta;
  onToggle: (name: string, enabled: boolean) => void;
  onDetail: (name: string) => void;
  onUpdate: (name: string) => Promise<void>;
  onDelete: (name: string) => void;
}

export const SkillCard = ({ skill, onToggle, onDetail, onUpdate, onDelete }: SkillCardProps) => {
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { gradient, borderColor, initial } = getSkillColor(skill.name);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await onUpdate(skill.name);
    } finally {
      setUpdating(false);
    }
  };

  const sourceLabel = skill.source === 'builtin' ? '内置' : skill.source === 'git' ? 'Git' : skill.source === 'market' ? 'ClawHub' : '本地';
  const sourceClass = skill.source === 'builtin'
    ? 'bg-primary/10 text-primary border border-primary/20'
    : skill.source === 'git'
      ? 'bg-accent-lavender/10 text-accent-lavender border border-accent-lavender/20'
      : skill.source === 'market'
        ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
        : 'bg-muted text-muted-foreground border border-border';

  return (
    <div
      className={`group relative border rounded-xl overflow-hidden transition-all duration-300 ${
        skill.enabled
          ? 'border-border/60 bg-card hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)] hover:-translate-y-1'
          : 'border-border/30 bg-muted/20 opacity-55'
      }`}
    >
      {/* 色彩晕染 */}
      <div
        className={`absolute top-0 left-0 w-28 h-28 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 ${
          skill.enabled ? 'opacity-[0.06] group-hover:opacity-[0.14]' : 'opacity-[0.03]'
        }`}
        style={{ background: borderColor }}
      />

      <div className="relative p-4">
        {/* 头部：头像 + 信息 */}
        <div className="flex gap-3 mb-3">
          {/* 字母头像 */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${
              !skill.enabled ? 'saturate-[0.15] brightness-110' : ''
            }`}
            style={{ background: gradient }}
          >
            <span className="text-white font-display font-bold text-lg leading-none">{initial}</span>
          </div>

          {/* 名称 + 元信息 */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground truncate text-[13px] leading-tight">{skill.name}</span>
              {skill.metadata?.version && (
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">v{skill.metadata.version}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {skill.metadata?.author && (
                <span className="text-[11px] text-muted-foreground/70 truncate">{skill.metadata.author}</span>
              )}
              {skill.metadata?.author && <span className="text-[11px] text-muted-foreground/30">·</span>}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${sourceClass}`}>
                {sourceLabel}
              </span>
            </div>
          </div>
        </div>

        {/* 描述 */}
        <p className="text-xs text-foreground/55 leading-relaxed line-clamp-2 mb-3.5 min-h-[2.4em]">
          {skill.description}
        </p>

        {/* 底部操作 */}
        <div className="flex items-center justify-between">
          {/* 启用/禁用开关 */}
          <button
            onClick={() => onToggle(skill.name, !skill.enabled)}
            className="flex items-center gap-2 group/toggle"
          >
            <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${
              skill.enabled ? 'bg-accent-green' : 'bg-muted-foreground/20'
            }`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                skill.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
              }`} />
            </div>
            <span className={`text-[11px] font-medium transition-colors ${
              skill.enabled ? 'text-accent-green' : 'text-muted-foreground/50'
            }`}>
              {skill.enabled ? '已启用' : '已禁用'}
            </span>
          </button>

          {/* 更多菜单 */}
          <DropdownMenu onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-32">
              <DropdownMenuItem onClick={() => onDetail(skill.name)} className="gap-2 text-xs cursor-pointer">
                <Eye className="h-3.5 w-3.5" />
                详情
              </DropdownMenuItem>
              {skill.source === 'git' && (
                <DropdownMenuItem
                  onClick={handleUpdate}
                  disabled={updating}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${updating ? 'animate-spin' : ''}`} />
                  {updating ? '更新中...' : '更新'}
                </DropdownMenuItem>
              )}
              {skill.source !== 'builtin' && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    if (!confirmDelete) {
                      e.preventDefault();
                      setConfirmDelete(true);
                    } else {
                      onDelete(skill.name);
                      setConfirmDelete(false);
                    }
                  }}
                  className={`gap-2 text-xs cursor-pointer ${
                    confirmDelete
                      ? 'text-destructive-foreground bg-destructive focus:bg-destructive focus:text-destructive-foreground'
                      : 'text-destructive focus:text-destructive'
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {confirmDelete ? '确认删除' : '删除'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
