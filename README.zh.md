# QUASAR

[English](./README.md) · [中文](./README.zh.md)

**AI 编程助手资产管理 + LLM 可观测性监控中心**

QUASAR 是一个自托管的 Web 应用，为你的 AI 编程助手 Skills（技能）和代码项目提供统一视图——Git 状态、健康度评分、部署配置、使用历史、LLM 成本与延迟监控，一览无余。

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
- 详情页六个 Tab：
  - **概览** — 触发词（可编辑，直接写回 `SKILL.md`）、最近 30 天真实使用频率柱状图、关联项目自动检测、模板文件列表
  - **SKILL.md** — 完整 Markdown 渲染预览（含表格），一键复制
  - **模板库** — 文件树 + 右侧内容实时预览
  - **Git** — 远程信息、最近提交、Push / Pull / Fetch
  - **Eval（评估）** — Darwin 评分历史与趋势图；**Run Darwin** 按钮一键打开终端并定位到技能目录，启动 darwin-skill 评估
  - **Lessons（教训）** — 来自 `session-log.md` 的踩坑记录，可与技能关联
- 顶部操作：在 Finder / 编辑器打开、**Universalize**（触发 skill-universalizer 通用化评估）、跳转 GitHub

### 项目管理（`/projects`）
- 卡片网格：技术栈 badges、健康度环、Git ahead/behind、配置告警
- 详情页七个 Tab：
  - **README** — Markdown 渲染
  - **Git** — 远端、分支、ahead/behind（本地读取，无需网络）、最近提交、Push / Pull / Fetch
  - **Claude** — 内联 `CLAUDE.md` 编辑器 + `AGENTS.md` 预览
  - **Deploy** — 部署文件列表及内容（Dockerfile、docker-compose、vercel.json 等）
  - **Run** — `package.json` scripts 和 Makefile targets（有内容时才显示）
  - **Lessons** — 来自 `session-log.md` 的踩坑记录，可与项目关联
  - **Obs** — 单项目 LLM 调用指标（成本、延迟、错误率、最近调用记录）
- 左侧边栏：文件数、依赖数、`.env` 状态、健康度评分明细、技术栈、Git 快速操作
- 顶部操作：在终端打开、在 Finder 打开、**Run Test**（触发 test-architect 测试）、跳转 GitHub

### 报告历史与生命周期（`/reports`）
所有 AI 资产生命周期操作的统一报告中心——darwin、test-architect、skill-universalizer 的每次运行结果自动汇流至此。

- **时间线视图** — 所有资产的运行记录，按时间倒序排列
- **汇总统计** — 总报告数、darwin 改进率、测试运行次数、通用化评估数，一目了然
- **过滤** — 按运行类型（Darwin / Test / Universalizer）和目标类型（Skill / Project）筛选
- **可展开详情卡** — Darwin 显示分数变化和优化维度；Test 显示通过/失败明细和新发现问题；Universalizer 显示价值×可行性四象限和结论
- **Launch Bridge（启动桥）** — Skill 和 Project 详情页均提供一键启动按钮（`Run Darwin`、`Run Test`、`Universalize`），点击后自动打开终端并定位到目标目录；运行结束后报告写入 `~/.quasar/reports/` 自动展示在此页

> 每次工具运行后，Skill 和 Project 向 `~/.quasar/reports/` 写入标准 JSON 信封。各工具保留原生输出格式，额外写入摘要报告到中央库，互不干扰。

### LLM 可观测性监控（`/obs`）
生产环境 Agent 应用的多服务监控面板。

- **总览 Tab** — 所有配置服务的汇总卡片（总成本、调用量、平均延迟、错误率）；逐服务健康卡（在线 / 离线状态及关键指标）
- **优化建议** — 规则引擎自动分析：错误率突增、高延迟、定价配置缺失、模型延迟对比、Token 效率异常
- **告警 Tab** — 可配置告警规则（错误率 / 延迟 / 成本阈值，可指定服务范围）；告警历史存储在 `~/.quasar/obs-alerts.json`；提供 `POST /api/obs/poll` 端点供外部 cron 触发
- **服务配置 Tab** — 添加 / 删除 / 启用 / 禁用被监控的服务地址

每个被监控服务只需暴露 `GET /obs/stats` HTTP 端点；Quasar 通过 HTTP 拉取数据，无需访问服务数据库。

### 踩坑集（`/pitfalls`）
- 来自 `session-log.md` 的踩坑记录集中管理
- 支持与具体项目关联
- 展开卡片查看问题描述、解法和教训

