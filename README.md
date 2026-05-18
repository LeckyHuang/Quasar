# QUASAR

[English](./README.md) · [中文](./README.zh.md)

**Local dashboard for managing AI Coding Agent skills and projects.**

QUASAR is a self-hosted web app that gives you a unified view of all your AI agent skills and code projects — git status, health scores, deployment configs, usage history, and more. Think of it as TablePlus, but for your AI development assets.

Built for Claude Code users, but works with any agent that organises skills in a directory with `SKILL.md` files.

---

## Features

### Dashboard
- Stats overview: skill count, project count, avg health score, git sync status, active alerts
- Recently active skills and projects
- Skills-by-category donut chart
- Project health distribution (high / medium / low)
- Needs-attention alerts: missing CLAUDE.md, no git remote, no deploy config

### Skill Management (`/skills`)
- Card grid with category, trigger words, git status, and usage heat
- Detail page with four tabs:
  - **Overview** — trigger words (editable, written back to `SKILL.md`), usage bar chart from real history, related projects auto-detected, template file list
  - **SKILL.md** — full rendered Markdown preview with table support, one-click copy
  - **Templates** — file tree with live content preview
  - **Git** — remote info, recent commits, push / pull / fetch

### Project Management (`/projects`)
- Card grid with tech stack badges, health ring, git ahead/behind, config alerts
- Detail page with five tabs:
  - **README** — rendered Markdown
  - **Git** — remote, branch, ahead/behind (local state, no network call), recent commits, push / pull / fetch
  - **Claude** — inline `CLAUDE.md` editor + `AGENTS.md` preview
  - **Deploy** — deploy file list and content (Dockerfile, docker-compose, vercel.json, etc.)
  - **Run** — `package.json` scripts and Makefile targets (shown only when present)
- Sidebar: file count, dependency count, `.env` status, health score breakdown, tech stack, git quick actions
- Header actions: open in Terminal, open in Finder, link to GitHub

### Sync Panel (`/sync`)
- All git-tracked skills and projects in one place
- Real ahead/behind counts (local git, no network fetch required)
- Per-item push / pull, or sync-all
- Persistent sync log written to `~/.quasar/sync-log.json`

### Relationship Graph (`/graph`)
- Bipartite SVG visualisation: skills on the left, projects on the right
- Three edge types: source-code link, CLAUDE.md mention, README mention
- Hover to highlight, click to view edge details

### Global
- `⌘K` full-text search — names, trigger words, SKILL.md content, project README
- Dark / light / system theme with four accent colours, live-applied
- First-run welcome modal with setup guidance

---

## Prerequisites

- **Node.js** 18+ and npm
- **Git** (for sync features)
- Skills structured as directories, each containing a `SKILL.md` file
- Projects as plain directories (README, package.json, etc. detected automatically)

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/LeckyHuang/Quasar.git
cd Quasar

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first launch a welcome modal will guide you to **Settings → Scan Directories** to point QUASAR at your skills and projects.

---

## Configuration

All config is stored in `~/.quasar/config.json` and managed through the Settings page (`/settings`). No manual file editing required.

| Setting | Description |
|---------|-------------|
| **Skills directories** | Paths containing skill subdirectories (each with a `SKILL.md`) |
| **Projects directories** | Paths containing project subdirectories |
| **Appearance** | `dark` / `light` / `system` |
| **Accent colour** | Blue / Purple / Teal / Amber |
| **Auto-scan** | Re-index on file changes via `chokidar` |

---

## Directory conventions

### Skills

Each skill is a subdirectory with a `SKILL.md` file:

```
~/.claude/skills/          ← example skills directory
├── my-skill/
│   ├── SKILL.md           ← required
│   └── templates/         ← optional
│       └── example.md
└── another-skill/
    └── SKILL.md
```

`SKILL.md` supports YAML frontmatter for structured metadata:

```yaml
---
name: My Skill
description: What this skill does
category: engineering
tags: [typescript, testing]
---

触发词包括：关键词1、关键词2、关键词3等。

Full description and instructions follow...
```

QUASAR reads `name`, `description`, `category`, and `tags` from frontmatter. Trigger words are parsed from lines matching `触发词：...` or `触发词包括：...` in the body.

### Projects

Any directory is recognised as a project. The scanner detects:

| Signal | Source |
|--------|--------|
| Tech stack | `package.json`, `pyproject.toml`, `requirements.txt` |
| Git status | `.git/` (remote URL, branch, ahead/behind — local only) |
| Claude config | `CLAUDE.md`, `AGENTS.md` |
| Deploy config | `Dockerfile`, `docker-compose.yml`, `vercel.json`, `DEPLOY.md`, etc. |
| Run commands | `package.json` scripts, `Makefile` targets |

**Health score** (0–100):

| Criterion | Points |
|-----------|--------|
| Has git remote | +40 |
| Has `CLAUDE.md` | +30 |
| Has deploy config | +20 |
| In sync with remote | +10 |

---

## Usage history (optional)

QUASAR displays a 30-day usage chart per skill by matching trigger words against your agent's conversation history file at `~/.claude/history.jsonl`.

Expected format (one JSON object per line):

```jsonl
{"display": "user message text", "timestamp": 1234567890000, "sessionId": "..."}
```

If the file is absent the chart simply shows zero — no errors.

---

## Quick-launch (macOS)

Double-click `launch-quasar.command` in Finder to start the server and open the browser automatically.

First-time setup:
```bash
chmod +x launch-quasar.command
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, custom CSS design tokens |
| Icons | Lucide React |
| Git integration | simple-git |
| File watching | chokidar |
| Frontmatter parsing | gray-matter |

No database. No remote services. All data lives on your local filesystem.

---

## Roadmap

- [ ] Skill similarity detection (TF-IDF or embedding-based)
- [ ] Semantic search via local vector store
- [ ] CLAUDE.md visual constitution editor
- [ ] Electron / Tauri desktop wrapper

---

## License

MIT
