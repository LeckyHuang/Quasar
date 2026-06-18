# QUASAR

[English](./README.md) · [中文](./README.zh.md)

**Self-hosted dashboard for managing AI Coding Agent skills, projects, and LLM observability.**

QUASAR is a self-hosted web app that gives you a unified view of all your AI agent skills and code projects — git status, health scores, deployment configs, usage history, LLM cost and latency monitoring, and more. Think of it as TablePlus, but for your AI development assets.

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
- Detail page with six tabs:
  - **Overview** — trigger words (editable, written back to `SKILL.md`), usage bar chart from real history, related projects auto-detected, template file list
  - **SKILL.md** — full rendered Markdown preview with table support, one-click copy
  - **Templates** — file tree with live content preview
  - **Git** — remote info, recent commits, push / pull / fetch
  - **Eval** — Darwin score history with trend chart; **Run Darwin** button opens Terminal and navigates to the skill directory for one-click evaluation
  - **Lessons** — pitfall records sourced from `session-log.md`, linked per skill
- Header actions: open in Finder / Editor, **Universalize** button (triggers skill-universalizer), GitHub link

### Project Management (`/projects`)
- Card grid with tech stack badges, health ring, git ahead/behind, config alerts
- Detail page with seven tabs:
  - **README** — rendered Markdown
  - **Git** — remote, branch, ahead/behind (local state, no network call), recent commits, push / pull / fetch
  - **Claude** — inline `CLAUDE.md` editor + `AGENTS.md` preview
  - **Deploy** — deploy file list and content (Dockerfile, docker-compose, vercel.json, etc.)
  - **Run** — `package.json` scripts and Makefile targets (shown only when present)
  - **Lessons** — pitfall records sourced from `session-log.md`, linked per project
  - **Obs** — per-project LLM call metrics (cost, latency, error rate, recent calls)
- Sidebar: file count, dependency count, `.env` status, health score breakdown, tech stack, git quick actions
- Header actions: open in Terminal, open in Finder, **Run Test** button (triggers test-architect), link to GitHub

### Reports & Lifecycle (`/reports`)
Unified report history for AI asset lifecycle operations — all skill and project runs flow here automatically.

- **Timeline view** — chronological list of all darwin, test-architect, and skill-universalizer runs across all assets
- **Summary stats** — total runs, darwin improvement rate, test runs, universalizer evaluations at a glance
- **Filter** by run type (Darwin / Test / Universalizer) and target type (Skill / Project)
- **Expandable detail cards** — per-run type: darwin shows score delta + improved dimension; test shows pass/fail breakdown + new issues; universalizer shows value × feasibility quadrant + verdict
- **Launch Bridge** — skill and project detail pages have one-click buttons (`Run Darwin`, `Run Test`, `Universalize`) that open Terminal pre-navigated to the target directory; reports written to `~/.quasar/reports/` are automatically picked up here

> Skills and projects emit a standard JSON envelope to `~/.quasar/reports/` after each run. The schema is additive — tools keep their native output formats and additionally write a summary report to the central store.

### LLM Observability (`/obs`)
Multi-service monitoring panel for production Agent applications.

- **Overview tab** — aggregated summary cards (total cost, calls, avg latency, error rate) across all configured services; per-service health cards showing online / offline status
- **Optimization suggestions** — rule-based analysis: error rate spikes, high latency, missing pricing config, model latency comparison, token efficiency
- **Alerts tab** — configurable alert rules (error rate / latency / cost thresholds per service); alert history stored in `~/.quasar/obs-alerts.json`; `POST /api/obs/poll` endpoint for external cron trigger
- **Services tab** — add / remove / enable / disable monitored service endpoints

Each monitored service exposes a `GET /obs/stats` HTTP endpoint; Quasar fetches data via HTTP, requiring no database access or agent modification.

### Lessons / Pitfalls (`/pitfalls`)
- Centralised pitfall library sourced from `session-log.md`
- Link pitfalls to specific projects
- Expandable cards showing problem, solution, and lessons learned

### Sync Panel (`/sync`)
- All git-tracked skills and projects in one place
- Real ahead/behind counts (local git, no network fetch required)
- Per-item push / pull, or sync-all
- Persistent sync log written to `~/.quasar/sync-log.json`

### Relationship Graph (`/graph`)
- Bipartite SVG visualisation: skills on the left, projects on the right
- Three edge types: source-code link, CLAUDE.md mention, README mention
- Hover to highlight, click to view edge details

### Authentication
- Optional password login with httpOnly cookie session (7-day TTL)
- HMAC-SHA256 signed tokens — no external auth dependencies, edge-runtime compatible
- Disabled by default (local dev); enabled by setting `QUASAR_PASSWORD` in `.env.local`
- Logout button in sidebar when auth is active

### Global
- `⌘K` full-text search — names, trigger words, SKILL.md content, project README
- Dark / light / system theme with four accent colours, live-applied
- First-run welcome modal with setup guidance

---

## Prerequisites

- **Node.js** 18+ and npm
- **Git** (for sync features)
- **Python3** (optional — only needed for local SQLite obs queries)
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

# 3. (Optional) Configure auth
cp .env.example .env.local
# Edit .env.local and set QUASAR_PASSWORD + QUASAR_SECRET

# 4. Start the development server
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
| **Obs services** | Remote service URLs exposing `/obs/stats` for LLM monitoring |
| **Alert rules** | Thresholds for error rate, latency, and cost alerts |

---

## LLM Observability Setup

To monitor an Agent service, it needs to expose the obs HTTP endpoint. Add the following to your FastAPI app:

```python
# In your service's main.py (wrapped in try/except for production safety)
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

Then add the service URL in Quasar's **Obs → Services** tab. Quasar fetches `GET /obs/stats` from each configured service and aggregates the data — no database access required.

For unattended alerting, add a cron job:
```bash
*/15 * * * * curl -s -X POST http://localhost:3000/api/obs/poll > /dev/null
```

---

## Production Deployment

See [`docs/deployment.md`](./docs/deployment.md) for the full step-by-step guide covering PM2, Nginx, HTTPS, and auth setup.

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
| Auth | Web Crypto API (HMAC-SHA256, built-in) |
| Obs data | HTTP fetch from service `/obs/stats` endpoints |

No external database. No remote services. All config and state live on your local filesystem.

---

## Roadmap

### Lifecycle Management
- [x] Central report store (`~/.quasar/reports/`) with unified JSON envelope schema
- [x] Reports & Timeline page — all darwin / test-architect / skill-universalizer runs in one view
- [x] Launch Bridge — one-click Terminal launch from skill/project detail pages (Run Darwin, Run Test, Universalize)
- [ ] **Orchestrator** — trigger skill runs directly from QUASAR UI without opening Terminal (requires Claude Code SDK integration)
- [ ] Asset creation entry point — create new skills from QUASAR with skill-creator pre-filled context
- [ ] Score trend charts per skill (darwin history sparklines on skill cards)

### Observability & Security
- [x] LLM observability panel (cost, latency, error rate)
- [x] Multi-service HTTP aggregation
- [x] Alert rules + history
- [x] Rule-based optimization suggestions
- [x] Password auth with httpOnly cookie
- [ ] Skill similarity detection (TF-IDF or embedding-based)
- [ ] Semantic search via local vector store
- [ ] LLM-powered deep analysis (Phase 3B)
- [ ] Electron / Tauri desktop wrapper

---

## License

MIT
