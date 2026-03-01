# CloudPresale AI — 项目总结报告

> 版本：v1.0 | 日期：2026-02-28

---

## 一、项目背景

### 行业痛点

云原生解决方案的售前工作极度依赖专家经验，传统模式面临以下核心挑战：

| 痛点 | 具体表现 |
|------|----------|
| **方案生成慢** | 一份完整的云原生技术方案需要架构师、安全、容量规划等多个专家协作 3~7 天 |
| **质量参差不齐** | 方案质量高度依赖个人能力，缺乏标准化模板和最佳实践沉淀 |
| **知识孤岛** | 历史成功方案分散在个人电脑，无法有效复用和传承 |
| **迭代成本高** | 客户需求变更后，全套文档需人工重写，响应速度慢 |
| **合规要求严** | 金融行业（银行、保险、证券）有严格的等保、监管合规要求，方案必须精准覆盖 |

### 项目定位

**CloudPresale AI** 是一套面向云原生解决方案销售团队的 **AI 驱动售前方案生成平台**。

通过多 Agent 并行协作、RAG 知识库检索和多模型 LLM 支持，平台能够在 **3~5 分钟内** 自动生成覆盖架构、容量、安全、迁移、实施计划、报价六大维度的完整技术方案，并自动输出 Word 技术文档和多套 PowerPoint 演示文稿。

### 目标用户

- **售前架构师**：快速生成初稿，专注高价值优化
- **销售团队**：自助生成方案摘要，提升客户响应速度
- **方案经理**：统一管理客户、商机、方案全生命周期
- **管理层**：掌握团队绩效、商机进展、转化率数据

---

## 二、功能介绍

### 2.1 客户与商机管理

**客户管理（Customer）**
- 多维客户档案：行业分类、客户等级（战略/重点/普通）、描述信息
- 支持搜索、筛选、分页浏览
- 层级树状视图：一屏展示客户 → 商机 → 需求的完整层级关系

**商机管理（Opportunity）**
- 商机看板视图（Kanban）：线索 → 资格认定 → 方案制作 → 演示 → 谈判 → 成交
- 商机金额追踪、关键需求记录
- 支持多人协作，商机可分配给多名团队成员

### 2.2 需求管理

- 结构化需求录入：自由文本 + 结构化字段并存
- AI 需求解析：自动提取关键技术指标（规模、合规要求、现有系统等）
- 需求审批流：草稿 → 确认（触发 AI 生成）
- 版本追溯：需求变更历史完整记录

### 2.3 AI 方案生成（核心功能）

一键触发 6 个专业 AI Agent **并行**生成方案，每个 Agent 聚焦一个专业维度：

| Agent | 专业领域 | 输出内容 |
|-------|----------|----------|
| **arch** | 云原生技术架构设计 | 架构总览、核心组件选型、网络/存储架构、高可用设计 |
| **sizing** | 资源规划与容量设计 | 集群规划、节点规格明细、资源汇总表、扩容预留 |
| **security** | 安全合规与等保设计 | 等保合规映射、RBAC 权限、镜像安全、数据加密 |
| **migration** | 应用迁移与上云路径 | 迁移策略、应用分类评估、分阶段计划、风险缓解 |
| **plan** | 项目实施计划 | 里程碑计划、团队配置、交付标准、风险矩阵 |
| **pricing** | 报价与商务方案 | 硬件/软件/服务报价明细、ROI 分析、商务策略 |

**实时进度追踪**：前端 2 秒轮询，实时显示各 Agent 执行状态（待执行/执行中/完成/失败）

**RAG 知识库增强**：已审批方案自动入库 ChromaDB，新方案生成时检索相似历史案例，注入上下文提升质量

### 2.4 方案版本管理

- 语义化版本控制（1.0 → 1.1 → 2.0）
- 方案状态流转：生成中 → 草稿 → 审核中 → 已审批 → 归档
- 多版本并存，一键切换当前版本
- 版本变更说明（change note）记录

