"""
清空所有数据并写入完整演示数据。
用法（本地）:   python scripts/seed_demo.py
用法（Docker）: docker compose exec api python scripts/seed_demo.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.database import get_sync_engine, Base
from app.models.user import User, UserRole
from app.models.customer import Customer, Industry
from app.models.opportunity import Opportunity, OpportunityStage
from app.models.requirement import Requirement, RequirementStatus
from app.models.solution import Solution, SolutionStatus
from app.models.gen_job import GenJob, AgentType, JobStatus
from app.models.deliverable import Deliverable, DeliverableType, DeliverableStatus
from app.models.audit_log import AuditLog
from app.models.system_setting import SystemSetting
from app.services.auth_service import hash_password

engine = get_sync_engine()
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# ─────────────────────────────────────────────
# 1. 清空所有业务数据（按 FK 依赖顺序）
# ─────────────────────────────────────────────
print("🗑️  清空所有数据...")
db.execute(text("TRUNCATE TABLE audit_logs, deliverables, gen_jobs, solutions, requirements, opportunities, customers, users, system_settings RESTART IDENTITY CASCADE"))
db.commit()
print("✓ 已清空")

# 工具函数
def dt(days_ago=0, hours_ago=0):
    return datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours_ago)

# ─────────────────────────────────────────────
# 2. 用户
# ─────────────────────────────────────────────
print("👥 创建用户...")
admin = User(email="admin@presale.ai",   name="系统管理员", hashed_password=hash_password("admin123"), role=UserRole.admin,     is_active=True, created_at=dt(60))
zhang = User(email="lihua@presale.ai",  name="李华",       hashed_password=hash_password("demo123"),  role=UserRole.senior_sa, is_active=True, created_at=dt(55))
li    = User(email="lhy@presale.ai",    name="李鸿宇",     hashed_password=hash_password("demo123"),  role=UserRole.senior_sa, is_active=True, created_at=dt(50))
wang  = User(email="wsh@presale.ai",    name="汪水华",     hashed_password=hash_password("demo123"),  role=UserRole.sa,        is_active=True, created_at=dt(45))
chen  = User(email="zps@presale.ai",    name="朱培森",     hashed_password=hash_password("demo123"),  role=UserRole.sa,        is_active=True, created_at=dt(30))

for u in [admin, zhang, li, wang, chen]:
    db.add(u)
db.flush()
print(f"  ✓ {5} 名用户")

# ─────────────────────────────────────────────
# 3. 系统配置
# ─────────────────────────────────────────────
for key, val in [
    ("company_name", "CloudNative Solutions"),
    ("default_llm", "claude-sonnet-4-6"),
    ("rag_top_k", "3"),
    ("agent_timeout_minutes", "10"),
    ("audit_log_enabled", "true"),
    ("auto_knowledge_base", "true"),
    ("max_concurrent_generations", "5"),
]:
    db.add(SystemSetting(key=key, value=val, updated_by=admin.id))
db.flush()

# ─────────────────────────────────────────────
# 4. 客户
# ─────────────────────────────────────────────
print("🏦 创建客户...")

icbc = Customer(
    name="中国工商银行", industry=Industry.bank_state, tier="国有大行",
    description="中国最大的商业银行，科技部主导全行云原生转型，2025年云原生覆盖率目标80%。总资产超45万亿，全国网点2.3万个，IT人员8000+。",
    contacts=[
        {"name": "徐伟", "title": "科技部总经理", "phone": "010-6610****", "email": "xu.wei@icbc.com.cn"},
        {"name": "刘晓峰", "title": "基础架构部总监", "phone": "010-6610****", "email": "liu.xf@icbc.com.cn"},
        {"name": "张磊", "title": "云平台负责人", "phone": "010-6610****"},
    ],
    owner_id=zhang.id, created_by=zhang.id, created_at=dt(50),
)

cmb = Customer(
    name="招商银行", industry=Industry.bank_commercial, tier="股份制银行",
    description="国内零售银行标杆，金融科技投入连续5年行业第一。以'科技银行'为战略，DevOps成熟度高，正在推进微服务全面治理。",
    contacts=[
        {"name": "王建国", "title": "首席技术官", "phone": "0755-8396****", "email": "wang.jg@cmbchina.com"},
        {"name": "陈思远", "title": "平台工程部总监", "phone": "0755-8396****"},
    ],
    owner_id=zhang.id, created_by=zhang.id, created_at=dt(45),
)

shb = Customer(
    name="上海银行", industry=Industry.bank_city, tier="城商行",
    description="上海本地最大城商行，近年来加大金融科技投入，正规划新核心系统建设与云原生迁移，等保三级认证在建。",
    contacts=[
        {"name": "赵明", "title": "科技条线副行长", "phone": "021-6363****"},
        {"name": "孙丽", "title": "信息技术部总经理", "phone": "021-6363****", "email": "sun.li@shbank.com"},
    ],
    owner_id=li.id, created_by=li.id, created_at=dt(40),
)

clic = Customer(
    name="中国人寿保险", industry=Industry.insurance, tier="头部险企",
    description="国内最大寿险公司，总资产超5万亿，年IT投入超百亿。'十四五'期间重点推进研发效能提升和容器化改造，已完成30%容器化。",
    contacts=[
        {"name": "周强", "title": "首席信息官(CIO)", "phone": "010-6363****"},
        {"name": "吴晓东", "title": "云计算中心主任", "phone": "010-6363****", "email": "wu.xd@chinalife.com.cn"},
        {"name": "马静", "title": "安全合规部总监", "phone": "010-6363****"},
    ],
    owner_id=li.id, created_by=li.id, created_at=dt(38),
)

citic_sec = Customer(
    name="中信证券", industry=Industry.securities, tier="头部券商",
    description="国内最大证券公司，佣金收入连续10年行业第一。正在推进新一代交易系统云原生改造，对低延迟和高可用要求极高（99.999%）。",
    contacts=[
        {"name": "林海", "title": "技术委员会主席", "phone": "010-6093****"},
        {"name": "陈光辉", "title": "基础设施总监", "phone": "010-6093****", "email": "chen.gh@citics.com"},
    ],
    owner_id=wang.id, created_by=wang.id, created_at=dt(35),
)

huaxia = Customer(
    name="华夏基金管理", industry=Industry.fund, tier="头部公募",
    description="国内规模前五的公募基金公司，管理规模超1.5万亿。IT基础设施老化，正规划私有云建设，实现资源池化和敏捷交付。",
    contacts=[
        {"name": "刘芳", "title": "总经理助理/CIO", "phone": "010-8573****"},
        {"name": "郑伟", "title": "IT基础部门总监", "phone": "010-8573****"},
    ],
    owner_id=zhang.id, created_by=zhang.id, created_at=dt(28),
)

customers = [icbc, cmb, shb, clic, citic_sec, huaxia]
for c in customers:
    db.add(c)
db.flush()
print(f"  ✓ {len(customers)} 家客户")

# ─────────────────────────────────────────────
# 5. 商机
# ─────────────────────────────────────────────
print("💼 创建商机...")

# 工商银行
opp_icbc1 = Opportunity(
    customer_id=icbc.id, name="核心系统云原生改造", stage=OpportunityStage.proposal,
    value=18500000, expected_close=datetime(2025, 6, 30).date(),
    key_requirements="核心交易系统容器化改造，目标覆盖率≥80%，等保三级合规，信创适配（飞腾+麒麟），生产集群高可用，RTO<30min",
    owner_ids=[str(zhang.id), str(li.id)], created_by=zhang.id, created_at=dt(48),
)
opp_icbc2 = Opportunity(
    customer_id=icbc.id, name="DevOps平台建设", stage=OpportunityStage.won,
    value=6800000, expected_close=datetime(2025, 3, 31).date(),
    key_requirements="建设统一CI/CD流水线，支持千人研发团队，与现有ITSM系统集成",
    owner_ids=[str(zhang.id)], created_by=zhang.id, created_at=dt(90),
)

# 招商银行
opp_cmb1 = Opportunity(
    customer_id=cmb.id, name="微服务治理平台升级", stage=OpportunityStage.customer_report,
    value=9200000, expected_close=datetime(2025, 5, 15).date(),
    key_requirements="现有800+微服务治理能力升级，服务网格引入，可观测性平台建设，混沌工程集成",
    owner_ids=[str(zhang.id), str(wang.id)], created_by=zhang.id, created_at=dt(40),
)
opp_cmb2 = Opportunity(
    customer_id=cmb.id, name="安全合规体系升级", stage=OpportunityStage.req_confirm,
    value=4500000, expected_close=datetime(2025, 8, 31).date(),
    key_requirements="容器运行时安全，镜像供应链安全，等保三级复测，零信任架构改造",
    owner_ids=[str(li.id)], created_by=li.id, created_at=dt(25),
)

# 上海银行
opp_shb1 = Opportunity(
    customer_id=shb.id, name="新核心系统云原生规划", stage=OpportunityStage.initial,
    value=22000000, expected_close=datetime(2025, 12, 31).date(),
    key_requirements="新一代核心银行系统架构规划，分布式微服务，容器化部署，预计3年实施周期",
    owner_ids=[str(li.id)], created_by=li.id, created_at=dt(18),
)

# 中国人寿
opp_clic1 = Opportunity(
    customer_id=clic.id, name="研发效能提升专项", stage=OpportunityStage.proposal,
    value=7600000, expected_close=datetime(2025, 7, 31).date(),
    key_requirements="DevOps工具链整合，容器化率从30%提升至70%，发布频率从月度到周度，研发团队1500人",
    owner_ids=[str(li.id), str(chen.id)], created_by=li.id, created_at=dt(35),
)
opp_clic2 = Opportunity(
    customer_id=clic.id, name="私有云资源池建设", stage=OpportunityStage.lost,
    value=15000000, expected_close=datetime(2024, 12, 31).date(),
    key_requirements="大规模资源池建设，KVM虚拟化改造，统一资源调度",
    owner_ids=[str(li.id)], created_by=li.id, created_at=dt(120),
)

# 中信证券
opp_citic1 = Opportunity(
    customer_id=citic_sec.id, name="新一代交易系统云原生改造", stage=OpportunityStage.won,
    value=13800000, expected_close=datetime(2025, 1, 31).date(),
    key_requirements="核心交易系统容器化，低延迟<1ms，高可用99.999%，实时风控系统迁移",
    owner_ids=[str(wang.id)], created_by=wang.id, created_at=dt(100),
)

# 华夏基金
opp_huaxia1 = Opportunity(
    customer_id=huaxia.id, name="私有云基础设施建设", stage=OpportunityStage.req_confirm,
    value=8900000, expected_close=datetime(2025, 9, 30).date(),
    key_requirements="私有云平台建设，IaaS+PaaS层统一，计算/存储/网络资源池化，运维自动化",
    owner_ids=[str(zhang.id), str(chen.id)], created_by=zhang.id, created_at=dt(20),
)

opps = [opp_icbc1, opp_icbc2, opp_cmb1, opp_cmb2, opp_shb1, opp_clic1, opp_clic2, opp_citic1, opp_huaxia1]
for o in opps:
    db.add(o)
db.flush()
print(f"  ✓ {len(opps)} 个商机")

# ─────────────────────────────────────────────
# 6. 需求
# ─────────────────────────────────────────────
print("📋 创建需求...")

def req_content_bank_core():
    return {
        "industry": "bank_state",
        "current_containerization": "22%",
        "target_containerization": "80%以上",
        "cluster_count": 5,
        "cluster_detail": "生产主集群×2（同城双活）、生产DR集群×1、测试集群×1、开发集群×1",
        "budget_range": "1500-2000万",
        "compliance": ["等保三级", "信创适配", "金融监管合规（银保监、人行）", "数据安全法"],
        "modules": ["容器平台（Kubernetes）", "DevOps平台", "微服务治理（Service Mesh）", "中间件服务（消息/缓存/数据库）", "可观测性平台"],
        "key_contacts": [
            {"name": "徐伟", "title": "科技部总经理", "influence": "决策者"},
            {"name": "刘晓峰", "title": "基础架构部总监", "influence": "技术评估"},
        ],
        "pain_points": "发布周期长（月度发布），资源利用率极低（CPU均值<18%），运维效率低，故障恢复慢（平均4小时），人工运维比例高",
        "tech_stack_current": "VMware vSphere 6.7 + OpenStack部分区域，主要应用为JavaEE单体架构，Oracle数据库为主",
        "decision_timeline": "2025年Q2评标，Q3签约，Q4启动实施",
    }

def req_content_devops():
    return {
        "industry": "bank_commercial",
        "current_containerization": "45%",
        "target_containerization": "75%",
        "cluster_count": 3,
        "cluster_detail": "生产集群×1、预发/测试集群×1、开发集群×1",
        "budget_range": "800-1200万",
        "compliance": ["等保三级", "金融行业安全合规"],
        "modules": ["CI/CD流水线", "代码质量门禁", "制品库管理", "环境管理", "发布管理", "配置管理（CMDB）"],
        "key_contacts": [
            {"name": "王建国", "title": "首席技术官", "influence": "决策者"},
            {"name": "陈思远", "title": "平台工程部总监", "influence": "技术负责人"},
        ],
        "pain_points": "800+微服务发布效率低，各团队工具链割裂（15套不同流水线），测试覆盖率低（<35%），部署成功率92%（目标99.5%）",
        "tech_stack_current": "Jenkins（多版本混用）+GitLab+Nexus，部分团队使用ArgoCD",
        "decision_timeline": "2025年Q2签约，Q3上线一期",
    }

def req_content_security():
    return {
        "industry": "bank_commercial",
        "current_containerization": "45%",
        "target_containerization": "60%",
        "cluster_count": 2,
        "cluster_detail": "生产集群×1、测试集群×1",
        "budget_range": "400-600万",
        "compliance": ["等保三级", "容器安全基线", "CIS Benchmark", "OWASP Top10"],
        "modules": ["镜像安全扫描", "运行时安全监控", "网络微隔离", "供应链安全", "零信任身份认证", "安全审计日志"],
        "key_contacts": [
            {"name": "马静", "title": "安全合规部总监", "influence": "技术负责人"},
        ],
        "pain_points": "镜像漏洞扫描覆盖率不足50%，容器网络访问未隔离，缺乏运行时威胁检测，等保三级复测有7个未整改项",
        "tech_stack_current": "Trivy（镜像扫描）+Falco（部分节点），缺乏统一安全管控平台",
        "decision_timeline": "2025年Q3完成整改，Q4等保复测",
    }

def req_content_securities():
    return {
        "industry": "securities",
        "current_containerization": "35%",
        "target_containerization": "70%",
        "cluster_count": 4,
        "cluster_detail": "核心交易生产集群×2（同城双活）、灾备集群×1、测试集群×1",
        "budget_range": "1200-1600万",
        "compliance": ["等保三级", "证监会监管要求", "交易所技术规范"],
        "modules": ["低延迟容器平台", "实时风控微服务", "行情数据中台", "交易撮合引擎容器化", "运维自动化平台"],
        "key_contacts": [
            {"name": "林海", "title": "技术委员会主席", "influence": "决策者"},
            {"name": "陈光辉", "title": "基础设施总监", "influence": "技术评估"},
        ],
        "pain_points": "核心交易系统部署在物理机，弹性扩容需要2小时，交易峰值资源不足导致延迟抖动，运维手工操作比例高达70%",
        "tech_stack_current": "物理机（IBM小机+x86）为主，部分边缘应用使用Docker，网络为DPDK加速",
        "decision_timeline": "2025年Q1签约（已中标），Q2启动实施",
    }

def req_content_insurance():
    return {
        "industry": "insurance",
        "current_containerization": "30%",
        "target_containerization": "70%",
        "cluster_count": 4,
        "cluster_detail": "生产集群×2、测试集群×1、开发集群×1",
        "budget_range": "700-900万",
        "compliance": ["等保三级", "银保监会合规要求", "个人信息保护法"],
        "modules": ["容器平台", "DevOps工具链", "镜像仓库", "配置中心", "统一日志平台", "APM监控"],
        "key_contacts": [
            {"name": "周强", "title": "首席信息官", "influence": "决策者"},
            {"name": "吴晓东", "title": "云计算中心主任", "influence": "技术负责人"},
        ],
        "pain_points": "1500名研发人员，发布效率低，月度大版本发布风险高，测试环境紧张（排队等待平均3天），容器化率仅30%",
        "tech_stack_current": "自研PaaS平台（老化），部分应用使用Kubernetes，Jenkins CI/CD",
        "decision_timeline": "2025年Q2立项审批，Q3启动",
    }

def req_content_fund():
    return {
        "industry": "fund",
        "current_containerization": "10%",
        "target_containerization": "50%",
        "cluster_count": 3,
        "cluster_detail": "生产集群×1、测试集群×1、开发集群×1",
        "budget_range": "800-1000万",
        "compliance": ["等保二级", "证监会基金监管要求"],
        "modules": ["计算资源池（KVM+容器混合）", "存储资源池（Ceph）", "网络虚拟化（SDN）", "统一运维门户", "计量计费系统"],
        "key_contacts": [
            {"name": "刘芳", "title": "总经理助理/CIO", "influence": "决策者"},
            {"name": "郑伟", "title": "IT基础部门总监", "influence": "技术评估"},
        ],
        "pain_points": "基础设施烟囱式建设，资源利用率低（CPU<15%），扩容周期长（需采购，周期3-6个月），缺乏统一管理平台",
        "tech_stack_current": "VMware vSphere + 少量物理机，存储以SAN/NAS为主，网络传统三层架构",
        "decision_timeline": "2025年Q3招标，Q4签约",
    }

# 需求列表
req_icbc1 = Requirement(
    opportunity_id=opp_icbc1.id, version=1,
    title="工商银行核心系统云原生改造 — 需求规格书 v1.2",
    status=RequirementStatus.confirmed, completeness=0.92,
    content=req_content_bank_core(),
    raw_input="根据2月17日与徐总监、刘总监的需求调研会议纪要整理。核心诉求：核心系统容器化，等保三级，信创兼容，同城双活，建设周期18个月。预算上限2000万，需提供5年TCO分析。",
    confirmed_at=dt(20), confirmed_by=zhang.id, created_by=zhang.id, created_at=dt(30),
)

req_icbc1v2 = Requirement(
    opportunity_id=opp_icbc1.id, version=2,
    title="工商银行核心系统云原生改造 — 需求规格书 v2.0",
    status=RequirementStatus.confirmed, completeness=0.97,
    content={**req_content_bank_core(), "budget_range": "1800-2200万", "cluster_count": 6,
              "cluster_detail": "生产主集群×2（同城双活）、生产DR集群×1、测试集群×2、开发集群×1",
              "decision_timeline": "2025年Q2评标，Q3签约",},
    raw_input="基于v1.2版本，经客户第二轮沟通更新：预算上调至2000万以上，新增异地灾备集群需求，等保三级已启动自评。",
    confirmed_at=dt(8), confirmed_by=zhang.id, created_by=zhang.id, created_at=dt(15),
)

req_icbc2 = Requirement(
    opportunity_id=opp_icbc2.id, version=1,
    title="工商银行DevOps平台建设需求",
    status=RequirementStatus.confirmed, completeness=0.88,
    content=req_content_devops(),
    raw_input="DevOps平台建设，支持全行8000名研发人员，实现从代码提交到生产部署全流程自动化。",
    confirmed_at=dt(70), confirmed_by=zhang.id, created_by=zhang.id, created_at=dt(80),
)

req_cmb1 = Requirement(
    opportunity_id=opp_cmb1.id, version=1,
    title="招商银行微服务治理平台升级需求",
    status=RequirementStatus.confirmed, completeness=0.85,
    content=req_content_devops(),
    raw_input="微服务数量800+，服务网格引入（Istio），全链路可观测性，混沌工程平台建设。",
    confirmed_at=dt(25), confirmed_by=zhang.id, created_by=zhang.id, created_at=dt(32),
)

req_cmb2 = Requirement(
    opportunity_id=opp_cmb2.id, version=1,
    title="招商银行容器安全合规升级需求",
    status=RequirementStatus.draft, completeness=0.63,
    content=req_content_security(),
    raw_input="初步需求：等保三级复测前需完成7个未整改项，容器安全管控平台建设。具体技术方案待与安全部门确认。",
    created_by=li.id, created_at=dt(12),
)

req_clic1 = Requirement(
    opportunity_id=opp_clic1.id, version=1,
    title="中国人寿研发效能提升专项需求",
    status=RequirementStatus.confirmed, completeness=0.90,
    content=req_content_insurance(),
    raw_input="1500名研发人员，DevOps平台整合，容器化率提升至70%，建设周期12个月，一期完成DevOps工具链整合。",
    confirmed_at=dt(15), confirmed_by=li.id, created_by=li.id, created_at=dt(22),
)

req_citic1 = Requirement(
    opportunity_id=opp_citic1.id, version=1,
    title="中信证券新一代交易系统云原生改造需求",
    status=RequirementStatus.confirmed, completeness=0.95,
    content=req_content_securities(),
    raw_input="核心交易系统容器化改造，低延迟（P99<1ms），高可用（99.999%），实时风控微服务化，已中标，正式需求确认阶段。",
    confirmed_at=dt(85), confirmed_by=wang.id, created_by=wang.id, created_at=dt(92),
)

req_huaxia1 = Requirement(
    opportunity_id=opp_huaxia1.id, version=1,
    title="华夏基金私有云基础设施建设需求",
    status=RequirementStatus.draft, completeness=0.70,
    content=req_content_fund(),
    raw_input="私有云建设，IaaS层资源池化，计算/存储/网络统一管理，运维自动化。预计2025年Q3招标，当前调研阶段。",
    created_by=zhang.id, created_at=dt(10),
)

req_shb1 = Requirement(
    opportunity_id=opp_shb1.id, version=1,
    title="上海银行新核心系统架构规划需求",
    status=RequirementStatus.draft, completeness=0.45,
    content={
        "industry": "bank_city", "current_containerization": "5%",
        "target_containerization": "60%", "cluster_count": 3,
        "budget_range": "2000万以上", "compliance": ["等保三级", "金融监管"],
        "modules": ["核心银行系统", "容器平台", "分布式数据库", "API网关"],
        "pain_points": "核心系统已运行15年，架构老化，扩展性差，运维成本高",
        "decision_timeline": "2025年Q4立项审批",
    },
    created_by=li.id, created_at=dt(6),
)

reqs = [req_icbc1, req_icbc1v2, req_icbc2, req_cmb1, req_cmb2, req_clic1, req_citic1, req_huaxia1, req_shb1]
for r in reqs:
    db.add(r)
db.flush()
print(f"  ✓ {len(reqs)} 条需求")

# ─────────────────────────────────────────────
# 7. 方案 + GenJob + Deliverable
# ─────────────────────────────────────────────
print("🤖 创建方案、Agent任务、交付物...")

ARCH_CONTENT = """## 1. 架构总览
采用分层云原生架构，分为基础设施层、容器平台层、应用服务层和业务应用层。整体设计遵循"高可用、高性能、可扩展、可观测"四大原则，满足金融行业等保三级和信创适配要求。

