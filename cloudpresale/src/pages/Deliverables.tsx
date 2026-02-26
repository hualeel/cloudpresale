import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { solutionsApi, requirementsApi, deliverablesApi } from '../api'
import type { SolutionOut, RequirementOut, DeliverableOut, DlvType } from '../api/types'

const DLV_ICON: Record<DlvType, string> = {
  word_tech: '📘', ppt_overview: '📊', ppt_container: '📑',
  ppt_devops: '📑', ppt_exec: '🎯', ppt_security: '🔐',
}
const DLV_LABEL: Record<DlvType, string> = {
  word_tech: 'Word技术方案', ppt_overview: '总体方案PPT', ppt_container: '容器平台PPT',
  ppt_devops: 'DevOps专项PPT', ppt_exec: '高层汇报PPT', ppt_security: '安全合规PPT',
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)}MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)}KB`
  return `${bytes}B`
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}天前` : new Date(iso).toLocaleDateString('zh-CN')
}

async function download(dlv: DeliverableOut) {
  if (dlv.status !== 'ready') return
  try {
    const { url } = await deliverablesApi.downloadUrl(dlv.id)
    window.open(url, '_blank')
  } catch {
    alert('获取下载链接失败')
  }
}

// Group solutions by requirement_id
type ReqGroup = {
  req: RequirementOut
  solutions: SolutionOut[]
}

export function Deliverables() {
  const { setPage } = useStore()
  const [groups, setGroups] = useState<ReqGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCustomer, setFilterCustomer] = useState<string>('all')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      requirementsApi.list(),
      solutionsApi.list(),
    ]).then(([reqData, solData]) => {
      // Build map: requirement_id → RequirementOut
      const reqMap = new Map<string, RequirementOut>(reqData.items.map(r => [r.id, r]))
      // Group solutions by requirement
      const groupMap = new Map<string, ReqGroup>()
      for (const sol of solData.items) {
        if (!groupMap.has(sol.requirement_id)) {
          const req = reqMap.get(sol.requirement_id)
          if (!req) continue
          groupMap.set(sol.requirement_id, { req, solutions: [] })
        }
        groupMap.get(sol.requirement_id)!.solutions.push(sol)
      }
      // Sort solutions within each group: current first, then by version desc
      for (const g of groupMap.values()) {
        g.solutions.sort((a, b) => {
          if (a.is_current !== b.is_current) return a.is_current ? -1 : 1
          return Number(b.version) - Number(a.version)
        })
      }
      setGroups([...groupMap.values()])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleDownload(dlv: DeliverableOut) {
    setDownloading(dlv.id)
    try {
      await download(dlv)
    } finally {
      setDownloading(null)
    }
  }

  // Collect unique customers for filter
  const customers = [...new Set(groups.map(g => g.req.customer_name))]

  // Apply filters
  const filtered = groups.filter(g => {
    if (filterCustomer !== 'all' && g.req.customer_name !== filterCustomer) return false
    return true
  })

  return (
    <div>
      <div className="sh">
        <div>
          <div className="st">交付物管理</div>
          <div className="ss2">按客户·商机·需求·版本四维归档</div>
        </div>
        <div className="fc g8">
          <select className="fi" style={{ width: '140px', fontSize: '11.5px', padding: '5px 8px' }}
            value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
            <option value="all">全部客户</option>
            {customers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="fi" style={{ width: '140px', fontSize: '11.5px', padding: '5px 8px' }}
            value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">全部类型</option>
            <option value="word">Word</option>
            <option value="ppt">PPT</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="tmu txs" style={{ padding: '40px', textAlign: 'center' }}>加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📦</div>
            <div className="txs">暂无交付物</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => setPage('generate')}>
              ✨ 生成方案
            </button>
          </div>
        </div>
      ) : (
        filtered.map(({ req, solutions }) => (
          <div key={req.id} className="panel" style={{ marginBottom: '18px' }}>
            <div className="ph">
              <span>🏦</span>
              <span className="pt">{req.customer_name} · {req.title} · 版本历史</span>
              <button className="btn btn-primary btn-sm ml-auto" onClick={() => setPage('generate')}>
                ➕ 新版本迭代
              </button>
            </div>
            <div className="pb-">
              {solutions.map((sol, idx) => {
                // Apply type filter on deliverables
                const dlvs = sol.deliverables.filter(d => {
                  if (filterType === 'word') return d.type === 'word_tech'
                  if (filterType === 'ppt') return d.type !== 'word_tech'
                  return true
                })
                return (
                  <div key={sol.id} style={{
                    border: sol.is_current ? '1px solid rgba(0,212,170,.25)' : '1px solid var(--border)',
                    borderLeft: sol.is_current ? '3px solid var(--acc3)' : '1px solid var(--border)',
                    borderRadius: 'var(--r2)',
                    padding: '13px',
                    marginBottom: idx < solutions.length - 1 ? '10px' : 0,
                    background: sol.is_current ? 'rgba(0,212,170,.03)' : 'transparent',
                    opacity: sol.is_current ? 1 : 0.7,
                  }}>
                    <div className="fc g12" style={{ marginBottom: dlvs.length > 0 ? '10px' : 0 }}>
                      <div className="ver-badge" style={sol.is_current ? { borderColor: 'var(--acc3)', color: 'var(--acc3)' } : {}}>
                        v{sol.version}
                      </div>
                      <div>
                        <div className="ts fw6">{sol.change_note || '初始版本'}</div>
                        <div className="txs tmu">
                          {relTime(sol.created_at)}
                          {sol.is_current ? ' · 当前版本' : ''}
                        </div>
                      </div>
                      <div className="fc g8 ml-auto">
                        <span className={`tag ${sol.is_current ? 'tag-g' : 'tag-gray'}`}>
                          {sol.is_current ? '当前版本' : '历史版本'}
                        </span>
                      </div>
                    </div>

                    {dlvs.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(dlvs.length, 4)}, 1fr)`, gap: '7px' }}>
                        {dlvs.map(dlv => (
                          <div key={dlv.id} className="dl-item" style={{ margin: 0, padding: '9px 10px' }}>
                            <div className="dl-ico">{DLV_ICON[dlv.type] ?? '📄'}</div>
                            <div className="dl-info">
                              <div className="dl-name" style={{ fontSize: '11.5px' }}>
                                {dlv.file_name ?? DLV_LABEL[dlv.type]}
                              </div>
                              <div className="dl-meta">
                                {dlv.status === 'ready' ? fmtSize(dlv.file_size) : dlv.status === 'generating' ? '生成中…' : '生成失败'}
                                {dlv.download_count > 0 ? ` · ${dlv.download_count}次下载` : ''}
                              </div>
                            </div>
                            <button
                              className="btn btn-ghost btn-xs"
                              disabled={dlv.status !== 'ready' || downloading === dlv.id}
                              onClick={() => handleDownload(dlv)}
                              title={dlv.status !== 'ready' ? '文件尚未就绪' : '下载'}
                            >
                              {downloading === dlv.id ? '…' : '↓'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {dlvs.length === 0 && sol.deliverables.length === 0 && (
                      <div className="txs tmu" style={{ fontSize: '12px' }}>
                        {sol.status === 'generating' ? '⟳ 方案生成中，交付物稍后出现…' : '暂无交付物'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