### 2.5 交付物生成与下载

自动生成 7 类专业文档：

| 交付物类型 | 格式 | 内容 |
|-----------|------|------|
| 技术方案书 | Word (.docx) | 完整技术方案，含封面、目录、六大章节 |
| 总体汇报 PPT | PowerPoint (.pptx) | 管理层汇报，架构总览 + 核心亮点 |
| 容器平台 PPT | PowerPoint (.pptx) | 容器平台专项方案 |
| DevOps PPT | PowerPoint (.pptx) | CI/CD 流水线专项方案 |
| 高管摘要 PPT | PowerPoint (.pptx) | 极简风格，聚焦商业价值 |
| 安全合规 PPT | PowerPoint (.pptx) | 等保合规专项，含合规检查清单 |
| 执行计划 PPT | PowerPoint (.pptx) | 项目分阶段实施路线图 |

- 文件存储于 MinIO 对象存储，预签名 URL 安全下载
- **ZIP 批量打包下载**：一键下载方案全套文档

### 2.6 知识展示页面

- **CI/CD 流水线**：可视化展示标准 DevOps 工作流（含演示数据）
- **K8s 架构图**：展示云原生平台参考架构（含演示数据）

### 2.7 团队管理

- 多角色体系：管理员（admin）/ 架构师（sa）/ 销售（sales）/ 只读（viewer）
- 团队成员列表，支持商机分配
- 用户注册与权限管控

### 2.8 系统设置

- **LLM 配置**：支持 Claude（Anthropic）和 DeepSeek 双模型提供商，可动态切换
- **系统参数**：公司名称、Logo、联系信息等品牌配置
- API Key 安全管理（数据库加密存储，不明文展示）
- 一键连通性测试

---

## 三、项目亮点

### 3.1 多 Agent 并行架构

```
客户需求输入
     │
     ▼
┌─────────────────────────────────────────┐
│        Orchestrator (编排器)             │
│  ThreadPoolExecutor — 6 线程并行执行     │
└──┬──────┬──────┬──────┬──────┬──────────┘
   │      │      │      │      │
  arch  sizing security migration plan  pricing
   │      │      │      │      │      │
   └──────┴──────┴──────┴──────┴──────┘
                    │
              内容汇总合并
                    │
            生成 Word / PPT
```

传统串行方式需要 6 × 单次调用时间，并行架构将总耗时压缩至单个 Agent 耗时量级（约 60~90 秒）。

### 3.2 RAG 知识库自动沉淀

- 方案审批通过后自动提取文本，向量化存入 ChromaDB
- 生成新方案时，根据需求内容检索 Top-K 相似历史方案
- 历史经验自动注入 Prompt，持续提升方案质量（越用越聪明）

### 3.3 双 LLM 提供商支持

```
┌─────────────────────────────────────────┐
│          base_agent.py                  │
│                                         │
│  model.startswith("deepseek") ?         │
│   ├── YES → OpenAI SDK                  │
│   │         base_url=api.deepseek.com   │
│   └── NO  → Anthropic SDK              │
│             (claude-sonnet-4-6)         │
└─────────────────────────────────────────┘
```

- 支持 Claude（claude-sonnet-4-6）和 DeepSeek（deepseek-chat / deepseek-reasoner）
- 模型和 API Key 动态读取自数据库，Celery Worker 进程隔离安全
- 管理员可通过 Settings 页面随时切换，无需重启服务

### 3.4 完整方案版本化

同一需求可生成多个方案版本，支持：
- 语义版本号自动递增
- 历史版本归档保留
- 版本间内容对比

### 3.5 企业级安全设计

- JWT + bcrypt 认证体系
- 4 级 RBAC 权限控制（admin / sa / sales / viewer）
- 审计日志：所有关键操作记录操作人、时间、变更内容
- MinIO 预签名 URL 控制文件访问权限（带过期时间）

### 3.6 一键 Docker 部署

