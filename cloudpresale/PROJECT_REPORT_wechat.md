**SolveIQ 方案智能协同平台**
🌐 在线体验：http://106.54.237.35 | 请联系管理员获取演示账号
📦 代码仓库：https://github.com/hualeel/cloudpresale

**平台定位**
面向云原生解决方案售前团队的 AI 驱动方案生成与协同系统。传统方案制作需架构师、安全、容量等多专家协作 3~7 天，质量参差不齐，历史经验难以沉淀复用。本平台通过 6 个 AI Agent 并行协作，3~5 分钟内自动生成架构设计、安全合规、容量规划、迁移策略、实施计划、商务报价六大维度完整方案，同步输出 Word 技术文档 + 6 套差异化 PPT（总体汇报/容器平台/DevOps/高管摘要/安全合规/执行计划），支持 ZIP 一键打包下载，效率较人工提升 100 倍以上。

**核心模块**
客户/商机/需求/方案四维全生命周期管理 · AI 方案生成（6 Agent 并行，实时进度可视）· 交付物管理（Word+6 套 PPT+ZIP 批量打包下载）· LLM 双模型动态配置 · 团队成员绩效与权限管理 · 结构化需求录入与版本追溯

**六大核心亮点**
① 多 Agent 并行架构：6 个专业 Agent 由 ThreadPoolExecutor 并发驱动，总耗时压缩至单次 LLM 量级（约 60~90 秒），较传统串行方案提速 6 倍，各 Agent 独立专业提示词确保内容深度
② RAG 知识库沉淀：方案审批后自动提取文本向量化入库 ChromaDB，生成新方案时检索 Top-K 相似历史案例注入 Prompt，组织知识持续资产化，越用越精准，形成正向飞轮
③ 双 LLM 提供商：原生支持 Claude（claude-sonnet-4-6）和 DeepSeek（deepseek-chat / deepseek-reasoner），Settings 页面零停机动态切换，API Key 加密入库，适配国内外网络与成本差异
④ 全生命周期版本管理：状态流转 生成中→草稿→审核中→已审批→归档，语义版本号自动递增，多版本并存可随时回溯，审批方案自动沉淀 RAG
⑤ 企业级安全设计：JWT + bcrypt 认证，4 级 RBAC（admin/senior_sa/sa/junior_sa），全操作审计日志记录操作人与变更内容，MinIO 预签名 URL 带过期时间管控文件访问
⑥ 一键全栈容器化：docker compose up -d 启动 7 个服务（api/worker/frontend/postgres/redis/minio/chroma），多平台镜像（amd64+arm64），健康检查保障依赖启动顺序，4 个 Volume 持久化

**团队协同工作台**
总览仪表盘（商机漏斗/团队产出趋势/近期活动流）· 商机看板（Kanban 六阶段拖拽）· 四级层级树状视图（客户→商机→需求→方案一屏呈现）· 团队成员绩效（本月方案数/负责商机数）· 全团队审计日志

**AI 生成流程**
需求确认 → Celery 异步任务 → ChromaDB RAG 检索 → 6 Agent 并发调用 LLM → 实时进度回写 GenJob → 合并结果写入 Solution.content（JSONB）→ 触发 Word+PPT 生成 → 上传 MinIO → 状态置为 draft

**数据模型**
Customer → Opportunity → Requirement → Solution（版本化）→ Deliverable（Word/PPT）
                                                         └── GenJob（Agent 实时进度）

**技术架构**
后端：FastAPI · SQLAlchemy 2.0 · PostgreSQL 16 · Celery · Redis · Alembic
存储：MinIO（对象存储）· ChromaDB（向量检索）
文档：python-docx · python-pptx（6 套 PPT 差异化模板）
AI：Anthropic SDK · OpenAI SDK（DeepSeek 兼容层）
前端：React 19 · TypeScript · Vite 7 · Zustand · Nginx（反向代理）

**演示数据**
预置金融行业场景：工商银行、招商银行、上海银行、中国人寿、中信证券、华夏基金 6 家客户，9 个商机（覆盖线索→成交全阶段），9 条需求（含合规/规模等字段全量填充），7 份方案（含已审批/审核中/草稿多状态），42 份交付物。
