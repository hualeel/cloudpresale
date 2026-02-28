import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Kanban } from './pages/Kanban'
import { Hierarchy } from './pages/Hierarchy'
import { Requirements } from './pages/Requirements'
import { Generate } from './pages/Generate'
import { Deliverables } from './pages/Deliverables'
import { CICD } from './pages/CICD'
import { K8s } from './pages/K8s'
import { Settings } from './pages/Settings'
import { Team } from './pages/Team'
import { NewCustomerModal } from './components/modals/NewCustomerModal'
import { NewOpportunityModal } from './components/modals/NewOpportunityModal'
import { NewRequirementModal } from './components/modals/NewRequirementModal'
import { TriggerModal } from './components/modals/TriggerModal'
import { PipelineDetailModal } from './components/modals/PipelineDetailModal'

const pages: Record<string, ReactElement> = {
  dashboard: <Dashboard />,
  kanban: <Kanban />,
  hierarchy: <Hierarchy />,
  requirements: <Requirements />,
  generate: <Generate />,
  deliverables: <Deliverables />,
  cicd: <CICD />,
  k8s: <K8s />,
  settings: <Settings />,
  team: <Team />,
}

function App() {
  const { currentPage, isLoggedIn, logout } = useStore()

  // 全局监听 401 事件（token 过期）
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])

  if (!isLoggedIn) return <Login />

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="content">
          {pages[currentPage]}
        </div>
      </main>
      <NewCustomerModal />
      <NewOpportunityModal />
      <NewRequirementModal />
      <TriggerModal />
      <PipelineDetailModal />
    </div>
  )
}

export default App