## 2. 核心组件选型
| 组件 | 选型 | 版本 | 说明 |
|------|------|------|------|
| 容器编排 | Kubernetes | 1.28 LTS | 国产信创兼容版本 |
| 服务网格 | Istio | 1.20 | 东西向流量治理 |
| 镜像仓库 | Harbor | 2.10 | 支持镜像签名 |
| GitOps | ArgoCD | 2.9 | 声明式部署 |
| 监控 | Prometheus+Grafana | 2.48/10.2 | 全栈可观测 |
| 日志 | Elasticsearch+Fluentd | 8.11 | 结构化日志 |

## 3. 网络架构
- 集群内：Calico CNI，支持网络策略（NetworkPolicy）
- 南北向：F5 BIG-IP + Nginx Ingress Controller，TLS卸载
- 东西向：Istio Service Mesh，mTLS加密，流量熔断
- 多集群：Admiral联邦管理，跨集群服务发现

## 4. 存储架构
- Block存储：Ceph RBD（生产）/ 本地NVMe SSD（低延迟业务）
- 文件存储：CephFS（共享配置）
- 对象存储：MinIO / Ceph RADOS Gateway

## 5. 高可用设计
- 同城双活：两套生产集群Active-Active，通过F5 GTM全局负载均衡
- 跨AZ部署：每集群跨3个可用区，Pod反亲和性调度
- 异地灾备：DR集群异步复制，RPO<15min，RTO<30min
- 控制平面：etcd 3+2奇数节点，API Server多副本"""

SIZING_CONTENT = """## 1. 集群规划总览
| 集群 | 类型 | 节点数 | 用途 |
|------|------|--------|------|
| PROD-A | 生产主 | 45节点 | 核心业务 Active |
| PROD-B | 生产主 | 45节点 | 核心业务 Active |
| PROD-DR | 灾备 | 20节点 | 异地灾备 |
| TEST | 测试 | 15节点 | 预发/集成测试 |
| DEV | 开发 | 10节点 | 开发/联调 |
| **合计** | | **135节点** | |

