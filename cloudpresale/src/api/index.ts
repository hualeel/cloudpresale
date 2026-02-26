import { api } from './client'
import type {
  TokenResp, UserOut,
  CustomerOut, CustomerList,
  OpportunityOut, KanbanColumn,
  RequirementOut, RequirementList,
  SolutionOut, SolutionList, SolutionProgress,
  DeliverableOut,
  DashboardStats, HierarchyCustomer,
  TeamMember,
} from './types'

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResp>('/auth/login', { email, password }),
  me: () => api.get<UserOut>('/auth/me'),
  register: (email: string, name: string, password: string, role = 'sa') =>
    api.post<UserOut>('/auth/register', { email, name, password, role }),
}

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard'),
  hierarchy: () => api.get<HierarchyCustomer[]>('/dashboard/hierarchy'),
}

// ── Customers ─────────────────────────────────────────
export const customersApi = {
  list: (params?: { skip?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.skip) q.set('skip', String(params.skip))
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.search) q.set('search', params.search)
    const qs = q.toString()
    return api.get<CustomerList>(`/customers${qs ? '?' + qs : ''}`)
  },
  create: (data: { name: string; industry: string; tier?: string; description?: string }) =>
    api.post<CustomerOut>('/customers', data),
  get: (id: string) => api.get<CustomerOut>(`/customers/${id}`),
}

// ── Opportunities ─────────────────────────────────────
export const opportunitiesApi = {
  list: (params?: { customer_id?: string; stage?: string }) => {
    const q = new URLSearchParams()
    if (params?.customer_id) q.set('customer_id', params.customer_id)
    if (params?.stage) q.set('stage', params.stage)
    const qs = q.toString()
    return api.get<{ items: OpportunityOut[]; total: number }>(`/opportunities${qs ? '?' + qs : ''}`)
  },
  kanban: () => api.get<Record<string, KanbanColumn>>('/opportunities/kanban'),
  create: (data: {
    customer_id: string; name: string; stage?: string
    value?: number; key_requirements?: string; owner_ids?: string[]
  }) => api.post<OpportunityOut>('/opportunities', data),
  update: (id: string, data: Partial<OpportunityOut>) =>
    api.patch<OpportunityOut>(`/opportunities/${id}`, data),
}

// ── Requirements ─────────────────────────────────────
export const requirementsApi = {
  list: (params?: { opportunity_id?: string; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.opportunity_id) q.set('opportunity_id', params.opportunity_id)
    if (params?.status) q.set('status', params.status)
    const qs = q.toString()
    return api.get<RequirementList>(`/requirements${qs ? '?' + qs : ''}`)
  },
  get: (id: string) => api.get<RequirementOut>(`/requirements/${id}`),
  create: (data: {
    opportunity_id: string; title: string
    content?: Record<string, unknown>; raw_input?: string
  }) => api.post<RequirementOut>('/requirements', data),
  confirm: (id: string) => api.post<RequirementOut>(`/requirements/${id}/confirm`, {}),
  update: (id: string, data: Partial<RequirementOut>) =>
    api.patch<RequirementOut>(`/requirements/${id}`, data),
}

// ── Solutions ─────────────────────────────────────────
export const solutionsApi = {
  list: (requirement_id?: string) => {
    const qs = requirement_id ? `?requirement_id=${requirement_id}` : ''
    return api.get<SolutionList>(`/solutions${qs}`)
  },
  create: (data: {
    requirement_id: string; change_note?: string
    deliverable_types?: string[]
  }) => api.post<SolutionOut>('/solutions', data),
  get: (id: string) => api.get<SolutionOut>(`/solutions/${id}`),
  progress: (id: string) => api.get<SolutionProgress>(`/solutions/${id}/progress`),
}

// ── Deliverables ─────────────────────────────────────
export const deliverablesApi = {
  list: (solution_id?: string) => {
    const qs = solution_id ? `?solution_id=${solution_id}` : ''
    return api.get<DeliverableOut[]>(`/deliverables${qs}`)
  },
  downloadUrl: (id: string) =>
    api.post<{ url: string; expires_in: number; file_name: string }>(`/deliverables/${id}/download-url`, {}),
}

// ── Team ─────────────────────────────────────────────
export const teamApi = {
  list: () => api.get<TeamMember[]>('/team'),
}

export * from './types'
export * from './client'