全栈容器化，`docker compose up -d` 一行命令启动全部服务，支持：
- 多平台镜像（linux/amd64 + linux/arm64）
- 健康检查与自动重启
- 环境变量统一配置

---

## 四、技术架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器 (Browser)                      │
│              React 19 + TypeScript + Vite                   │
│    Zustand 状态管理 | TailwindCSS | React Query              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI 后端 (Port 8080)                   │
│    路由层: /auth /customers /opportunities /requirements     │
│           /solutions /deliverables /team /settings          │
│    中间件: JWT 认证 | CORS | 审计日志                         │
└────────┬──────────────┬──────────────────┬───────────────────┘
         │              │                  │
    同步读写         异步任务            文件存储
         │              │                  │
         ▼              ▼                  ▼
┌──────────────┐ ┌────────────────┐ ┌───────────────┐
│  PostgreSQL  │ │ Celery Worker  │ │     MinIO     │
│   (数据库)   │ │  (AI 任务执行) │ │  (文档存储)   │
│              │ │                │ └───────────────┘
│  9 个数据表  │ │ ThreadPool     │
│  JSONB 内容  │ │ 6 Agent 并行   │ ┌───────────────┐
└──────────────┘ │                │ │   ChromaDB    │
                 │ Anthropic SDK  │ │  (向量检索)   │
┌──────────────┐ │ OpenAI SDK     │ │  RAG 知识库   │
│    Redis     │ └────────────────┘ └───────────────┘
│  任务队列    │
│  结果存储    │
└──────────────┘
```

### 4.2 后端技术栈

| 组件 | 技术选型 | 用途 |
|------|----------|------|
| Web 框架 | FastAPI 0.115 | RESTful API，自动 OpenAPI 文档 |
| ORM | SQLAlchemy 2.0 | 数据模型，异步兼容 |
| 数据库 | PostgreSQL 16 | 主数据存储，JSONB 存方案内容 |
| 异步任务 | Celery 5.x + Redis | AI 生成任务异步处理 |
| 对象存储 | MinIO | Word/PPT 文件存储 |
| 向量数据库 | ChromaDB | RAG 相似度检索 |
| AI SDK | anthropic + openai | 双 LLM 提供商 |
| 文档生成 | python-docx + python-pptx | Word/PPT 自动生成 |
| 认证 | JWT (python-jose) + bcrypt | 用户认证与安全 |
| 迁移 | Alembic | 数据库版本管理 |

### 4.3 前端技术栈

| 组件 | 技术选型 | 用途 |
|------|----------|------|
| 框架 | React 19 + TypeScript | 前端主框架 |
| 构建工具 | Vite 7 | 开发服务器与生产构建 |
| 状态管理 | Zustand | 全局状态（用户、Token） |
| HTTP 客户端 | Axios | API 请求，自动携带 JWT |
| 样式 | TailwindCSS | 工具类优先的 CSS 框架 |
| 路由 | React Router v6 | 单页应用路由 |
| 服务部署 | Nginx | 前端静态文件服务 + API 反向代理 |

### 4.4 数据模型关系

```
User (用户)
  │
  ├── Customer (客户)
  │     └── Opportunity (商机) ──── many-to-many ──── User (分配成员)
  │           └── Requirement (需求)
  │                 └── Solution (方案，版本化)
  │                       ├── Deliverable (交付物，Word/PPT)
  │                       └── GenJob (生成任务进度记录)
  │
  └── AuditLog (审计日志)

SystemSetting (系统配置，KV 存储)
```

### 4.5 AI 生成流程

```
1. POST /solutions  →  创建 Solution 记录（status: generating）
2. Celery Task 异步触发
3. Orchestrator 读取需求内容
4. ChromaDB 检索相似历史案例（RAG）
5. ThreadPoolExecutor 并发启动 6 个 Agent
6. 每个 Agent：
   a. 构建 Prompt（需求 + RAG 上下文）
   b. 调用 LLM API（流式输出）
   c. 更新 GenJob 进度（0% → 100%）
