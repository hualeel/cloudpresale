import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { opportunitiesApi } from '../api'
import type { KanbanColumn, OppStage } from '../api/types'

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
  return d < 7 ? `${d}天前` : new Date(iso).toLocaleDateString('zh-CN')
}

const STAGE_ICON: Record<OppStage, string> = {
  initial: '📥', req_confirm: '📋', proposal: '🤖',
  customer_report: '🎯', won: '✅', lost: '❌',
}

const VISIBLE_STAGES: OppStage[] = ['initial', 'req_confirm', 'proposal', 'customer_report']

export function Kanban() {
  const { setModal, setPage } = useStore()
  const [board, setBoard] = useState<Record<string, KanbanColumn>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    opportunitiesApi.kanban()
      .then(setBoard)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalCount = Object.values(board).reduce((s, c) => s + c.count, 0)
  const totalValue = Object.values(board)
    .flatMap(c => c.items)
    .reduce((s, o) => s + parseFloat(o.value ?? '0'), 0)

  return (
    <div>
      <div className="sh">
        <div>
          <div className="st">商机看板</div>
          <div className="ss2">
            {loading ? '加载中…' : `${totalCount} 个活跃商机 · 预估总额 ${fmt(String(totalValue))}`}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('newOpp')}>＋ 新建商机</button>
      </div>

      {loading ? (
        <div className="tmu txs" style={{ padding: '40px', textAlign: 'center' }}>加载中…</div>
      ) : (
        <div className="kanban">
          {VISIBLE_STAGES.map(stage => {
            const col = board[stage]
            if (!col) return null
            return (
              <div key={stage} className="kcol">
                <div className="kcol-h">
                  <span className="kcol-t">{STAGE_ICON[stage]} {col.label}</span>
                  <span className="kcol-n">{col.count}</span>
                </div>
                <div className="kcol-b">
                  {col.items.length === 0 && (
                    <div className="tmu txs" style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px' }}>暂无商机</div>
                  )}
                  {col.items.map(opp => (
                    <div
                      key={opp.id}
                      className="opp-c"
                      onClick={() => setPage('requirements')}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="opp-n">{opp.name}</div>
                      <div className="opp-cl">{opp.customer_name}</div>
                      <div className="opp-ft">
                        <span className="opp-v">{fmt(opp.value)}</span>
                        <span className="opp-d">{relTime(opp.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
