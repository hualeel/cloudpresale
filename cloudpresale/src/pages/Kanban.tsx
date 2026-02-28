import { useState, useEffect, useCallback, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { solutionsApi, requirementsApi } from '../api'
import type { SolutionOut, RequirementOut, SolStatus } from '../api/types'

// ── helpers ──────────────────────────────────────────────────────
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}天前` : new Date(iso).toLocaleDateString('zh-CN')
}

function calcProgress(sol: SolutionOut) {
  const jobs = sol.gen_jobs
  if (!jobs.length) return { done: 0, total: 6, pct: 0 }
  const done = jobs.filter(j => j.status === 'done').length
  const pct = Math.round(jobs.reduce((s, j) => s + j.progress, 0) / jobs.length * 100)
  return { done, total: jobs.length, pct }
}

// ── column config ────────────────────────────────────────────────
const COLUMNS: { status: SolStatus; icon: string; label: string; accentVar: string }[] = [
  { status: 'generating', icon: '⟳', label: '生成中',  accentVar: '--acc2' },
  { status: 'draft',      icon: '📝', label: '草稿',    accentVar: '--text3' },
  { status: 'reviewing',  icon: '🔍', label: '审核中',  accentVar: '--acc1' },
  { status: 'approved',   icon: '✅', label: '已审批',  accentVar: '--acc3' },
]

// Status transition buttons per column
const TRANSITIONS: Record<SolStatus, { label: string; to: SolStatus; cls: string }[]> = {
  generating: [],
  draft:      [{ label: '提交审核 →', to: 'reviewing', cls: 'btn-primary' }],
  reviewing:  [{ label: '✓ 通过', to: 'approved', cls: 'btn-success' }, { label: '← 退回', to: 'draft', cls: 'btn-ghost' }],
  approved:   [{ label: '📥 归档', to: 'archived', cls: 'btn-ghost' }],
  archived:   [],
  completed:  [],
  failed:     [{ label: '重新提交', to: 'draft', cls: 'btn-ghost' }],
}

type SolRow = SolutionOut & { req: RequirementOut | null }

export function Kanban() {
  const { setPage } = useStore()
  const [solutions, setSolutions] = useState<SolutionOut[]>([])
  const [reqs, setReqs] = useState<RequirementOut[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([solutionsApi.list(), requirementsApi.list()])
      .then(([solData, reqData]) => {
        setSolutions(solData.items)
        setReqs(reqData.items)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    window.addEventListener('data:refresh', fetchData)
    return () => window.removeEventListener('data:refresh', fetchData)
  }, [fetchData])

  const reqMap = useMemo(() =>
    new Map<string, RequirementOut>(reqs.map(r => [r.id, r])), [reqs])

  const rows: SolRow[] = useMemo(() =>
    solutions.map(s => ({ ...s, req: reqMap.get(s.requirement_id) ?? null }))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [solutions, reqMap])

  async function handleStatusChange(id: string, newStatus: SolStatus) {
    setUpdatingId(id)
    // Optimistic update
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
    try {
      await solutionsApi.updateStatus(id, newStatus)
    } catch (err) {
      console.error(err)
      alert('状态更新失败，请重试')
      fetchData()
    } finally {
      setUpdatingId(null)
    }
  }

  const byStatus = useMemo(() => {
    const map: Record<string, SolRow[]> = {}
    for (const col of COLUMNS) map[col.status] = []
    map['archived'] = []
    for (const row of rows) {
      const key = row.status in map ? row.status : 'archived'
      map[key].push(row)
    }
    return map
  }, [rows])

  const activeSolCount = rows.filter(r => r.status !== 'archived').length
  const archivedCount = byStatus['archived']?.length ?? 0

  return (
    <div>
      {/* Header */}
      <div className="sh">
        <div>
          <div className="st">方案看板</div>
          <div className="ss2">
            {loading ? '加载中…'
              : `${activeSolCount} 个进行中 · ${archivedCount} 个已归档`}
          </div>
        </div>
        <div className="fc g8">
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('requirements')}>📋 需求管理</button>
          <button className="btn btn-primary btn-sm" onClick={() => setPage('generate')}>✨ 生成新方案</button>
        </div>
      </div>

      {loading ? (
        <div className="tmu txs" style={{ padding: '40px', textAlign: 'center' }}>加载中…</div>
      ) : activeSolCount === 0 ? (
        <div className="panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📄</div>
          <div className="txs" style={{ marginBottom: '14px' }}>暂无方案，从需求管理开始生成第一个方案</div>
          <div className="fc g8" style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('requirements')}>📋 查看需求</button>
            <button className="btn btn-primary btn-sm" onClick={() => setPage('generate')}>✨ 生成方案</button>
          </div>
        </div>
      ) : (
        <>
          {/* Kanban columns */}
          <div className="kanban">
            {COLUMNS.map(col => {
              const cards = byStatus[col.status] ?? []
              return (
                <div key={col.status} className="kcol">
                  {/* Column header */}
                  <div className="kcol-h" style={{ borderTop: `3px solid var(${col.accentVar})` }}>
                    <span className="kcol-t">{col.icon} {col.label}</span>
                    <span className="kcol-n" style={{ background: `var(${col.accentVar})` }}>{cards.length}</span>
                  </div>

                  <div className="kcol-b">
                    {cards.length === 0 && (
                      <div className="tmu txs" style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px' }}>
                        暂无方案
                      </div>
                    )}
                    {cards.map(row => {
                      const prog = calcProgress(row)
                      const readyDlvs = row.deliverables.filter(d => d.status === 'ready').length
                      const transitions = TRANSITIONS[row.status] ?? []

                      return (
                        <div key={row.id} className="opp-c" style={{ cursor: 'default' }}>
                          {/* Version + current badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                            <span className="ver-badge" style={{ fontSize: '10px', padding: '2px 5px' }}>
                              v{row.version}
                            </span>
                            {row.is_current && (
                              <span className="tag tag-g" style={{ fontSize: '9px', padding: '1px 5px' }}>当前</span>
                            )}
                          </div>

                          {/* Requirement title */}
                          <div className="opp-n">{row.req?.title ?? '—'}</div>

                          {/* Breadcrumb */}
                          <div className="opp-cl" style={{ fontSize: '11px', marginTop: '3px' }}>
                            🏦 {row.req?.customer_name ?? '—'} · 💼 {row.req?.opportunity_name ?? '—'}
                          </div>

                          {/* Agent progress (generating only) */}
                          {row.status === 'generating' && (
                            <div style={{ margin: '8px 0 4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span className="txs tmu">{prog.done}/{prog.total} agents</span>
                                <span className="txs tg fw6">{prog.pct}%</span>
                              </div>
                              <div style={{ height: '4px', background: 'var(--bg5)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${prog.pct}%`, height: '100%', background: `var(${col.accentVar})`, borderRadius: '2px', transition: 'width .3s' }} />
                              </div>
                            </div>
                          )}

                          {/* Deliverables count */}
                          {readyDlvs > 0 && (
                            <div className="txs" style={{ margin: '5px 0 2px', color: 'var(--acc3)' }}>
                              📦 {readyDlvs} 个交付物就绪
                            </div>
                          )}

                          {/* Change note */}
                          {row.change_note && (
                            <div className="txs tmu" style={{ margin: '4px 0', fontSize: '11px', fontStyle: 'italic' }}>
                              "{row.change_note}"
                            </div>
                          )}

                          {/* Footer */}
                          <div className="opp-ft" style={{ marginTop: '8px', alignItems: 'center' }}>
                            <span className="opp-d">{relTime(row.updated_at)}</span>
                          </div>

                          {/* Action buttons */}
                          <div className="fc g6 mt4" style={{ flexWrap: 'wrap' }}>
                            {/* Status transitions */}
                            {transitions.map(t => (
                              <button
                                key={t.to}
                                className={`btn ${t.cls} btn-xs`}
                                disabled={updatingId === row.id}
                                onClick={() => handleStatusChange(row.id, t.to)}
                              >
                                {updatingId === row.id ? '…' : t.label}
                              </button>
                            ))}
                            {/* View deliverables */}
                            {readyDlvs > 0 && (
                              <button className="btn btn-ghost btn-xs" onClick={() => setPage('deliverables')}>
                                查看交付物
                              </button>
                            )}
                            {/* Generate new version */}
                            {row.status !== 'generating' && (
                              <button className="btn btn-ghost btn-xs" onClick={() => setPage('generate')}>
                                新版本
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Archived section */}
          {archivedCount > 0 && (
            <div style={{ marginTop: '18px' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginBottom: '10px', color: 'var(--text3)' }}
                onClick={() => setShowArchived(v => !v)}
              >
                {showArchived ? '▾' : '▸'} 已归档方案（{archivedCount}）
              </button>
              {showArchived && (
                <div className="panel">
                  <table className="dt">
                    <thead>
                      <tr>
                        <th>需求</th>
                        <th>客户 / 商机</th>
                        <th style={{ width: '60px' }}>版本</th>
                        <th style={{ width: '150px' }}>备注</th>
                        <th style={{ width: '80px' }}>归档时间</th>
                        <th style={{ width: '100px' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(byStatus['archived'] ?? []).map(row => (
                        <tr key={row.id}>
                          <td className="fw6" style={{ fontSize: '12.5px' }}>{row.req?.title ?? '—'}</td>
                          <td className="txs tmu">
                            🏦 {row.req?.customer_name ?? '—'} · 💼 {row.req?.opportunity_name ?? '—'}
                          </td>
                          <td><span className="ver-badge" style={{ fontSize: '10px' }}>v{row.version}</span></td>
                          <td className="txs tmu">{row.change_note || '—'}</td>
                          <td className="txs tmu">{relTime(row.updated_at)}</td>
                          <td>
                            <div className="fc g6">
                              {row.deliverables.some(d => d.status === 'ready') && (
                                <button className="btn btn-ghost btn-xs" onClick={() => setPage('deliverables')}>交付物</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