7. 所有 Agent 完成后，合并结果 → Solution.content（JSONB）
8. 触发文档生成（Word + 6 套 PPT）
9. 文件上传 MinIO
10. Solution.status → "draft"
```

---

## 五、部署架构

### 5.1 容器编排架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose 部署                       │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │  frontend   │    │     api     │    │     worker      │ │
│  │  nginx:80   │───▶│  uvicorn    │    │  celery worker  │ │
│  │  React SPA  │    │  :8080      │    │  concurrency=4  │ │
│  └─────────────┘    └──────┬──────┘    └────────┬────────┘ │
│                            │                    │           │
│         ┌──────────────────┼────────────────────┘           │
│         │                  │                                │
│  ┌──────▼──────┐   ┌───────▼─────┐   ┌────────────────┐   │
│  │  postgres   │   │    redis    │   │     minio      │   │
│  │  :5432      │   │    :6379    │   │  :9000 / :9001 │   │
│  │  数据库     │   │  任务队列   │   │  对象存储      │   │
│  └─────────────┘   └─────────────┘   └────────────────┘   │
│                                                             │
│  ┌─────────────┐                                           │
│  │   chroma    │                                           │
│  │   :8000     │                                           │
│  │  向量数据库  │                                           │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 网络端口映射

| 容器 | 宿主机端口 | 容器端口 | 说明 |
|------|-----------|---------|------|
| frontend | 80 | 80 | Web 入口（Nginx） |
| api | 8080 | 8080 | REST API |
| postgres | 5432 | 5432 | 数据库 |
| redis | 6379 | 6379 | 消息队列 |
| minio | 9000 | 9000 | 对象存储 API |
| minio | 9001 | 9001 | MinIO 控制台 |
| chroma | 8000 | 8000 | 向量数据库 |

### 5.3 数据持久化

| 数据卷 | 挂载路径 | 存储内容 |
|--------|---------|---------|
| postgres_data | /var/lib/postgresql/data | 业务数据 |
| redis_data | /data | 任务队列 |
| minio_data | /data | Word/PPT 文件 |
| chroma_data | /chroma/chroma | 向量索引 |

### 5.4 服务依赖关系

```
frontend → api → postgres (healthy)
                → redis    (healthy)
                → minio    (healthy)
worker   → redis (healthy)
         → postgres (healthy)
```

---

## 六、部署物料说明

### 6.1 镜像仓库

| 镜像 | Docker Hub 地址 | 支持平台 |
|------|----------------|---------|
| 后端 API + Worker | `hualeel/cloudpresale-api:latest` | linux/amd64, linux/arm64 |
| 前端 | `hualeel/cloudpresale-frontend:latest` | linux/amd64, linux/arm64 |

基础镜像（自动拉取）：
- `postgres:16-alpine`
- `redis:7-alpine`
- `minio/minio:latest`
- `chromadb/chroma:latest`

### 6.2 部署文件清单

```
cloudpresale/
├── docker-compose.yml          # 一键部署配置（核心文件）
├── .env.example                # 环境变量模板
└── backend/
    └── scripts/
        └── init_db.py          # 数据库初始化脚本
```

### 6.3 环境变量配置

创建 `.env` 文件（基于 `.env.example`）：

```bash
# ── 数据库 ────────────────────────
POSTGRES_USER=presale
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=presale_db

# ── 对象存储 ──────────────────────
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_secure_minio_password

# ── 应用安全 ──────────────────────
SECRET_KEY=your-32-char-secret-key-here!!

# ── AI 模型（至少配置一项）────────
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
# DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx（可在设置页面配置）

# ── 模型选择 ──────────────────────
DEFAULT_LLM=claude-sonnet-4-6
# DEFAULT_LLM=deepseek-chat

