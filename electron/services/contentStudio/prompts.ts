// 各平台的内容规格和风格描述
export const PLATFORM_SPECS: Record<string, { name: string; spec: string; outputHint: string }> = {
  xiaohongshu: {
    name: '小红书种草笔记',
    spec: `- 语气：口语化、亲切、emoji 密集、感叹号多
- 格式：标题用 ｜ 分隔要素，内容分点用 emoji 编号（1️⃣2️⃣3️⃣），结尾 5-8 个标签
- 字数：标题 20 字内，正文 300-500 字
- 关键：真实感、种草感、有画面感`,
    outputHint: '直接输出标题和正文，结尾附标签。',
  },
  douyin: {
    name: '抖音短视频脚本',
    spec: `- 语气：口播化、节奏快、前 3 秒必须有 hook（反问/悬念/冲突）
- 格式：分镜头描述（时间线），口播文案，推荐 BGM
- 字数：口播 150-300 字（60 秒内读完）
- 关键：开头抓注意力、信息密度高、有金句`,
    outputHint: '先写标题，然后写前3秒hook，再写口播文案和分镜头，最后推荐BGM。结尾附标签。',
  },
  weibo: {
    name: '微博话题博文',
    spec: `- 语气：简短有力、情绪化、金句向
- 格式：正文 + 话题标签（#xx#格式），可 @相关账号
- 字数：100-200 字
- 关键：话题引爆、情绪共鸣、引发转发`,
    outputHint: '先写标题，再写博文正文，结尾附标签。',
  },
  wechat: {
    name: '微信公众号图文推送',
    spec: `- 语气：有质感、适度标题党、结构化
- 格式：标题 + 导语 + 正文大纲（含小标题）+ 字数预估
- 字数：标题 25 字内，正文大纲（建议 1500-2500 字展开）
- 关键：标题吸引打开率、内容有深度、排版层次分明`,
    outputHint: '先写标题，再写导语和正文大纲（含小标题），注明预计字数。结尾附标签。',
  },
  bilibili: {
    name: 'B站视频文案 + 社区动态',
    spec: `- 语气：年轻化、真实感、弹幕梗、自嘲式幽默
- 格式：分两部分——①视频标题+简介+时间线章节 ②社区动态文案
- 字数：简介 100-200 字，动态 100 字
- 关键：标题有信息量、章节方便跳转、动态引导三连`,
    outputHint: '先写视频标题和简介，再写时间线章节，然后另起写社区动态文案。结尾附标签。',
  },
  zhihu: {
    name: '知乎问答回答',
    spec: `- 语气：专业、客观、有理有据、适度个人经验
- 格式：先给出问题（"去 xx 有什么推荐？"），再写回答（总分总结构）
- 字数：800-1200 字
- 关键：干货密度高、有数据/引用、结尾总结`,
    outputHint: '先给出知乎问题，再写完整回答。结尾附标签。',
  },
};

// 构建单个平台的 system prompt
export const buildPlatformPrompt = (
  platformId: string,
  searchContext: string,
  audience: string[],
  style: string[],
  scene: string[],
): string => {
  const platform = PLATFORM_SPECS[platformId];
  if (!platform) return '';

  const tagInfo = [
    audience.length > 0 ? `目标受众: ${audience.join('、')}` : '',
    style.length > 0 ? `内容风格: ${style.join('、')}` : '',
    scene.length > 0 ? `使用场景: ${scene.join('、')}` : '',
  ].filter(Boolean).join('\n');

  return `你是一个专业的${platform.name}内容创作专家。请根据用户提供的主题，创作一篇高质量的${platform.name}内容。

## 平台内容规格
${platform.spec}

## 参考资料（联网搜索结果）
${searchContext}

${tagInfo ? `## 用户偏好\n${tagInfo}\n` : ''}
## 输出格式要求

请严格按照以下 JSON 格式输出，不要输出任何其他内容（不要 markdown 代码块包裹）：

{"title": "标题", "content": "正文内容", "tags": ["标签1", "标签2", ...]}

${platform.outputHint}
正文内容写在 content 字段中，可以包含换行符。标签用不带 # 的纯文本，3-8 个。`;
};
