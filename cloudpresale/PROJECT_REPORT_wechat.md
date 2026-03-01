# SolveIQ 方案智能协同平台

> 🌐 **在线体验**：http://106.54.237.35
> 📦 **代码仓库**：https://github.com/hualeel/cloudpresale
> 👤 请联系管理员获取演示账号

---

## 平台定位

面向云原生售前团队的 **AI 驱动方案生成与协同系统**。传统方案需架构师、安全、容量等多专家协作 3~7 天，质量参差不齐，历史经验难以复用。本平台通过 **6 个 AI Agent 并行协作**，**3~5 分钟**自动生成架构 · 安全 · 容量 · 迁移 · 实施 · 报价六大维度完整方案，输出 Word 技术文档 + 6 套差异化 PPT，支持 ZIP 一键打包下载，效率提升 **100 倍以上**。

## 核心模块

客户 / 商机 / 需求 / 方案四维全生命周期管理 · AI 方案生成（实时进度可视）· Word + 6 套 PPT + ZIP 打包下载 · 双 LLM 动态配置 · 商机 Kanban 看板 · 团队成员绩效（本月方案数/负责商机数）· 全操作审计日志

## ⚡ 六大亮点

**① 多 Agent 并行架构** — ThreadPoolExecutor 并发驱动 6 Agent，60~90 秒完成全套方案，较传统串行提速 6 倍，各 Agent 独立专业提示词确保内容深度

**② RAG 知识库沉淀** — 审批方案自动向量化入库 ChromaDB，生成时检索 Top-K 相似案例注入 Prompt，组织经验持续资产化，越用越精准

**③ 双 LLM 提供商** — 原生支持 Claude（claude-sonnet-4-6）& DeepSeek（deepseek-chat / reasoner），Settings 页面零停机切换，API Key 加密入库，Celery Worker 进程隔离，适配国内外网络与成本差异

**④ 全版本生命周期** — 生成中 → 草稿 → 审核中 → 已审批 → 归档，语义版本自动递增，多版本并存，审批后自动沉淀 RAG

**⑤ 企业级安全** — JWT + bcrypt 认证 · 4 级 RBAC（admin/senior_sa/sa/junior_sa）· 全操作审计日志（操作人/时间/变更内容）· MinIO 预签名 URL 带过期时间访问控制

**⑥ 一键全栈部署** — `docker compose up -d` 启动 7 服务，amd64 + arm64 双平台，健康检查保障依赖顺序，4 个 Volume 持久化

## 技术架构

- **后端**：FastAPI · SQLAlchemy 2.0 · PostgreSQL 16 · Celery · Redis · Alembic
- **存储**：MinIO（对象存储）· ChromaDB（RAG 向量检索）
- **AI & 文档**：Anthropic SDK · OpenAI SDK（DeepSeek）· python-docx · python-pptx
- **前端**：React 19 · TypeScript · Vite 7 · Zustand · Nginx

## 数据模型

`Customer → Opportunity → Requirement → Solution（版本化）→ Deliverable（Word/PPT）`
`                                                        └── GenJob（Agent 实时进度）`

商机支持多成员分配（many-to-many），AuditLog 记录全操作，SystemSetting 支持 KV 动态配置。

## AI 生成流程

需求确认 → Celery 异步任务 → ChromaDB RAG 检索 Top-K → 6 Agent 并发调用 LLM → 实时进度回写 GenJob → 合并结果写入 Solution.content（JSONB）→ 触发 Word + PPT 生成 → 上传 MinIO 预签名 → 状态置为 draft

## 演示数据

金融行业预置场景：工商银行 / 招商银行 / 上海银行 / 中国人寿 / 中信证券 / 华夏基金，共 **6 家客户 · 9 个商机（覆盖线索→成交全阶段）· 9 条需求（含合规/规模字段全量填充）· 7 份方案（含已审批/审核中/草稿多状态）· 42 份交付物**，覆盖全部功能模块。

---
*SolveIQ 方案智能协同平台 — From Requirements to Solutions, Powered by AI*
