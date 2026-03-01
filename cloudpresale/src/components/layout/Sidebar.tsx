import { useStore } from '../../store/useStore'

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员', senior_sa: '高级SA', sa: 'SA', junior_sa: '初级SA',
}

interface NavItem { id: string; icon: string; label: string; badge?: string; badgeCls?: string }
const navItems: { section: string; items: NavItem[] }[] = [
  { section: '工作台', items: [
    { id: 'dashboard', icon: '🏠', label: '总览仪表盘' },
    { id: 'kanban', icon: '📊', label: '方案看板' },
  ]},
  { section: '四维管理', items: [
    { id: 'hierarchy', icon: '🗂️', label: '客户·商机·需求·方案' },
    { id: 'requirements', icon: '📋', label: '需求管理', badge: '3' },
  ]},
  { section: 'AI生成', items: [
    { id: 'generate', icon: '🤖', label: '方案生成' },
    { id: 'deliverables', icon: '📦', label: '交付物管理', badge: '12', badgeCls: 'g' },
  ]},
  // { section: 'DevOps', items: [
  //   { id: 'cicd', icon: '🚀', label: 'CI/CD 流水线' },
  //   { id: 'k8s', icon: '☸️', label: 'K8s 集群状态' },
  // ]},
  { section: '系统', items: [
    { id: 'settings', icon: '⚙️', label: '平台配置' },
    { id: 'team', icon: '👥', label: '团队成员' },
  ]},
]

export function Sidebar() {
  const { currentPage, setPage, user } = useStore()

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-wrap">
          <div className="logo-icon">⚡</div>
          <div>
            <div className="logo-name">Solve<span style={{color:'var(--acc1)'}}>IQ</span></div>
            <div className="logo-ver">PRESALES AI · v3.0</div>
          </div>
        </div>
      </div>

      {navItems.map(({ section, items }) => (
        <div key={section} className="nav-sec">
          <div className="nav-lbl">{section}</div>
          {items.map(({ id, icon, label, badge, badgeCls }) => (
            <button
              key={id}
              className={`nav-item${currentPage === id ? ' active' : ''}`}
              onClick={() => setPage(id as any)}
            >
              <span className="ni">{icon}</span>
              {label}
              {badge && <span className={`nav-badge${badgeCls ? ` ${badgeCls}` : ''}`}>{badge}</span>}
            </button>
          ))}
        </div>
      ))}

      {user && (
        <div className="user-bar">
          <div className="avatar" style={{background:'linear-gradient(135deg,var(--acc1),var(--acc2))'}}>
            {user.name[0]}
          </div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">{ROLE_LABEL[user.role] ?? user.role}</div>
          </div>
        </div>
      )}
    </aside>
  )
}
