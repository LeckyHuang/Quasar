# QUASAR

[English](./README.md) · [中文](./README.zh.md)

**本地 AI 编程助手资产管理中心**

QUASAR 是一个自托管的 Web 应用，为你的 AI 编程助手 Skills（技能）和代码项目提供统一视图——Git 状态、健康度评分、部署配置、使用历史、关联关系，一览无余。

可以把它理解成面向 AI 开发资产的 TablePlus。

为 Claude Code 用户构建，同样支持任何以 `SKILL.md` 文件组织技能目录的 AI 编程工具。

---

## 功能概览

### 仪表盘
- 核心指标：技能数量、项目数量、平均健康度、Git 同步状态、待处理告警
- 最近活跃的 Skills 和 Projects
- 技能分类环形图
- 项目健康度分布（高 / 中 / 低）
- 需要关注的告警：缺少 CLAUDE.md、无 Git Remote、无部署配置

### 技能管理（`/skills`）
- 卡片网格：分类色块、触发词、Git 状态、使用热度
- 详情页四个 Tab：
  - **概览** — 触发词（可编辑，直接写回 `SKILL.md`）、最近 30 天真实使用频率柱状图、关联项目自动检测、模板文件列表
  - **SKILL.md** — 完整 Markdown 渲染预览（含表格），一键复制
  - **模板库** — 文件树 + 右侧内容实时预览
  - **Git** — 远程信息、最近提交、Push / Pull / Fetch

### 项目管理（`/projects`）
- 卡片网格：技术栈 badges、健康度环、Git ahead/behind、配置告警
- 详情页五个 Tab：
  - **README** — Markdown 渲染
  - **Git** — 远端、分支、ahead/behind（本地读取，无需网络）、最近提交、Push / Pull / Fetch
  - **Claude** — 内联 `CLAUDE.md` 编辑器 + `AGENTS.md` 预览
  - **Deploy** — 部署文件列表及内容（Dockerfile、docker-compose、vercel.json 等）
  - **Run** — `package.json` scripts 和 Makefile targets（有内容时才显示）
- 左侧边栏：文件数、依赖数、`.env` 状态、健康度评分明细、技术栈、Git 快速操作
- 顶部操作：在终端打开、在文件管理器打开、跳转 GitHub

### 同步面板（`/sync`）
- 所有有 Git 的 Skills 和 Projects 集中展示
- 实时 ahead/behind（本地 Git 状态，不发起网络 fetch）
- 逐项 Push / Pull，或一键同步全部
- 操作日志持久化写入 `~/.quasar/sync-log.json`

### 关联图谱（`/graph`）
- 二部图 SVG 可视化：左列 Skills，右列 Projects
- 三种连线：源码关联 / CLAUDE.md 引用 / README 引用
- 悬停高亮，点击查看连线详情

### 全局功能
- `⌘K`（Mac）/ `Ctrl+K`（Windows/Linux）全文搜索——搜索名称、触发词、SKILL.md 内容、项目 README
- 暗色 / 亮色 / 跟随系统主题，四种强调色，实时切换生效
- 首次启动欢迎引导，指引配置扫描目录

---

## 环境要求

- **Node.js** 18+ 和 npm
- **Git**（使用同步功能时需要）
- Skills 目录：每个技能是一个包含 `SKILL.md` 的子目录
- Projects 目录：普通代码项目目录（自动识别 README、package.json 等）

> **Windows 用户**：核心功能（扫描、展示、Git 状态）完全支持。"在终端/文件管理器中打开"按钮在 Windows 下会调用 `cmd` 和 `explorer`，需要确保已安装 Git for Windows。

---

## 安装

```bash
# 1. 克隆仓库
git clone https://github.com/LeckyHuang/Quasar.git
cd Quasar

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)。

首次启动会弹出欢迎引导，点击「去设置扫描目录」，在 Settings 页面配置你的 Skills 和 Projects 所在路径即可。

---

## 配置

所有配置存储在 `~/.quasar/config.json`，通过 Settings 页面（`/settings`）管理，无需手动编辑文件。

| 配置项 | 说明 |
|--------|------|
| **Skills 目录** | 包含技能子目录的路径（每个技能需有 `SKILL.md`） |
| **Projects 目录** | 包含项目子目录的路径 |
| **外观** | 暗色 / 亮色 / 跟随系统 |
| **强调色** | 蓝 / 紫 / 青 / 琥珀 |
| **自动扫描** | 文件变更时通过 `chokidar` 自动重新索引 |

---

## 目录约定

### Skills 目录结构

```
~/.claude/skills/          ← 示例 Skills 目录（可自定义）
├── my-skill/
│   ├── SKILL.md           ← 必须存在
│   └── templates/         ← 可选，模板文件
│       └── example.md
└── another-skill/
    └── SKILL.md
```

`SKILL.md` 支持 YAML frontmatter 定义元数据：

```yaml
---
name: 我的技能
description: 这个技能的用途
category: engineering
tags: [typescript, testing]
---

触发词包括：关键词1、关键词2、关键词3等。

# 详细说明

技能的完整描述和使用说明……
```

QUASAR 从 frontmatter 读取 `name`、`description`、`category`、`tags`，并从正文中匹配 `触发词：...` 或 `触发词包括：...` 格式的触发词。

### 项目目录结构

任意目录都可以被识别为项目，扫描器会自动检测：

| 信号 | 来源 |
|------|------|
| 技术栈 | `package.json`、`pyproject.toml`、`requirements.txt` |
| Git 状态 | `.git/`（remote URL、分支、ahead/behind，本地读取） |
| Claude 配置 | `CLAUDE.md`、`AGENTS.md` |
| 部署配置 | `Dockerfile`、`docker-compose.yml`、`vercel.json`、`DEPLOY.md` 等 |
| 运行命令 | `package.json` scripts、`Makefile` targets |

**健康度评分（0–100）：**

| 条件 | 得分 |
|------|------|
| 有 Git Remote | +40 |
| 有 `CLAUDE.md` | +30 |
| 有部署配置文件 | +20 |
| 与 Remote 保持同步 | +10 |

---

## 使用历史（可选）

QUASAR 通过匹配触发词与对话历史来生成每个技能的 30 天使用图表，读取路径：`~/.claude/history.jsonl`。

文件格式（每行一个 JSON 对象）：

```jsonl
{"display": "用户输入文本", "timestamp": 1234567890000, "sessionId": "..."}
```

文件不存在时图表显示为零，不会报错。

---

## 快速启动

### macOS

双击 `launch-quasar.command` 即可自动启动服务并打开浏览器。

首次使用前需要赋予执行权限：

```bash
chmod +x launch-quasar.command
```

### Windows

双击 `launch-quasar.bat` 即可自动启动服务并打开浏览器（需要已安装 curl）。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16（App Router） |
| UI | React 19，自定义 CSS 设计 Token |
| 图标 | Lucide React |
| Git 集成 | simple-git |
| 文件监听 | chokidar |
| Frontmatter 解析 | gray-matter |

无数据库，无远程服务，所有数据存在本地文件系统。

---

## Roadmap

- [ ] 技能相似度检测（TF-IDF / embedding）
- [ ] 基于本地向量库的语义搜索
- [ ] CLAUDE.md 可视化宪法编辑器
- [ ] Electron / Tauri 桌面端封装

---

## License

MIT