## 2. 节点规格明细
### 生产集群（PROD-A / PROD-B 各45节点）
| 角色 | 规格 | 数量 | 配置 |
|------|------|------|------|
| Master节点 | 华为TaiShan 200 | 3 | 32vCPU / 128GB / 480GB SSD |
| Worker-计算 | 华为TaiShan 200 | 30 | 64vCPU / 256GB / 960GB SSD |
| Worker-存储 | 华为TaiShan 2280 | 8 | 32vCPU / 128GB / 3×8TB HDD+960GB SSD |
| 边界/Ingress | 华为TaiShan 200 | 4 | 32vCPU / 64GB / 480GB SSD |

## 3. 资源汇总表
| 资源类型 | 生产(A+B) | 灾备 | 测试 | 开发 | **总计** |
|----------|-----------|------|------|------|---------|
| vCPU (核) | 5760 | 1280 | 480 | 320 | **7840** |
| 内存 (TB) | 23.0 | 5.1 | 1.9 | 1.3 | **31.3** |
| 存储 (TB) | 768 | 192 | 96 | 48 | **1104** |

## 4. 扩容预留
- 近期（1年内）：各集群预留20%资源作为扩容缓冲
- 中期（3年内）：计划按30%容量递增，支持机柜扩展"""

SECURITY_CONTENT = """## 1. 等保三级合规映射
| 控制域 | 等保三级要求 | 容器平台实现方案 | 状态 |
|--------|------------|----------------|------|
| 身份认证 | 双因素认证 | Keycloak+TOTP | ✅ |
| 访问控制 | 最小权限 | Kubernetes RBAC | ✅ |
| 网络隔离 | 区域隔离 | NetworkPolicy+Istio | ✅ |
| 审计日志 | 完整审计链 | Kubernetes Audit+ES | ✅ |
| 入侵检测 | 异常行为监控 | Falco运行时安全 | ✅ |
| 数据加密 | 传输+存储加密 | TLS1.3+Vault | ✅ |

