"""
初始化数据库：创建表 + 插入初始数据（管理员账户 + 示例数据）
运行：python scripts/init_db.py

说明：
- 首次部署时运行本脚本即可完成全部初始化（建表 + Alembic stamp + 种子数据）
- 后续 Schema 变更请使用 Alembic：alembic upgrade head
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import sessionmaker

from app.database import get_sync_engine, Base
from app.models import User, Customer, Opportunity, Requirement
from app.models.user import UserRole
from app.models.customer import Industry
from app.models.opportunity import OpportunityStage
from app.models.requirement import RequirementStatus
from app.services.auth_service import hash_password

engine = get_sync_engine()

# 创建所有表
print("📦 创建数据库表...")
Base.metadata.create_all(bind=engine)
print("✓ 表创建完成")

# 将 Alembic 版本标记为最新（stamp head），确保后续 alembic upgrade 正常工作
print("📌 标记 Alembic 版本...")
try:
    from alembic.config import Config as AlembicConfig
    from alembic import command as alembic_command
    alembic_cfg = AlembicConfig(os.path.join(os.path.dirname(__file__), '..', 'alembic.ini'))
    alembic_command.stamp(alembic_cfg, 'head')
    print("✓ Alembic 已 stamp 到 head")
except Exception as e:
    print(f"⚠️  Alembic stamp 失败（可忽略）: {e}")

SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# ── 检查是否已初始化 ──
if db.query(User).count() > 0:
    print("⚠️  数据库已有数据，跳过初始化")
    db.close()
    sys.exit(0)

# ── 创建用户 ──
print("👥 创建初始用户...")
admin = User(email="admin@presale.ai", name="系统管理员", hashed_password=hash_password("admin123"), role=UserRole.admin)
zhang = User(email="zhang@presale.ai", name="张志远", hashed_password=hash_password("demo123"), role=UserRole.senior_sa)
li = User(email="li@presale.ai", name="李明", hashed_password=hash_password("demo123"), role=UserRole.sa)
wang = User(email="wang@presale.ai", name="王芳", hashed_password=hash_password("demo123"), role=UserRole.junior_sa)

for u in [admin, zhang, li, wang]:
    db.add(u)
db.flush()
print(f"✓ 创建了 4 名用户（admin 密码: admin123，其他: demo123）")

# ── 创建客户 ──
print("🏦 创建示例客户...")
abc = Customer(name="中国农业银行", industry=Industry.bank_state, tier="国有大行",
               description="中国五大国有商业银行之一，科技部主导全行云原生建设",
               contacts=[{"name": "王总监", "title": "科技部总监", "phone": "010-8888****"}],
               owner_id=zhang.id, created_by=zhang.id)
pingan = Customer(name="平安人寿保险", industry=Industry.insurance, tier="头部险企",
                  contacts=[{"name": "李CTO", "title": "首席技术官"}],
                  owner_id=li.id, created_by=li.id)
citic = Customer(name="招商证券", industry=Industry.securities, tier="头部券商",
                 owner_id=zhang.id, created_by=zhang.id)

for c in [abc, pingan, citic]:
    db.add(c)
db.flush()

# ── 创建商机 ──
print("💼 创建示例商机...")
opp1 = Opportunity(
    customer_id=abc.id,
    name="核心系统容器化改造",
    stage=OpportunityStage.proposal,
    value=12000000,
    key_requirements="核心交易系统容器化，目标≥80%，等保三级，信创（飞腾+麒麟）",
    owner_ids=[str(zhang.id), str(li.id)],
    created_by=zhang.id,
)
opp2 = Opportunity(
    customer_id=pingan.id,
    name="研发效能提升专项",
    stage=OpportunityStage.req_confirm,
    value=8000000,
    owner_ids=[str(li.id)],
    created_by=li.id,
)
opp3 = Opportunity(
    customer_id=citic.id,
    name="微服务治理平台",
    stage=OpportunityStage.customer_report,
    value=11000000,
    owner_ids=[str(zhang.id)],
    created_by=zhang.id,
)

for o in [opp1, opp2, opp3]:
    db.add(o)
db.flush()

# ── 创建需求 ──
print("📋 创建示例需求...")
req1 = Requirement(
    opportunity_id=opp1.id,
    version=1,
    title="容器化改造需求 v1.1",
    status=RequirementStatus.confirmed,
    completeness=0.87,
    content={
        "industry": "bank_state",
        "current_containerization": "20%",
        "target_containerization": "80%+",
        "cluster_count": 4,
        "cluster_detail": "生产×2，测试×1，开发×1",
        "budget_range": "1000-1500万",
        "compliance": ["等保三级", "信创适配", "金融监管合规"],
        "modules": ["容器平台", "DevOps平台", "微服务治理", "中间件服务"],
        "key_contacts": [{"name": "王总监", "title": "科技部总监"}],
        "pain_points": "发布周期长（2-4周）、资源利用率低（<30%）、运维效率低",
        "decision_timeline": "2025年Q1",
    },
    raw_input="核心系统容器化改造，目标容器化比例≥80%，等保三级合规...",
    created_by=zhang.id,
)
db.add(req1)
db.flush()

db.commit()
print("\n🎉 初始化完成！")
print("=" * 50)
print("API 文档: http://localhost:8080/docs")
print("默认账号:")
print("  管理员: admin@presale.ai / admin123")
print("  张志远: zhang@presale.ai / demo123")
print("  李明:   li@presale.ai   / demo123")
db.close()
