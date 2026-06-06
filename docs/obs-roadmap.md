# Quasar obs 可观测性 + 安全 Roadmap

> 上次更新：2026-06-04

---

## ✅ 已完成

### obs 功能
| ID | 内容 |
|----|------|
| A1 | ASR span 写入 audio_duration_s + audio_size_bytes |
| A2 + A2-fix | ASR 成本 Quasar 展示 + 改为全量 SQL 聚合 |
| B1 | wiki-app per-query trace_id + ingest 链路 trace_id |
| B2 | user_id 写入 llm_calls（session_id 字段） |
| C2 | prompt_chars 写入 llm_calls |
| D1 | error_type 分类标签（timeout/rate_limit/auth/parse_error/network） |
| E1 | 端到端业务成功率 span（echomind + voicerecorder request 顶层 span） |
| E3 | 请求来源前缀（app: 标记 APP 触发的 LLM 调用） |
| F2 | P50/P95/P99 延迟分位数（Python SQL + Quasar 展示） |

### 安全
| ID | 内容 |
|----|------|
| S1 | /obs/* Bearer Token 鉴权 + 初始 token 写入各项目 .env |
| S2 | CORS 收紧：从 `*` 改为读 CORS_ORIGINS env，未配置时保持 `*` 并警告 |
| S5 | 上传速率限制：per-IP 每小时 20 次（echomind + voicerecorder） |
| S6 | error_msg 脱敏：API Key 屏蔽 + 500 字截断 |
| S7 | echomind 前端 innerHTML XSS 修复（34 处，report/files/prompts.js） |
| S8 | wiki ingest 文件 magic bytes 验证（防文件类型伪装） |
| S9 | wiki-app SECRET_KEY 持久化加固 |
| obs-sec-wire | obs+安全 | asr_cost_cny / daily_calls 告警接线 + poll/route.ts snapshot 补全 |
| sec-obs-metrics | obs+安全 | error_breakdown SQL 聚合（auth/rate_limit/timeout 分类）+ Quasar 安全指标卡片 + AlertRule 新增 auth_error_count / rate_limit_count 指标 |
| sec-span-events | 安全 | 429 限流触发 + wiki 文件校验拒绝写入 spans 表，可在 obs 面板量化 |
| fix-pricing-input | 设置 | API 定价输入框改为文本输入（NumInput 组件），支持多位小数 |
| fix-echomind-workers | 稳定性 | echomind 由 --workers 2 改为 --workers 1，消除 SQLite 并发冲突导致的随机崩溃；日志改 >> 追加模式 |

---

## 待完成

### obs — 功能细化（P2）

| ID | 分类 | 内容 | 难度 | 说明 |
|----|------|------|------|------|
| sec-firewall | 安全 | Python 服务端口（8088/8001/wiki）加防火墙规则，仅对 Quasar 服务器 IP 开放，阻止公网扫描器直连 | 🟢 低 | 当前日志已出现大量 /manager/html、/metrics、MCP 等扫描请求；在云控制台安全组配置即可，无需改代码 |



| ID | 分类 | 内容 | 难度 | 说明 |
|----|------|------|------|------|
| B3 | 链路 | 并发 LLM 调用标记 parent_id，瀑布图区分真并发与串行 | 🟡 中 | asyncio.gather 的多个 LLM call 目前平级展示，无层级 |
| sec-ip-analytics | 安全 | 高频扫描 IP 统计与封锁建议（从 spans 中聚合，在 obs 面板展示 Top N 扫描 IP） | 🟡 中 | 需先在 spans 写入 client_ip，然后 Quasar 聚合展示 |
| D2 | 错误 | 重试次数记录（retry_count 写入 llm_calls） | 🟡 中 | 重试后成功的调用，真实成本是 Nx，目前只记录最终一次 |
| E2 | 业务 | LLM 输出字符数（output_chars 写入 span metadata） | 🟢 低 | 辅助判断模型是否输出截断或异常短 |
| A3 | 成本 | TTS 成本追踪（项目引入 TTS 时顺带完成） | 🟢 低 | 架构与 ASR 完全一致 |

### obs — 暂缓（P3）

| ID | 分类 | 内容 | 难度 | 说明 |
|----|------|------|------|------|
| F1 | 性能 | 并发请求数 / 队列深度（进程内计数器 + 周期 flush） | 🔴 高 | 复杂度高，收益有限 |
| G1 | 质量 | ASR 置信度 score（各家 API 返回时） | 🔴 高 | 各家格式差异大 |
| G2 | 质量 | Prompt 模板版本标记 | 🟡 中 | 无 A/B 测试需求时暂缓 |

### 安全 Phase 2 — 结构性修复（待讨论策略）

| ID | 分类 | 内容 | 难度 | 说明 |
|----|------|------|------|------|
| S3 | 安全 | Prompt Injection 防护策略（系统 prompt 隔离 + 输入特征过滤） | 🟡 中 | 有业务侵入性，需先确认防护边界再动手 |
| S4 | 安全 | wiki ingest RAG 投毒防护（ingest 来源白名单 + 内容异常检测） | 🟡 中 | 同上，需讨论策略 |

### 安全 Phase 3 — skill 就绪 + 合规

| ID | 分类 | 内容 | 难度 | 说明 |
|----|------|------|------|------|
| skill-sec | 安全 | skill 运行时安全架构（tool 授权白名单、沙箱、execution log） | 🔴 高 | 等 skill 引入时机确定后单独设计 |
| S10 | 合规 | 音频/转写/PII 发往第三方的隐私策略与最短留存 | 🔴 高 | 需法务/合规视角介入 |