## 2. 身份认证与权限管理
- **集群RBAC**：按角色（开发/运维/安全/审计）精细化权限，禁止cluster-admin滥用
- **Service Account**：应用Pod使用专属SA，最小权限原则
- **多因素认证**：管理员操作强制MFA（硬件Key或TOTP）
- **审计追踪**：所有kubectl操作、API调用记录到ES，留存6个月

## 3. 镜像安全（供应链安全）
- **基础镜像**：使用官方Slim镜像，禁止FROM ubuntu/centos完整镜像
- **镜像扫描**：Trivy集成CI/CD，HIGH漏洞阻断流水线
- **镜像签名**：Cosign+Harbor Notary，只允许签名镜像入生产
- **准入控制**：OPA Gatekeeper强制策略（禁止privileged，强制资源限制）

## 4. 金融监管合规清单
| 监管机构 | 规范要求 | 落地措施 | 责任方 |
|----------|---------|---------|--------|
| 银保监会 | 银行业信息科技风险管理指引 | 变更管理+审批流程 | IT治理部 |
| 人民银行 | 金融行业标准 | 数据分类分级保护 | 数据安全组 |
| 等保办 | 网络安全等级保护2.0 | 三级等保测评 | 合规部 |"""

MIGRATION_CONTENT = """## 1. 迁移策略总览
采用"Strangler Fig"渐进迁移模式，分三批推进：
- **Rehost（直接迁移）**：无状态、低风险应用 → Docker化部署
- **Replatform（平台迁移）**：中间件（消息/缓存）→ 云原生替代品
- **Refactor（重构迁移）**：核心交易、账务系统 → 微服务化改造

