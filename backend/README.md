# CloudPresale AI — 后端 API

## 快速启动（推荐 Docker Compose）

### 1. 启动依赖服务（PostgreSQL + Redis + MinIO + ChromaDB）

```bash
cd backend
docker compose up -d postgres redis minio chroma
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY 等
```

### 3. 安装 Python 依赖（需 Python 3.11/3.12）

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. 初始化数据库

```bash
# 方式A：Alembic 迁移（推荐）
alembic upgrade head

# 方式B：直接建表 + 插入示例数据
python scripts/init_db.py
```

### 5. 启动 API 服务

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

访问 http://localhost:8080/docs 查看交互式 API 文档。

---

## API 结构

```
POST   /api/v1/auth/login          用户登录
POST   /api/v1/auth/register       注册
GET    /api/v1/auth/me             当前用户

GET    /api/v1/dashboard           总览统计
GET    /api/v1/dashboard/hierarchy 四维层级树

GET    /api/v1/customers           客户列表
POST   /api/v1/customers           新建客户
GET    /api/v1/customers/{id}      客户详情
PATCH  /api/v1/customers/{id}      更新
DELETE /api/v1/customers/{id}      删除

GET    /api/v1/opportunities        商机列表
GET    /api/v1/opportunities/kanban 看板分组
POST   /api/v1/opportunities        新建商机
PATCH  /api/v1/opportunities/{id}   更新（含阶段推进）
DELETE /api/v1/opportunities/{id}   删除

GET    /api/v1/requirements         需求列表
POST   /api/v1/requirements         新建需求
PATCH  /api/v1/requirements/{id}    更新
POST   /api/v1/requirements/{id}/confirm  确认需求
DELETE /api/v1/requirements/{id}    删除

POST   /api/v1/solutions            新建方案（触发 AI 生成）
GET    /api/v1/solutions/{id}       方案详情
GET    /api/v1/solutions/{id}/progress  实时生成进度
PATCH  /api/v1/solutions/{id}/status   更新状态

GET    /api/v1/deliverables         交付物列表
POST   /api/v1/deliverables/{id}/download-url  获取下载链接
GET    /api/v1/deliverables/solution/{id}/package  整包下载

GET    /api/v1/team                 团队成员（含工作量）
PATCH  /api/v1/team/{id}            更新成员（管理员）
```

## 数据模型（四维）

```
用户 (users)
  ↓
客户 (customers)          ← 第1维
  ↓ 1:N
商机 (opportunities)      ← 第2维（附：stage 阶段跟踪）
  ↓ 1:N
需求 (requirements)       ← 第3维（附：completeness 完整度）
  ↓ 1:N
方案 (solutions)          ← 第4维（版本化，semver）
  ├── 生成任务 (gen_jobs)  ← 6个 AI Agent 并行状态
  └── 交付物 (deliverables) ← Word/PPT 文件（MinIO 存储）

操作日志 (audit_logs)     ← 全量操作跟踪
```

## 默认账号（初始化后）

| 账号 | 密码 | 角色 |
|------|------|------|
| admin@presale.ai | admin123 | 管理员 |
| zhang@presale.ai | demo123 | 高级SA |
| li@presale.ai | demo123 | SA |
| wang@presale.ai | demo123 | 初级SA |
