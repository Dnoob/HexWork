import { PlatformId } from '@/types';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  icon: string;
  type: string;
  color: string;
  gradient: string;
  headerGradient: string; // 详情弹窗头部渐变
  textColor: string;
  bgColor: string;
  borderColor: string;    // 实色边框
  hoverShadow: string;    // hover 阴影
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'xiaohongshu',
    name: '小红书',
    icon: '📕',
    type: '种草笔记',
    color: 'red',
    gradient: 'from-red-500/20 to-red-500/0',
    headerGradient: 'from-red-500/15 via-red-400/8 to-transparent',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/40',
    hoverShadow: 'hover:shadow-red-500/10',
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    type: '短视频脚本',
    color: 'cyan',
    gradient: 'from-cyan-400/20 to-cyan-400/0',
    headerGradient: 'from-cyan-400/15 via-cyan-400/8 to-transparent',
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/40',
    hoverShadow: 'hover:shadow-cyan-400/10',
  },
  {
    id: 'weibo',
    name: '微博',
    icon: '🔥',
    type: '话题博文',
    color: 'orange',
    gradient: 'from-orange-400/20 to-orange-400/0',
    headerGradient: 'from-orange-400/15 via-orange-400/8 to-transparent',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    borderColor: 'border-orange-400/40',
    hoverShadow: 'hover:shadow-orange-400/10',
  },
  {
    id: 'wechat',
    name: '微信公众号',
    icon: '💬',
    type: '图文推送',
    color: 'green',
    gradient: 'from-green-500/20 to-green-500/0',
    headerGradient: 'from-green-500/15 via-green-500/8 to-transparent',
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/40',
    hoverShadow: 'hover:shadow-green-500/10',
  },
  {
    id: 'bilibili',
    name: 'B站',
    icon: '📺',
    type: '视频文案+动态',
    color: 'sky',
    gradient: 'from-sky-400/20 to-sky-400/0',
    headerGradient: 'from-sky-400/15 via-sky-400/8 to-transparent',
    textColor: 'text-sky-400',
    bgColor: 'bg-sky-400/10',
    borderColor: 'border-sky-400/40',
    hoverShadow: 'hover:shadow-sky-400/10',
  },
  {
    id: 'zhihu',
    name: '知乎',
    icon: '💡',
    type: '问答回答',
    color: 'blue',
    gradient: 'from-blue-500/20 to-blue-500/0',
    headerGradient: 'from-blue-500/15 via-blue-500/8 to-transparent',
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/40',
    hoverShadow: 'hover:shadow-blue-500/10',
  },
];

// 标签选项
export const AUDIENCE_TAGS = ['年轻女性', '亲子家庭', '商务人士', 'Z世代', '通用'];
export const STYLE_TAGS = ['文艺清新', '种草安利', '幽默搞笑', '专业严谨', '热血激情'];
export const SCENE_TAGS = ['打卡拍照', '美食探店', '度假放松', '深度体验', '高性价比'];