## 2. 应用分类评估
| 类别 | 应用数量 | 迁移策略 | 迁移难度 |
|------|---------|---------|---------|
| 前台渠道应用 | 45套 | Rehost → Replatform | 低 |
| 中台服务 | 120套 | Replatform | 中 |
| 核心业务系统 | 8套 | Refactor（6个月+） | 高 |
| 批处理系统 | 30套 | Replatform | 中 |
| 数据库/中间件 | 25套 | 逐步云原生替代 | 高 |

## 3. 分阶段迁移计划
### 第一批（M1-M6）：低风险先行
- 前台渠道应用（手机银行、网银）容器化
- 开发/测试环境100%容器化
- DevOps流水线建设
- 交付物：容器平台就绪，30%应用迁移

### 第二批（M7-M12）：中间层改造
- 中台服务微服务化拆分
- 中间件云原生替代（MQ→Kafka，Cache→Redis Cluster）
- 服务网格引入
- 交付物：60%应用迁移，Service Mesh上线

### 第三批（M13-M18）：核心系统
- 核心交易系统改造（需专项评审）
- 账务/清结算系统迁移
- 全面监控覆盖
- 交付物：80%+容器化，等保三级通过"""

PLAN_CONTENT = """## 1. 项目里程碑计划
| 里程碑 | 时间节点 | 关键交付物 | 验收标准 |
|--------|---------|-----------|---------|
| M0 项目启动 | W1-W2 | 项目章程、团队组建 | PMO审批 |
| M1 基础设施就绪 | W1-W8 | 网络/存储/服务器部署 | 联调测试通过 |
| M2 平台建设 | W3-W16 | K8s集群+周边组件 | 压测达标 |
| M3 试点迁移 | W10-W20 | 10个低风险应用迁移 | UAT验收 |
| M4 批量迁移 | W16-W36 | 80%应用容器化 | 生产稳定运行 |
| M5 等保认证 | W30-W40 | 等保三级测评通过 | 测评报告 |
| M6 项目收尾 | W40-W44 | 运维移交、文档归档 | 验收报告 |

