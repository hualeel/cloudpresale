import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { dashboardApi, requirementsApi, solutionsApi } from '../api'
import type { DashboardStats, RequirementOut, SolutionOut, SolStatus } from '../api/types'

// ── helpers ──────────────────────────────────────────────────────
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}天前` : new Date(iso).toLocaleDateString('zh-CN')
}

function fmt(val: string | null | undefined): string {
  if (!val) return '—'
  const n = parseFloat(val)
  if (n >= 1e8) return `¥${(n / 1e8).toFixed(1)}亿`
  if (n >= 1e4) return `¥${(n / 1e4).toFixed(0)}万`
  return `¥${n.toLocaleString()}`
}

// ── status config ────────────────────────────────────────────────
const SOL_TAG: Record<SolStatus, string> = {
  generating: 'tag-o', draft: 'tag-gray', reviewing: 'tag-b',
  approved: 'tag-g', archived: 'tag-gray', completed: 'tag-g', failed: 'tag-r',
}
const SOL_LABEL: Record<SolStatus, string> = {
  generating: '生成中', draft: '草稿', reviewing: '审核中',
  approved: '已审批', archived: '已归档', completed: '已完成', failed: '生成失败',
}
const SOL_STATUS_OPTS: { value: SolStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'generating', label: '生成中' },
  { value: 'draft', label: '草稿' },
  { value: 'reviewing', label: '审核中' },
  { value: 'approved', label: '已审批' },
  { value: 'archived', label: '已归档' },
]

// ── agent progress ───────────────────────────────────────────────
function calcProgress(sol: SolutionOut) {
  const jobs = sol.gen_jobs
  if (jobs.length === 0) return { done: 0, total: 6, pct: 0, allDone: false }
  const done = jobs.filter(j => j.status === 'done').length
  const pct = Math.round(jobs.reduce((s, j) => s + j.progress, 0) / jobs.length * 100)
  return { done, total: jobs.length, pct, allDone: done === jobs.length }
}

// ── joined row type ───────────────────────────────────────────────
type SolRow = SolutionOut & { req: RequirementOut | null }

export function Dashboard() {
  const { setPage } = useStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [reqs, setReqs] = useState<RequirementOut[]>([])
  const [solutions, setSolutions] = useState<SolutionOut[]>([])
  const [loading, setLoading] = useState(true)

  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterOpp, setFilterOpp] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterKeyword, setFilterKeyword] = useState('')

  useEffect(() => {
    Promise.all([
      dashboardApi.stats(),
      requirementsApi.list(),
      solutionsApi.list(),
    ]).then(([s, r, sol]) => {
      setStats(s)
      setReqs(r.items)
      setSolutions(sol.items)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Build joined rows
  const reqMap = useMemo(() =>
    new Map<string, RequirementOut>(reqs.map(r => [r.id, r])),
    [reqs])

  const solRows = useMemo((): SolRow[] =>
    solutions.map(sol => ({ ...sol, req: reqMap.get(sol.requirement_id) ?? null }))
      .sort((a, b) => {
        const ca = a.req?.customer_name ?? '', cb = b.req?.customer_name ?? ''
        if (ca !== cb) return ca.localeCompare(cb)
        const oa = a.req?.opportunity_name ?? '', ob = b.req?.opportunity_name ?? ''
        if (oa !== ob) return oa.localeCompare(ob)
        const ra = a.req?.title ?? '', rb = b.req?.title ?? ''
        if (ra !== rb) return ra.localeCompare(rb)
        return b.version.localeCompare(a.version)
      }),
    [solutions, reqMap])

  // Filter options from requirements (always populated)
  const customers = useMemo(() => {
    const set = new Set(reqs.map(r => r.customer_name).filter((n): n is string => n !== null))
    return Array.from(set).sort()
  }, [reqs])

  const opportunities = useMemo(() => {
    const map = new Map<string, string>()
    reqs
      .filter(r => !filterCustomer || r.customer_name === filterCustomer)
      .forEach(r => { if (r.opportunity_id) map.set(r.opportunity_id, r.opportunity_name ?? r.opportunity_id) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [reqs, filterCustomer])

  useEffect(() => { setFilterOpp('') }, [filterCustomer])

  // Apply filters
  const filtered = useMemo(() => solRows.filter(row => {
    if (filterCustomer && row.req?.customer_name !== filterCustomer) return false
    if (filterOpp && row.req?.opportunity_id !== filterOpp) return false
    if (filterStatus && row.status !== filterStatus) return false
    if (filterKeyword) {
      const kw = filterKeyword.toLowerCase()
      if (!(row.req?.title ?? '').toLowerCase().includes(kw) &&
          !(row.req?.customer_name ?? '').toLowerCase().includes(kw) &&
          !(row.req?.opportunity_name ?? '').toLowerCase().includes(kw) &&
          !(row.change_note ?? '').toLowerCase().includes(kw)) return false
    }
    return true
  }), [solRows, filterCustomer, filterOpp, filterStatus, filterKeyword])

  // Status distribution counts
  const statusCounts = useMemo(() => {
    const m: Partial<Record<SolStatus, number>> = {}
    for (const sol of solutions) m[sol.status] = (m[sol.status] ?? 0) + 1
    return m
  }, [solutions])

  const hasFilter = !!(filterCustomer || filterOpp || filterStatus || filterKeyword)

  if (loading) return <div className="tmu txs" style={{ padding: '40px', textAlign: 'center' }}>加载中…</div>

  const generatingCount = statusCounts.generating ?? 0
  const approvedCount = (statusCounts.approved ?? 0) + (statusCounts.completed ?? 0)

  return (
    <div>
      {/* ── Top stat cards ── */}
      <div className="stats-row">
        <div className="scard b">
          <div className="sl">活跃客户</div>
          <div className="sv">{stats?.active_customers ?? '—'}</div>
          <div className="ss">总管道 {fmt(stats?.total_pipeline_value)}</div>
          <div className="si">🏦</div>
        </div>
        <div className="scard p">
          <div className="sl">进行中商机</div>
          <div className="sv">{stats?.active_opportunities ?? '—'}</div>
          <div className="ss">商机总数</div>
          <div className="si">💼</div>
        </div>
        <div className="scard o">
          <div className="sl">生成中方案</div>
          <div className="sv">{generatingCount}</div>
          <div className="ss">方案总数 {solutions.length}</div>
          <div className="si">⟳</div>
        </div>
        <div className="scard g">
          <div className="sl">已审批方案</div>
          <div className="sv">{approvedCount}</div>
          <div className="ss">交付物 {stats?.deliverables_total ?? 0} 份</div>
          <div className="si">✓</div>
        </div>
      </div>

      {/* ── Status distribution ── */}
      {solutions.length > 0 && (
        <div className="panel" style={{ marginBottom: '14px' }}>
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span className="txs tmu" style={{ flexShrink: 0 }}>方案状态分布：</span>
            {([
              ['generating', 'var(--acc2)'],
              ['draft',      'var(--text4)'],
              ['reviewing',  'var(--acc1)'],
              ['approved',   'var(--acc3)'],
              ['archived',   'var(--text4)'],
            ] as [SolStatus, string][]).map(([st, color]) => {
              const cnt = statusCounts[st] ?? 0
              if (cnt === 0) return null
              const pct = Math.round(cnt / solutions.length * 100)
              return (
                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: `${Math.max(pct, 4)}px`, height: '8px', borderRadius: '4px', background: color, minWidth: '8px', maxWidth: '80px', transition: 'width .3s' }} />
                  <span className={`tag ${SOL_TAG[st]}`} style={{ fontSize: '10px' }}>{SOL_LABEL[st]}</span>
                  <span className="txs tmu">{cnt}</span>
                </div>
              )
            })}
            <button className="btn btn-primary btn-xs ml-auto" onClick={() => setPage('generate')}>✨ 新建方案</button>
          </div>
        </div>
      )}

      {/* ── Solution tracking section ── */}
      <div className="sh">
        <div>
          <div className="st">方案进度追踪</div>
          <div className="ss2">
            {hasFilter
              ? `全部 ${solutions.length} 个，筛选后 ${filtered.length} 个`
              : `共 ${solutions.length} 个方案`}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="panel" style={{ marginBottom: '14px' }}>
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="txs tmu" style={{ flexShrink: 0 }}>筛选：</span>
          <select className="fs" style={{ width: '148px', padding: '5px 8px', fontSize: '12px' }}
            value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
            <option value="">全部客户</option>
            {customers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="fs" style={{ width: '170px', padding: '5px 8px', fontSize: '12px' }}
            value={filterOpp} onChange={e => setFilterOpp(e.target.value)}>
            <option value="">全部商机</option>
            {opportunities.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select className="fs" style={{ width: '110px', padding: '5px 8px', fontSize: '12px' }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {SOL_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input className="fi" style={{ width: '170px', padding: '5px 8px', fontSize: '12px' }}
            placeholder="搜索需求/商机/客户…"
            value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)} />
          {hasFilter && (
            <button className="btn btn-ghost btn-xs" onClick={() => {
              setFilterCustomer(''); setFilterOpp(''); setFilterStatus(''); setFilterKeyword('')
            }}>✕ 清除</button>
          )}
        </div>
      </div>

      {/* Solution table */}
      <div className="panel">
        {solutions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📄</div>
            <div className="txs" style={{ marginBottom: '14px' }}>暂无方案，开始生成第一个 AI 方案</div>
            <button className="btn btn-primary btn-sm" onClick={() => setPage('generate')}>✨ 生成方案</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)' }}>
            <div className="txs">没有符合条件的方案，</div>
            <button className="btn btn-ghost btn-xs" style={{ marginTop: '8px' }} onClick={() => {
              setFilterCustomer(''); setFilterOpp(''); setFilterStatus(''); setFilterKeyword('')
            }}>清除筛选</button>
          </div>
        ) : (
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>客户</th>
                <th style={{ width: '155px' }}>商机</th>
                <th>需求</th>
                <th style={{ width: '58px' }}>版本</th>
                <th style={{ width: '80px' }}>状态</th>
                <th style={{ width: '150px' }}>Agent 进度</th>
                <th style={{ width: '80px' }}>交付物</th>
                <th style={{ width: '78px' }}>更新时间</th>
                <th style={{ width: '150px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const prev = idx > 0 ? filtered[idx - 1] : null
                const newCust = !prev || prev.req?.customer_name !== row.req?.customer_name
                const newOpp = !prev || prev.req?.opportunity_id !== row.req?.opportunity_id

                const prog = calcProgress(row)
                const readyDlvs = row.deliverables.filter(d => d.status === 'ready').length
                const totalDlvs = row.deliverables.length

                return (
                  <tr key={row.id} style={{
                    borderTop: newCust ? '2px solid var(--acc1)' : undefined,
                  }}>
                    {/* Customer */}
                    <td style={{ verticalAlign: 'top', paddingTop: newCust ? '10px' : '4px' }}>
                      {newCust && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '11px' }}>🏦</span>
                          <span className="fw6" style={{ fontSize: '12px' }}>{row.req?.customer_name || '—'}</span>
                        </div>
                      )}
                    </td>

                    {/* Opportunity */}
                    <td style={{ verticalAlign: 'top', paddingTop: newOpp ? '10px' : '4px' }}>
                      {newOpp && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '11px' }}>💼</span>
                          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{row.req?.opportunity_name || '—'}</span>
                        </div>
                      )}
                    </td>

                    {/* Requirement title */}
                    <td>
                      <span className="fw6" style={{ fontSize: '12.5px' }}>{row.req?.title ?? '—'}</span>
                      {row.change_note && (
                        <div className="txs tmu" style={{ marginTop: '1px' }}>{row.change_note}</div>
                      )}
                    </td>

                    {/* Version */}
                    <td>
                      <span className="ver-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        v{row.version}
                      </span>
                      {row.is_current && <div className="txs tg" style={{ fontSize: '9px', marginTop: '2px' }}>当前</div>}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`tag ${SOL_TAG[row.status]}`} style={{ fontSize: '10px' }}>
                        {row.status === 'generating' ? '⟳ ' : ''}{SOL_LABEL[row.status]}
                      </span>
                    </td>

                    {/* Agent progress */}
                    <td>
                      {row.gen_jobs.length === 0 ? (
                        <span className="txs tmu">—</span>
                      ) : prog.allDone ? (
                        <div className="fc g6">
                          <span className="txs tg fw6">✓ {prog.done}/{prog.total}</span>
                        </div>
                      ) : (
                        <div>
                          <div className="fc g6" style={{ marginBottom: '3px' }}>
                            <span className="txs tmu">{prog.done}/{prog.total}</span>
                            <span className="txs tg fw6">{prog.pct}%</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'var(--bg5)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${prog.pct}%`, height: '100%', background: 'var(--acc2)', borderRadius: '2px', transition: 'width .3s' }} />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Deliverables */}
                    <td>
                      {totalDlvs === 0 ? (
                        <span className="txs tmu">—</span>
                      ) : (
                        <div>
                          <span className="txs tg fw6">{readyDlvs}</span>
                          <span className="txs tmu">/{totalDlvs}</span>
                          <div className="txs tmu" style={{ fontSize: '10px' }}>就绪</div>
                        </div>
                      )}
                    </td>

                    {/* Updated at */}
                    <td className="txs tmu">{relTime(row.updated_at)}</td>

                    {/* Actions */}
                    <td>
                      <div className="fc g6">
                        {readyDlvs > 0 && (
                          <button className="btn btn-ghost btn-xs" onClick={() => setPage('deliverables')}>
                            📦 交付物
                          </button>
                        )}
                        <button className="btn btn-primary btn-xs" onClick={() => setPage('generate')}>
                          ➕ 新版本
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Bottom: recent opps + team ── */}
      {stats && (
        <div className="two" style={{ marginTop: '18px' }}>
          <div>
            <div className="sh">
              <div><div className="st">最近活跃商机</div></div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage('kanban')}>全部 →</button>
            </div>
            <div className="panel">
              {stats.recent_opportunities.length === 0 ? (
                <div className="tmu txs" style={{ padding: '20px', textAlign: 'center' }}>暂无商机</div>
              ) : (
                <table className="dt">
                  <thead><tr><th>商机</th><th>客户</th><th>金额</th><th>时间</th></tr></thead>
                  <tbody>
                    {stats.recent_opportunities.slice(0, 6).map(opp => (
                      <tr key={opp.id} onClick={() => setPage('kanban')} style={{ cursor: 'pointer' }}>
                        <td><span className="fw6" style={{ fontSize: '12px' }}>{opp.name}</span></td>
                        <td className="tmu txs">{opp.customer_name}</td>
                        <td className="txs tg fw6">{fmt(opp.value)}</td>
                        <td className="tmu txs">{relTime(opp.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <div className="sh">
              <div><div className="st">团队本月产出</div></div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage('team')}>团队 →</button>
            </div>
            <div className="panel">
              <table className="dt">
                <thead><tr><th>成员</th><th>本月方案</th><th>商机数</th></tr></thead>
                <tbody>
                  {stats.team_stats.map(m => (
                    <tr key={m.user_id}>
                      <td className="fw6">{m.name}</td>
                      <td className="fw6 tg">{m.solutions_this_month}</td>
                      <td className="tmu txs">{m.active_opportunities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