### 同步面板（`/sync`）
- 所有有 Git 的 Skills 和 Projects 集中展示
- 实时 ahead/behind（本地 Git 状态，不发起网络 fetch）
- 逐项 Push / Pull，或一键同步全部
- 操作日志持久化写入 `~/.quasar/sync-log.json`

### 关联图谱（`/graph`）
- 二部图 SVG 可视化：左列 Skills，右列 Projects
- 三种连线：源码关联 / CLAUDE.md 引用 / README 引用
- 悬停高亮，点击查看连线详情

### 鉴权
- 可选密码登录，httpOnly Cookie 会话（有效期 7 天）
- 基于 Web Crypto API 的 HMAC-SHA256 签名，无需外部鉴权依赖，兼容 Edge Runtime
- 默认关闭（本地开发免配置）；在 `.env.local` 中设置 `QUASAR_PASSWORD` 后自动启用
- 鉴权启用时侧边栏底部显示退出登录按钮

### 全局功能
- `⌘K`（Mac）/ `Ctrl+K`（Windows/Linux）全文搜索——搜索名称、触发词、SKILL.md 内容、项目 README
- 暗色 / 亮色 / 跟随系统主题，四种强调色，实时切换生效
- 首次启动欢迎引导，指引配置扫描目录

---

## 环境要求

- **Node.js** 18+ 和 npm
- **Git**（使用同步功能时需要）
- **Python3**（可选——仅本地 SQLite obs 查询时需要）
- Skills 目录：每个技能是一个包含 `SKILL.md` 的子目录
- Projects 目录：普通代码项目目录（自动识别 README、package.json 等）

---

## 安装

```bash
# 1. 克隆仓库
git clone https://github.com/LeckyHuang/Quasar.git
cd Quasar

# 2. 安装依赖
npm install

# 3. 配置鉴权（可选）
cp .env.example .env.local
# 编辑 .env.local，设置 QUASAR_PASSWORD 和 QUASAR_SECRET

# 4. 启动开发服务器
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
| **Obs 监控服务** | 暴露 `/obs/stats` 的远程服务地址，用于 LLM 监控 |
| **告警规则** | 错误率、延迟、成本的阈值告警配置 |

---

## LLM 可观测性接入

被监控服务需要暴露 obs HTTP 端点。在 FastAPI 服务中加入以下代码：

```python
# 在你的服务 main.py 中（用 try/except 保护，确保生产安全）
try:
    import sys, os
    obs_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, obs_root)
    import obs
    from obs.router import router as obs_router
    obs.init("your-service-name")
    app.include_router(obs_router)
except Exception:
    pass
```

然后在 Quasar 的 **Obs → 服务配置** Tab 中添加服务地址。Quasar 会从每个配置的服务拉取 `GET /obs/stats` 并聚合数据——无需访问服务数据库。

如需无人值守告警，配置 cron：
```bash
*/15 * * * * curl -s -X POST http://localhost:3000/api/obs/poll > /dev/null
```

---

## 生产部署

完整的步骤指南（PM2、Nginx、HTTPS、鉴权配置）参见 [`docs/deployment.md`](./docs/deployment.md)。

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
| 鉴权 | Web Crypto API（HMAC-SHA256，内置，无依赖） |
| Obs 数据 | HTTP fetch 各服务 `/obs/stats` 端点 |

无外部数据库，无远程服务，所有配置和状态存在本地文件系统。

---

## Roadmap

### 生命周期管理
- [x] 中央报告库（`~/.quasar/reports/`）+ 统一 JSON 信封 schema
- [x] Reports 时间线页面——darwin / test-architect / skill-universalizer 全部运行记录统一呈现
- [x] Launch Bridge——在 Skill / Project 详情页一键打开终端触发工具（Run Darwin、Run Test、Universalize）
- [ ] **Orchestrator**——直接从 QUASAR 界面触发工具运行，无需打开终端（依赖 Claude Code SDK 集成）
- [ ] 资产创建入口——在 QUASAR 中发起 skill-creator 创建新技能，自动纳入生命周期管理
- [ ] Skill 卡片 Darwin 评分趋势 sparkline

### 可观测性与安全
- [x] LLM 可观测性面板（成本、延迟、错误率）
- [x] 多服务 HTTP 聚合
- [x] 告警规则 + 历史
- [x] 规则引擎优化建议
- [x] 密码鉴权 + httpOnly Cookie
- [ ] 技能相似度检测（TF-IDF / embedding）
- [ ] 基于本地向量库的语义搜索
- [ ] LLM 深度分析（Phase 3B）
- [ ] Electron / Tauri 桌面端封装

---

## License

MIT