## 2. 团队配置
| 角色 | 人数 | 职责 |
|------|------|------|
| 项目经理 | 1 | 整体协调、风险管控 |
| 架构师（甲方+乙方） | 4 | 架构设计、技术决策 |
| 平台工程师 | 6 | 集群建设、运维 |
| 应用改造工程师 | 8 | 应用迁移、微服务改造 |
| 安全工程师 | 2 | 等保合规、渗透测试 |
| 测试工程师 | 4 | 性能测试、回归测试 |
| 培训讲师 | 1 | 客户运维团队培训 |

## 3. 风险管控矩阵
| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 核心系统停机 | 低 | 极高 | 蓝绿发布+充分演练 |
| 资源到货延迟 | 中 | 高 | 提前3个月备货 |
| 等保测评不通过 | 低 | 高 | 预评估+提前整改 |
| 人员流失 | 低 | 中 | 关键节点知识备份 |"""

PRICING_CONTENT = """## 1. 报价总览
| 类别 | 金额（万元） | 占比 |
|------|------------|------|
| 服务器硬件 | 780 | 42.2% |
| 网络设备 | 120 | 6.5% |
| 存储设备 | 180 | 9.7% |
| 软件许可 | 280 | 15.1% |
| 实施服务 | 280 | 15.1% |
| 培训服务 | 40 | 2.2% |
| 运维支持（3年） | 170 | 9.2% |
| **合计** | **1850** | **100%** |

