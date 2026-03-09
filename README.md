# HexWork

桌面 AI 助手，通过自然语言操作本地文件、自动化浏览器任务、生成多平台内容。

## 功能

- **AI 对话** — MiniMax M2.5，流式响应
- **文件操作** — 读写 Excel、Word、PDF，AI 驱动的文件处理
- **浏览器自动化** — Puppeteer + AI 驱动的网页操作
- **MCP 集成** — 连接外部 MCP Server 扩展能力
- **Agent Skills** — 用户自定义技能，SKILL.md
- **定时任务** — 应用内 cron 调度
- **内容工作台** — 一键生成小红书、抖音、微博、公众号、B站、知乎 6 平台适配内容

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Electron |
| 前端 | React 18 + TypeScript + Vite |
| 样式 | TailwindCSS + shadcn/ui |
| 状态管理 | Zustand |
| LLM | MiniMax M2.5（OpenAI 兼容接口） |
| 浏览器自动化 | Puppeteer |
| 数据存储 | SQLite (better-sqlite3) |
| 包管理 | pnpm |

## 快速开始

```bash
# 安装依赖
pnpm install

# 重建原生模块
npx electron-rebuild -f -w better-sqlite3

# 启动开发环境
pnpm dev
```

## 构建

```bash
pnpm build        # 构建生产版本
pnpm package      # 打包为安装包
```

## 项目结构

```
electron/          → Electron 主进程
  ipc/             → IPC 处理器
  services/        → 核心服务（LLM、Skills、MCP、DB、Config）
src/               → React 渲染进程
  components/      → UI 组件
  stores/          → Zustand stores
  types/           → TypeScript 类型
```

## License

[MIT](LICENSE)
