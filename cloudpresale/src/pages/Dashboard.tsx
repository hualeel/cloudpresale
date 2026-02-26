import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { dashboardApi } from '../api'
import type { DashboardStats } from '../api/types'

function fmt(val: string | null | undefined): string {
  if (!val) return '—'
  const n = parseFloat(val)
  if (n >= 1e8) return `¥${(n / 1e8).toFixed(1)}亿`
  if (n >= 1e4) return `¥${(n / 1e4).toFixed(0)}万`
  return `¥${n.toLocaleString()}`
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

const STAGE_TAG: Record<string, string> = {
  initial: 'tag-gray', req_confirm: 'tag-b', proposal: 'tag-o',
  customer_report: 'tag-p', won: 'tag-g', lost: 'tag-r',
}

export function Dashboard() {
  const { setPage } = useStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="tmu txs" style={{ padding: '40px', textAlign: 'center' }}>加载中…</div>
  if (!stats) return <div className="alert a-err">数据加载失败</div>

  return (
    <div>
      <div className="stats-row">
        <div className="scard b">
          <div className="sl">活跃客户</div>
          <div className="sv">{stats.active_customers}</div>
          <div className="ss">客户总数</div>
          <div className="si">🏦</div>
        </div>
        <div className="scard p">
          <div className="sl">进行中商机</div>
          <div className="sv">{stats.active_opportunities}</div>
          <div className="ss">总管道价值 {fmt(stats.total_pipeline_value)}</div>
          <div className="si">💼</div>
        </div>
        <div className="scard g">
          <div className="sl">已生成方案</div>
          <div className="sv">{stats.solutions_total}</div>
          <div className="ss">本月 {stats.solutions_this_month} 份</div>
          <div className="si">📄</div>
        </div>
        <div className="scard o">
          <div className="sl">交付物总量</div>
          <div className="sv">{stats.deliverables_total}</div>
          <div className="ss">本周 {stats.deliverables_this_week} 份</div>
          <div className="si">📦</div>
        </div>
      </div>

      <div className="two">
        {/* 最近活跃商机 */}
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
                <thead><tr><th>商机</th><th>客户</th><th>阶段</th><th>金额</th><th>时间</th></tr></thead>
                <tbody>
                  {stats.recent_opportunities.map(opp => (
                    <tr key={opp.id} onClick={() => setPage('kanban')} style={{ cursor: 'pointer' }}>
                      <td><span className="fw6">{opp.name}</span></td>
                      <td className="tmu txs">{opp.customer_name}</td>
                      <td><span className={`tag ${STAGE_TAG[opp.stage] ?? 'tag-gray'}`}>{opp.stage_label}</span></td>
                      <td className="txs tg fw6">{fmt(opp.value)}</td>
                      <td className="tmu txs">{relTime(opp.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 阶段漏斗 + 团队 */}
        <div>
          <div className="sh">
            <div><div className="st">商机漏斗</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('team')}>团队 →</button>
          </div>
          <div className="panel">
            <table className="dt">
              <thead><tr><th>阶段</th><th>数量</th><th>占比</th></tr></thead>
              <tbody>
                {stats.pipeline_by_stage.map(s => {
                  const total = stats.active_opportunities || 1
                  const pct = Math.round((s.count / total) * 100)
                  return (
                    <tr key={s.stage}>
                      <td><span className={`tag ${STAGE_TAG[s.stage] ?? 'tag-gray'}`}>{s.label}</span></td>
                      <td className="fw6">{s.count}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '60px', height: '4px', background: 'var(--bg5)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--acc1)', borderRadius: '2px' }}></div>
                          </div>
                          <span className="txs tmu">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="sh" style={{ marginTop: '14px' }}>
            <div><div className="st">团队本月产出</div></div>
          </div>
          <div className="panel">
            <table className="dt">
              <thead><tr><th>成员</th><th>角色</th><th>本月方案</th><th>商机数</th></tr></thead>
              <tbody>
                {stats.team_stats.map(m => (
                  <tr key={m.user_id}>
                    <td className="fw6">{m.name}</td>
                    <td><span className="tag tag-b txs">{m.role}</span></td>
                    <td className="fw6 tg">{m.solutions_this_month}</td>
                    <td className="tmu txs">{m.active_opportunities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