# ── 前端 API 地址 ─────────────────
VITE_API_URL=/api/v1            # 同域部署时使用反向代理
# VITE_API_URL=http://your-server-ip:8080/api/v1  # 跨域时使用
```

### 6.4 首次部署步骤

```bash
# 1. 获取部署文件
git clone https://github.com/your-repo/cloudpresale.git
cd cloudpresale

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入实际值

# 3. 拉取镜像并启动（首次约 2~5 分钟）
docker compose pull
docker compose up -d

# 4. 等待所有服务健康（约 30 秒）
docker compose ps

# 5. 初始化数据库（仅首次执行）
docker compose exec api python scripts/init_db.py

# 6. 访问系统
# Web 界面: http://your-server-ip
# API 文档: http://your-server-ip:8080/docs
# MinIO 控制台: http://your-server-ip:9001

# 默认管理员账号（init_db.py 创建）
# Email: admin@cloudpresale.ai
# Password: Admin@123456（请立即修改）
```

### 6.5 本地构建（可选）

如需基于源码构建镜像：

```bash
# 构建并启动（使用本地代码）
docker compose build
docker compose up -d

# 多平台构建并推送到 Docker Hub（需要 buildx）
docker buildx create --name multiplatform --driver docker-container --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag hualeel/cloudpresale-api:latest \
  --push \
  ./backend

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag hualeel/cloudpresale-frontend:latest \
  --push \
  ./cloudpresale
```

### 6.6 日常运维命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f api         # 后端日志
docker compose logs -f worker      # Celery Worker 日志
docker compose logs -f frontend    # Nginx 日志

# 重启服务
docker compose restart api
docker compose restart worker

# 更新到最新版本
docker compose pull
docker compose up -d

# 备份数据库
docker compose exec postgres pg_dump -U presale presale_db > backup.sql

# 数据库恢复
docker compose exec -T postgres psql -U presale presale_db < backup.sql

# 停止所有服务
docker compose down

# 停止并清除数据（危险！）
docker compose down -v
```

### 6.7 最低硬件要求

| 规格 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 4 核 | 8 核+ |
| 内存 | 8 GB | 16 GB+ |
| 磁盘 | 50 GB SSD | 200 GB SSD |
| 操作系统 | Linux (Ubuntu 22.04+) | Linux (Ubuntu 22.04+) |
| Docker | 24.0+ | 最新版 |
| Docker Compose | 2.20+ | 最新版 |

---

## 附录：项目代码结构

```
├── docker-compose.yml              # 部署编排
├── backend/                        # FastAPI 后端
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口
│   │   ├── api/                    # 路由层（10 个模块）
│   │   ├── models/                 # SQLAlchemy 数据模型（9 个）
│   │   ├── schemas/                # Pydantic 请求/响应模型
│   │   ├── agents/                 # AI Agent 系统
│   │   │   ├── base_agent.py       # 双 LLM 提供商执行器
│   │   │   ├── orchestrator.py     # 并行编排器
│   │   │   └── prompts.py          # 6 个 Agent 提示词
│   │   ├── document_gen/           # 文档生成
│   │   │   ├── word_generator.py   # Word 技术方案
│   │   │   ├── ppt_generator.py    # PPT 总体方案
│   │   │   ├── ppt_container.py    # PPT 容器平台
│   │   │   ├── ppt_devops.py       # PPT DevOps
│   │   │   └── ppt_security.py     # PPT 安全合规
│   │   └── services/
│   │       ├── celery_app.py       # Celery 任务定义
│   │       └── rag_service.py      # ChromaDB RAG 服务
│   └── scripts/
│       └── init_db.py              # 数据库初始化
└── cloudpresale/                   # React 前端
    ├── src/
    │   ├── pages/                  # 11 个页面组件
    │   ├── api/                    # API 客户端（types/client/index）
    │   ├── store/                  # Zustand 状态管理
    │   └── App.tsx                 # 路由配置
    └── Dockerfile                  # 前端容器构建
```

---

*CloudPresale AI — 让专业售前方案触手可及*
