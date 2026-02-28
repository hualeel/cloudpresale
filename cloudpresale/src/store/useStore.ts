import { create } from 'zustand'
import { setToken } from '../api/client'
import type { UserOut } from '../api/types'

type Page = 'dashboard' | 'kanban' | 'hierarchy' | 'requirements' | 'generate' | 'deliverables' | 'cicd' | 'k8s' | 'settings' | 'team'
type Modal = 'newCustomer' | 'newOpp' | 'newReq' | 'trigger' | 'pipelineDetail' | 'editOpp' | 'editReq' | null

interface AppState {
  // Navigation
  currentPage: Page
  openModal: Modal
  selectedTreeRow: string | null
  setPage: (page: Page) => void
  setModal: (modal: Modal) => void
  setSelectedTreeRow: (row: string | null) => void

  // Editing
  editingItem: any | null
  setEditingItem: (item: any) => void

  // Auth
  token: string | null
  user: UserOut | null
  isLoggedIn: boolean
  login: (token: string, user: UserOut) => void
  logout: () => void

  // Context: selected IDs for cross-page navigation
  selectedReqId: string | null
  selectedSolId: string | null
  setSelectedReqId: (id: string | null) => void
  setSelectedSolId: (id: string | null) => void

  // Pre-select customer when opening newOpp modal from a customer context
  newOppCustomerId: string | null
  setNewOppCustomerId: (id: string | null) => void
}

// 从 localStorage 恢复 token
const storedToken = localStorage.getItem('jwt_token')
const storedUser = (() => {
  try { return JSON.parse(localStorage.getItem('user') ?? 'null') as UserOut | null }
  catch { return null }
})()

export const useStore = create<AppState>((set) => ({
  // Navigation
  currentPage: 'dashboard',
  openModal: null,
  selectedTreeRow: null,
  setPage: (page) => set({ currentPage: page }),
  setModal: (modal) => set({ openModal: modal }),
  setSelectedTreeRow: (row) => set({ selectedTreeRow: row }),

  // Editing
  editingItem: null,
  setEditingItem: (item) => set({ editingItem: item }),

  // Auth
  token: storedToken,
  user: storedUser,
  isLoggedIn: !!storedToken && !!storedUser,
  login: (token, user) => {
    setToken(token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user, isLoggedIn: true })
  },
  logout: () => {
    setToken(null)
    localStorage.removeItem('user')
    set({ token: null, user: null, isLoggedIn: false, currentPage: 'dashboard' })
  },

  // Context
  selectedReqId: null,
  selectedSolId: null,
  setSelectedReqId: (id) => set({ selectedReqId: id }),
  setSelectedSolId: (id) => set({ selectedSolId: id }),

  newOppCustomerId: null,
  setNewOppCustomerId: (id) => set({ newOppCustomerId: id }),
}))
