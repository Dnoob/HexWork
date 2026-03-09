// 技能卡片颜色生成工具
// 基于名称哈希确定性生成渐变色对和首字母

// 6 种渐变色对，基于 HexWork 调色板
const GRADIENT_PAIRS = [
  ['hsl(38, 90%, 50%)', 'hsl(12, 80%, 62%)'],   // 琥珀 → 珊瑚
  ['hsl(160, 50%, 48%)', 'hsl(210, 70%, 58%)'],  // 绿 → 蓝
  ['hsl(210, 70%, 58%)', 'hsl(260, 50%, 65%)'],  // 蓝 → 薰衣草
  ['hsl(260, 50%, 65%)', 'hsl(12, 80%, 62%)'],   // 薰衣草 → 珊瑚
  ['hsl(12, 80%, 62%)', 'hsl(38, 90%, 50%)'],    // 珊瑚 → 琥珀
  ['hsl(160, 50%, 48%)', 'hsl(38, 90%, 50%)'],   // 绿 → 琥珀
];

// 左侧边框单色（取渐变对中的第一个色）
const BORDER_COLORS = [
  'hsl(38, 90%, 50%)',
  'hsl(160, 50%, 48%)',
  'hsl(210, 70%, 58%)',
  'hsl(260, 50%, 65%)',
  'hsl(12, 80%, 62%)',
  'hsl(160, 50%, 48%)',
];

const hashName = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getSkillColor = (name: string) => {
  const index = hashName(name) % GRADIENT_PAIRS.length;
  const [from, to] = GRADIENT_PAIRS[index];
  return {
    gradient: `linear-gradient(135deg, ${from}, ${to})`,
    borderColor: BORDER_COLORS[index],
    initial: name.charAt(0).toUpperCase(),
  };
};
