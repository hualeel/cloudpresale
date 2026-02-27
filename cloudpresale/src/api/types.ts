// ── 枚举 ─────────────────────────────────────────────
export type UserRole = 'admin' | 'senior_sa' | 'sa' | 'junior_sa'
export type Industry = 'bank_state' | 'bank_joint' | 'bank_city' | 'insurance' | 'securities' | 'fund' | 'other'
export type OppStage = 'initial' | 'req_confirm' | 'proposal' | 'customer_report' | 'won' | 'lost'
export type ReqStatus = 'draft' | 'confirmed' | 'archived'
export type SolStatus = 'generating' | 'draft' | 'reviewing' | 'approved' | 'archived' | 'completed' | 'failed'
export type DlvType = 'word_tech' | 'ppt_overview' | 'ppt_container' | 'ppt_devops' | 'ppt_exec' | 'ppt_security'
export type DlvStatus = 'generating' | 'ready' | 'failed'
export type AgentType = 'arch' | 'sizing' | 'security' | 'migration' | 'plan' | 'pricing'
export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

// ── 标签映射 ─────────────────────────────────────────
export const STAGE_LABEL: Record<OppStage, string> = {
  initial: '初步接触', req_confirm: '需求确认', proposal: '方案制作',
  customer_report: '客户汇报', won: '已赢单', lost: '已输单',
}
export const INDUSTRY_LABEL: Record<Industry, string> = {
  bank_state: '国有大行', bank_joint: '股份制银行', bank_city: '城商行/农商行',
  insurance: '保险', securities: '证券', fund: '基金', other: '其他',
}
export const AGENT_LABEL: Record<AgentType, string> = {
  arch: '架构设计 Agent', sizing: '规模测算 Agent', security: '安全合规 Agent',
  migration: '迁移路径 Agent', plan: '实施计划 Agent', pricing: '报价估算 Agent',
}
export const DLV_LABEL: Record<DlvType, string> = {
  word_tech: 'Word技术方案', ppt_overview: '总体方案PPT', ppt_container: '容器平台专项PPT',
  ppt_devops: 'DevOps专项PPT', ppt_exec: '高层汇报PPT', ppt_security: '安全合规专项PPT',
}
export const DLV_ICON: Record<DlvType, string> = {
  word_tech: '📘', ppt_overview: '📊', ppt_container: '📑',
  ppt_devops: '📑', ppt_exec: '🎯', ppt_security: '🔐',
}

// ── API 响应类型 ─────────────────────────────────────
export interface UserOut {
  id: string
  email: string
  name: string
  role: UserRole
  avatar: string | null
  is_active: boolean
  created_at: string
}

export interface TokenResp {
  access_token: string
  token_type: string
  user: UserOut
}

export interface CustomerOut {
  id: string
  name: string
  industry: Industry
  tier: string | null
  description: string | null
  contacts: Record<string, string>[]
  opportunity_count: number
  owner_id: string
  created_at: string
}

export interface CustomerList {
  items: CustomerOut[]
  total: number
}

export interface OpportunityOut {
  id: string
  customer_id: string
  customer_name: string
  name: string
  stage: OppStage
  stage_label: string
  value: string | null
  owner_ids: string[]
  key_requirements: string | null
  created_at: string
  updated_at: string
}

export interface KanbanColumn {
  label: string
  count: number
  items: OpportunityOut[]
}

export interface RequirementOut {
  id: string
  opportunity_id: string
  opportunity_name: string
  customer_name: string
  version: number
  title: string
  status: ReqStatus
  completeness: number
  content: Record<string, unknown>
  raw_input: string | null
  created_by: string
  created_at: string
}

export interface RequirementList {
  items: RequirementOut[]
  total: number
}

export interface GenJobOut {
  id: string
  agent_type: AgentType
  status: JobStatus
  progress: number
  result: Record<string, unknown> | null
  error: string | null
  started_at: string | null
  finished_at: string | null
}

export interface DeliverableOut {
  id: string
  solution_id: string
  type: DlvType
  status: DlvStatus
  file_name: string | null
  file_path: string | null
  file_size: number | null
  download_count: number
  created_at: string
}

export interface SolutionOut {
  id: string
  requirement_id: string
  version: string
  change_note: string | null
  status: SolStatus
  is_current: boolean
  content: Record<string, unknown>
  gen_jobs: GenJobOut[]
  deliverables: DeliverableOut[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface SolutionList {
  items: SolutionOut[]
  total: number
}

export interface SolutionProgress {
  solution_id: string
  solution_status: SolStatus
  agents_total: number
  agents_done: number
  overall_progress: number
  agents: {
    agent_type: AgentType
    status: JobStatus
    progress: number
    started_at: string | null
    finished_at: string | null
  }[]
}

export interface DashboardStats {
  active_customers: number
  active_opportunities: number
  solutions_total: number
  solutions_this_month: number
  deliverables_total: number
  deliverables_this_week: number
  pipeline_by_stage: { stage: OppStage; label: string; count: number }[]
  recent_opportunities: {
    id: string
    name: string
    customer_name: string
    stage: OppStage
    stage_label: string
    value: string | null
    updated_at: string
  }[]
  team_stats: {
    user_id: string
    name: string
    role: UserRole
    solutions_this_month: number
    active_opportunities: number
  }[]
  total_pipeline_value: string
}

export interface HierarchyCustomer {
  id: string
  name: string
  industry: Industry
  tier: string | null
  opportunities: {
    id: string
    name: string
    stage: OppStage
    stage_label: string
    value: string | null
    requirements: {
      id: string
      title: string
      status: ReqStatus
      completeness: number
      solutions: {
        id: string
        version: string
        status: SolStatus
        is_current: boolean
        created_at: string
      }[]
    }[]
  }[]
}

export interface TeamMember {
  user: UserOut
  solutions_this_month: number
  active_opportunities: number
}

export interface LLMStatus {
  anthropic_configured: boolean
  current_model: string
  status: 'connected' | 'not_configured' | 'error'
  error: string | null
}

export interface SystemConfig {
  default_llm: string
  sensitive_data_routing: boolean
  rag_top_k: number
  agent_timeout_minutes: number
  audit_log_enabled: boolean
  auto_knowledge_base: boolean
  max_concurrent_generations: number
}

export interface SettingsOut {
  llm: LLMStatus
  system: SystemConfig
}

export interface LLMTestResult {
  ok: boolean
  model: string
  latency_ms: number | null
  error: string | null
}
