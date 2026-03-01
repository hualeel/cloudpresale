import { useStore } from '../../store/useStore'

const pageLabels: Record<string, string> = {
  dashboard: '总览仪表盘',
  hierarchy: '客户·商机·需求·方案',
  requirements: '需求管理',
  generate: 'AI方案生成',
  deliverables: '交付物管理',
  kanban: '商机看板',
  cicd: 'CI/CD流水线',
  k8s: 'K8s集群状态',
  settings: '平台配置',
  team: '团队成员',
}

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员', senior_sa: '高级SA', sa: 'SA', junior_sa: '初级SA',
}

export function Topbar() {
  const { currentPage, setPage, setModal, user, logout } = useStore()

  return (
    <div className="topbar">
      <div className="bc">
        <span>SolveIQ</span>
        <span>›</span>
        <b>{pageLabels[currentPage] || currentPage}</b>
      </div>
      <div className="tba">
        <button className="btn btn-ghost btn-sm" onClick={() => setModal('newOpp')}>＋ 新建商机</button>
        <button className="btn btn-primary btn-sm" onClick={() => setPage('generate')}>🤖 生成方案</button>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
            <div
              className="avatar"
              style={{ width: '26px', height: '26px', fontSize: '11px', cursor: 'default',
                       background: 'linear-gradient(135deg,var(--acc1),var(--acc2))' }}
              title={`${user.name} · ${ROLE_LABEL[user.role] ?? user.role}`}
            >
              {user.name[0]}
            </div>
            <span className="tmu txs" style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </span>
            <button className="btn btn-ghost btn-xs" onClick={logout} title="退出登录">退出</button>
          </div>
        )}
      </div>
    </div>
  )
}