## 2. 硬件明细
| 设备 | 型号 | 数量 | 单价(万) | 小计(万) |
|------|------|------|---------|---------|
| 计算节点（信创） | 华为TaiShan 200 | 90 | 6.8 | 612 |
| 存储节点 | 华为TaiShan 2280 | 24 | 7.0 | 168 |
| 万兆交换机 | 华为CE6870 | 12 | 10.0 | 120 |

## 3. ROI 分析
| 指标 | 改造前 | 改造后 | 提升 |
|------|--------|--------|------|
| 服务器利用率 | 18% | 65% | +47pp |
| 发布频率 | 月度 | 每日 | 30x |
| 故障恢复时间 | 240min | 15min | 94% |
| 运维人力成本 | 1200万/年 | 600万/年 | -50% |
| **3年累计节省** | | **1800万** | |
| **投资回收期** | | **2.5年** | |

## 4. 商务策略建议
- **付款方式**：预付30%，里程碑节点付款，验收后付尾款10%
- **优惠策略**：总合同1850万，框架协议可优惠至1750万
- **延保服务**：3年原厂延保，含7×24小时响应"""

def make_jobs(sol, agent_results, status_map, start_offset_h=48):
    """创建所有 Agent GenJob 记录"""
    jobs = []
    for at in AgentType:
        js = status_map.get(at.value, JobStatus.done)
        started = dt(0, hours_ago=start_offset_h - list(AgentType).index(at))
        finished = started + timedelta(minutes=2, seconds=30)
        result_text = agent_results.get(at.value)
        j = GenJob(
            solution_id=sol.id, agent_type=at, status=js,
            progress=1.0 if js == JobStatus.done else (0.6 if js == JobStatus.running else 0.0),
            result={"content": result_text} if result_text and js == JobStatus.done else None,
            started_at=started if js != JobStatus.pending else None,
            finished_at=finished if js == JobStatus.done else None,
            created_at=dt(2),
        )
        jobs.append(j)
        db.add(j)
    return jobs

def make_deliverables(sol, types_status: dict):
    """创建交付物记录"""
    for dtype, dstatus in types_status.items():
        file_sizes = {"word_tech": 2457600, "ppt_overview": 5242880, "ppt_exec": 3145728,
                      "ppt_container": 4194304, "ppt_devops": 3932160, "ppt_security": 4456448}
        pages_map = {"word_tech": 48, "ppt_overview": 32, "ppt_exec": 18,
                     "ppt_container": 28, "ppt_devops": 24, "ppt_security": 26}
        dl = Deliverable(
            solution_id=sol.id, type=DeliverableType(dtype), status=DeliverableStatus(dstatus),
            file_name=f"{dtype}_{sol.id.hex[:8]}.{'docx' if dtype=='word_tech' else 'pptx'}" if dstatus == "ready" else None,
            file_path=f"solutions/{sol.id}/{dtype}.{'docx' if dtype=='word_tech' else 'pptx'}" if dstatus == "ready" else None,
            file_size=file_sizes.get(dtype) if dstatus == "ready" else None,
            pages=pages_map.get(dtype) if dstatus == "ready" else None,
            download_count=(2 if dstatus == "ready" else 0),
            created_at=dt(1),
        )
        db.add(dl)

all_agents_done = {at.value: JobStatus.done for at in AgentType}
all_agent_content = {
    "arch": ARCH_CONTENT, "sizing": SIZING_CONTENT, "security": SECURITY_CONTENT,
    "migration": MIGRATION_CONTENT, "plan": PLAN_CONTENT, "pricing": PRICING_CONTENT,
}
all_dlv_ready = {dt.value: "ready" for dt in DeliverableType}

# ── 方案1: 已审批，工商银行 v2.0 需求（完整方案，所有交付物就绪）
sol1 = Solution(
    requirement_id=req_icbc1v2.id, version="1.0",
    status=SolutionStatus.approved, is_current=True,
    change_note="基于最新需求规格书v2.0生成，覆盖6个Agent全维度",
    content=all_agent_content, created_by=zhang.id, created_at=dt(12),
)
db.add(sol1); db.flush()
make_jobs(sol1, all_agent_content, all_agents_done, start_offset_h=288)
make_deliverables(sol1, all_dlv_ready)

# ── 方案2: 已审批 v1.1，工商银行v1.0需求（历史版本）
sol2 = Solution(
    requirement_id=req_icbc1.id, version="1.0",
    status=SolutionStatus.approved, is_current=True,
    change_note="首版方案，基于需求v1.2生成",
    content=all_agent_content, created_by=zhang.id, created_at=dt(25),
)
db.add(sol2); db.flush()
make_jobs(sol2, all_agent_content, all_agents_done, start_offset_h=600)
make_deliverables(sol2, all_dlv_ready)

# ── 方案3: 审核中，招商银行微服务治理
sol3 = Solution(
    requirement_id=req_cmb1.id, version="1.0",
    status=SolutionStatus.reviewing, is_current=True,
    change_note="初版方案，等待内部技术审核",
    content=all_agent_content, created_by=zhang.id, created_at=dt(5),
)
db.add(sol3); db.flush()
make_jobs(sol3, all_agent_content, all_agents_done, start_offset_h=120)
make_deliverables(sol3, {dt.value: "ready" for dt in DeliverableType})

# ── 方案4: 草稿，中国人寿
sol4 = Solution(
    requirement_id=req_clic1.id, version="1.0",
    status=SolutionStatus.draft, is_current=True,
    change_note="AI自动生成，待架构师审核修改",
    content=all_agent_content, created_by=li.id, created_at=dt(3),
)
db.add(sol4); db.flush()
make_jobs(sol4, all_agent_content, all_agents_done, start_offset_h=72)
make_deliverables(sol4, {
    "word_tech": "ready", "ppt_overview": "ready",
    "ppt_exec": "generating", "ppt_container": "generating",
    "ppt_devops": "generating", "ppt_security": "generating",
})

# ── 方案5: 已审批，中信证券（生产上线项目存档）
sol5 = Solution(
    requirement_id=req_citic1.id, version="1.0",
    status=SolutionStatus.approved, is_current=False,
    change_note="初版方案",
    content=all_agent_content, created_by=wang.id, created_at=dt(95),
)
db.add(sol5); db.flush()
make_jobs(sol5, all_agent_content, all_agents_done, start_offset_h=2280)
make_deliverables(sol5, all_dlv_ready)

sol5v2 = Solution(
    requirement_id=req_citic1.id, version="2.0",
    status=SolutionStatus.approved, is_current=True,
    change_note="根据客户反馈优化报价结构，调整低延迟存储方案",
    content=all_agent_content, created_by=wang.id, created_at=dt(80),
)
db.add(sol5v2); db.flush()
make_jobs(sol5v2, all_agent_content, all_agents_done, start_offset_h=1920)
make_deliverables(sol5v2, all_dlv_ready)

# ── 方案6: 已归档，DevOps（已完成项目）
sol6 = Solution(
    requirement_id=req_icbc2.id, version="1.0",
    status=SolutionStatus.archived, is_current=True,
    change_note="DevOps平台建设方案（已交付归档）",
    content=all_agent_content, created_by=zhang.id, created_at=dt(85),
    archived_at=dt(20),
)
db.add(sol6); db.flush()
make_jobs(sol6, all_agent_content, all_agents_done, start_offset_h=2040)
make_deliverables(sol6, all_dlv_ready)

# ── 方案7: 生成中（进行中，部分Agent完成）
sol7 = Solution(
    requirement_id=req_huaxia1.id, version="1.0",
    status=SolutionStatus.generating, is_current=True,
    change_note=None, content={}, created_by=zhang.id, created_at=dt(0, hours_ago=1),
)
db.add(sol7); db.flush()
make_jobs(sol7, {"arch": ARCH_CONTENT, "sizing": SIZING_CONTENT}, {
    "arch": JobStatus.done, "sizing": JobStatus.done,
    "security": JobStatus.running, "migration": JobStatus.running,
    "plan": JobStatus.pending, "pricing": JobStatus.pending,
}, start_offset_h=1)

db.flush()
print(f"  ✓ 7 个方案 + Agent任务 + 交付物")

# ─────────────────────────────────────────────
# 8. 审计日志
# ─────────────────────────────────────────────
print("📝 创建审计日志...")
audit_entries = [
    AuditLog(user_id=zhang.id, entity_type="customer",     entity_id=icbc.id,     action="create",  created_at=dt(50)),
    AuditLog(user_id=zhang.id, entity_type="opportunity",  entity_id=opp_icbc1.id, action="create", created_at=dt(48)),
    AuditLog(user_id=zhang.id, entity_type="requirement",  entity_id=req_icbc1.id, action="create", created_at=dt(30)),
    AuditLog(user_id=zhang.id, entity_type="requirement",  entity_id=req_icbc1.id, action="confirm",created_at=dt(20)),
    AuditLog(user_id=zhang.id, entity_type="requirement",  entity_id=req_icbc1v2.id,action="create",created_at=dt(15)),
    AuditLog(user_id=zhang.id, entity_type="requirement",  entity_id=req_icbc1v2.id,action="confirm",created_at=dt(8)),
    AuditLog(user_id=zhang.id, entity_type="solution",     entity_id=sol1.id,     action="create",  created_at=dt(12)),
    AuditLog(user_id=admin.id, entity_type="solution",     entity_id=sol1.id,     action="approve", created_at=dt(10)),
    AuditLog(user_id=li.id,    entity_type="customer",     entity_id=clic.id,     action="create",  created_at=dt(38)),
    AuditLog(user_id=li.id,    entity_type="solution",     entity_id=sol4.id,     action="create",  created_at=dt(3)),
    AuditLog(user_id=wang.id,  entity_type="solution",     entity_id=sol5v2.id,   action="create",  created_at=dt(80)),
    AuditLog(user_id=admin.id, entity_type="solution",     entity_id=sol5v2.id,   action="approve", created_at=dt(75)),
]
for a in audit_entries:
    db.add(a)

db.commit()

# ─────────────────────────────────────────────
# 汇总
# ─────────────────────────────────────────────
print("\n" + "="*60)
print("🎉 演示数据写入完成！")
print("="*60)
print(f"  用户:     5 名（admin/zhang/li/wang/chen）")
print(f"  客户:     6 家（国有大行/股份行/城商行/保险/证券/基金）")
print(f"  商机:     9 个（覆盖全部阶段：初步→已赢单/已输单）")
print(f"  需求:     9 条（confirmed/draft 各有）")
print(f"  方案:     7 个（approved×3/reviewing×1/draft×1/archived×1/generating×1）")
print(f"  交付物:   ~42 份（ready/generating 混合）")
print(f"  审计日志: {len(audit_entries)} 条")
print("="*60)
print("\n默认账号:")
print("  管理员: admin@presale.ai  / admin123")
print("  张志远: zhang@presale.ai  / demo123")
print("  李明:   li@presale.ai     / demo123")
print("  王芳:   wang@presale.ai   / demo123")
print("  陈静:   chen@presale.ai   / demo123")

db.close()
