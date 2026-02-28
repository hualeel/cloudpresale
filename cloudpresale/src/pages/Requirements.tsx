import { useState, useEffect, useCallback, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { requirementsApi } from '../api'
import type { RequirementOut, ReqStatus } from '../api/types'

const STATUS_TAG: Record<ReqStatus, string> = {
  draft: 'tag-o', confirmed: 'tag-g', archived: 'tag-gray',
}
const STATUS_LABEL: Record<ReqStatus, string> = {
  draft: '草稿', confirmed: '已确认', archived: '已归档',
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}天前` : new Date(iso).toLocaleDateString('zh-CN')
}

export function Requirements() {
  const { setPage, setModal, setSelectedReqId, setEditingItem } = useStore()
  const [reqs, setReqs] = useState<RequirementOut[]>([])
  const [selected, setSelected] = useState<RequirementOut | null>(null)
  const [loading, setLoading] = useState(true)

  // Filter state
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterOpp, setFilterOpp] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterKeyword, setFilterKeyword] = useState('')

  const fetchReqs = useCallback(() => {
    requirementsApi.list()
      .then(data => {
        setReqs(data.items)
        setSelected(prev => {
          if (!prev) return data.items[0] ?? null
          return data.items.find(r => r.id === prev.id) ?? data.items[0] ?? null
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchReqs() }, [fetchReqs])
  useEffect(() => {
    window.addEventListener('data:refresh', fetchReqs)
    return () => window.removeEventListener('data:refresh', fetchReqs)
  }, [fetchReqs])

  // Unique customers for filter dropdown (sorted)
  const customers = useMemo(() => {
    const set = new Set(reqs.map(r => r.customer_name).filter(Boolean))
    return Array.from(set).sort()
  }, [reqs])

  // Unique opportunities filtered by selected customer
  const opportunities = useMemo(() => {
    const map = new Map<string, string>()
    reqs
      .filter(r => !filterCustomer || r.customer_name === filterCustomer)
      .forEach(r => { if (r.opportunity_id) map.set(r.opportunity_id, r.opportunity_name ?? r.opportunity_id) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [reqs, filterCustomer])

  // Reset opp filter when customer changes
  useEffect(() => { setFilterOpp('') }, [filterCustomer])

  // Apply filters, then sort by customer → opp → title for grouped display
  const filtered = useMemo(() => {
    return reqs
      .filter(r => {
        if (filterCustomer && r.customer_name !== filterCustomer) return false
        if (filterOpp && r.opportunity_id !== filterOpp) return false
        if (filterStatus && r.status !== filterStatus) return false
        if (filterKeyword) {
          const kw = filterKeyword.toLowerCase()
          if (!r.title.toLowerCase().includes(kw) &&
              !(r.customer_name ?? '').toLowerCase().includes(kw) &&
              !(r.opportunity_name ?? '').toLowerCase().includes(kw)) return false
        }
        return true
      })
      .sort((a, b) => {
        const ca = a.customer_name ?? '', cb = b.customer_name ?? ''
        if (ca !== cb) return ca.localeCompare(cb)
        const oa = a.opportunity_name ?? '', ob = b.opportunity_name ?? ''
        if (oa !== ob) return oa.localeCompare(ob)
        return a.title.localeCompare(b.title)
      })
  }, [reqs, filterCustomer, filterOpp, filterStatus, filterKeyword])

  function handleGenerate(req: RequirementOut) { setSelectedReqId(req.id); setPage('generate') }
  function handleEdit(req: RequirementOut) { setEditingItem(req); setModal('editReq') }

  async function handleDelete(req: RequirementOut) {
    if (!window.confirm(`确认删除需求「${req.title}」？\n关联的方案将同步删除，此操作不可撤销。`)) return
    const remaining = reqs.filter(r => r.id !== req.id)
    setReqs(remaining)
    if (selected?.id === req.id) setSelected(remaining[0] ?? null)
    try {
      await requirementsApi.delete(req.id)
    } catch (err) {
      console.error(err)
      alert('删除失败，请重试')
      fetchReqs()
    }
  }

  const hasFilter = !!(filterCustomer || filterOpp || filterStatus || filterKeyword)
  const content = selected?.content ?? {}

  return (
    <div>
      {/* Header */}
      <div className="sh">
        <div>
          <div className="st">需求管理</div>
          <div className="ss2">
            {loading ? '加载中…'
              : hasFilter ? `全部 ${reqs.length} 条，筛选后 ${filtered.length} 条`
              : `共 ${reqs.length} 条需求`}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('newReq')}>＋ 新建需求</button>
      </div>

      {/* Filter bar */}
      <div className="panel" style={{ marginBottom: '14px' }}>
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="txs tmu" style={{ flexShrink: 0 }}>筛选：</span>

          <select className="fs" style={{ width: '150px', padding: '5px 8px', fontSize: '12px' }}
            value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
            <option value="">全部客户</option>
            {customers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select className="fs" style={{ width: '180px', padding: '5px 8px', fontSize: '12px' }}
            value={filterOpp} onChange={e => setFilterOpp(e.target.value)}>
            <option value="">全部商机</option>
            {opportunities.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>

          <select className="fs" style={{ width: '110px', padding: '5px 8px', fontSize: '12px' }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="confirmed">已确认</option>
            <option value="archived">已归档</option>
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

      {/* Selected requirement detail */}
      {selected && (
        <div className="panel" style={{ marginBottom: '14px' }}>
          <div className="ph">
            <span>📋</span>
            <span className="pt" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
              <span className="tag dim-c" style={{ fontSize: '11px' }}>🏦 {selected.customer_name}</span>
              <span className="tmu">›</span>
              <span className="tag dim-o" style={{ fontSize: '11px' }}>💼 {selected.opportunity_name}</span>
              <span className="tmu">›</span>
              <span>{selected.title}</span>
            </span>
            <span className={`tag ${STATUS_TAG[selected.status]} ml-auto`}>{STATUS_LABEL[selected.status]}</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: '9px' }} onClick={() => handleEdit(selected)}>编辑</button>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: '9px' }} onClick={() => handleGenerate(selected)}>🤖 生成方案</button>
          </div>
          <div className="pb-">
            <div className="fc g12" style={{ marginBottom: '14px' }}>
              <span className="txs tmu">需求完整度</span>
              <div style={{ flex: 1, height: '5px', background: 'var(--bg5)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(selected.completeness * 100).toFixed(0)}%`, height: '100%', background: 'linear-gradient(90deg,var(--acc3),var(--acc1))', borderRadius: '3px' }}></div>
              </div>
              <span className="ts fw6 tg">{(selected.completeness * 100).toFixed(0)}%</span>
            </div>
            <div className="three">
              <div>
                <div className="fl" style={{ marginBottom: '8px' }}>📍 客户基础信息</div>
                <div className="fg mt8"><div className="fl">行业类型</div><div className="ts">{String(content.industry ?? '—')}</div></div>
                <div className="fg mt8"><div className="fl">预算范围</div><div className="ts fw6">{String(content.budget_range ?? '—')}</div></div>
                <div className="fg mt8"><div className="fl">决策时间</div><div className="ts">{String(content.decision_timeline ?? '—')}</div></div>
              </div>
              <div>
                <div className="fl" style={{ marginBottom: '8px' }}>🔧 技术现状</div>
                <div className="fg mt8"><div className="fl">当前容器化</div><div className="ts">{String(content.current_containerization ?? '—')}</div></div>
                <div className="fg mt8"><div className="fl">集群数量</div><div className="ts">{String(content.cluster_count ?? '—')}</div></div>
                <div className="fg mt8"><div className="fl">核心痛点</div><div className="ts tmu">{String(content.pain_points ?? '—')}</div></div>
              </div>
              <div>
                <div className="fl" style={{ marginBottom: '8px' }}>🎯 建设目标</div>
                <div className="fg mt8"><div className="fl">目标容器化</div><div className="ts fw6 tg">{String(content.target_containerization ?? '—')}</div></div>
                <div className="fg mt8"><div className="fl">合规要求</div>
                  <div className="fc g8 mt4" style={{ flexWrap: 'wrap' }}>
                    {Array.isArray(content.compliance)
                      ? content.compliance.map((c, i) => <span key={i} className="tag tag-r">{String(c)}</span>)
                      : <span className="tmu txs">—</span>}
                  </div>
                </div>
                <div className="fg mt8"><div className="fl">功能模块</div>
                  <div className="fc g8 mt4" style={{ flexWrap: 'wrap' }}>
                    {Array.isArray(content.modules)
                      ? content.modules.map((m, i) => <span key={i} className="tag tag-b">{String(m)}</span>)
                      : <span className="tmu txs">—</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requirements table — grouped by customer → opportunity */}
      <div className="panel">
        {loading ? (
          <div className="tmu txs" style={{ padding: '20px', textAlign: 'center' }}>加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="tmu txs" style={{ padding: '24px', textAlign: 'center' }}>
            {hasFilter ? '没有符合条件的需求，' : '暂无需求，'}
            {hasFilter
              ? <button className="btn btn-ghost btn-xs" onClick={() => { setFilterCustomer(''); setFilterOpp(''); setFilterStatus(''); setFilterKeyword('') }}>清除筛选</button>
              : <button className="btn btn-ghost btn-xs" onClick={() => setModal('newReq')}>新建需求</button>}
          </div>
        ) : (
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>客户</th>
                <th style={{ width: '160px' }}>商机</th>
                <th>需求标题</th>
                <th style={{ width: '110px' }}>完整度</th>
                <th style={{ width: '72px' }}>状态</th>
                <th style={{ width: '80px' }}>更新时间</th>
                <th style={{ width: '190px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, idx) => {
                const prev = idx > 0 ? filtered[idx - 1] : null
                const newCust = !prev || prev.customer_name !== req.customer_name
                const newOpp = !prev || prev.opportunity_id !== req.opportunity_id

                return (
                  <tr key={req.id}
                    onClick={() => setSelected(req)}
                    style={{
                      cursor: 'pointer',
                      borderTop: newCust ? '2px solid var(--acc1)' : undefined,
                    }}
                    className={selected?.id === req.id ? 'sel' : ''}>

                    {/* Customer column — show name only on first row of each customer group */}
                    <td style={{ verticalAlign: 'top', paddingTop: newCust ? '10px' : '4px' }}>
                      {newCust && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '11px' }}>🏦</span>
                          <span className="fw6" style={{ fontSize: '12px' }}>{req.customer_name || '—'}</span>
                        </div>
                      )}
                    </td>

                    {/* Opportunity column — show name only on first row of each opp group */}
                    <td style={{ verticalAlign: 'top', paddingTop: newOpp ? '10px' : '4px' }}>
                      {newOpp && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '11px' }}>💼</span>
                          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{req.opportunity_name || '—'}</span>
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="fw6" style={{ fontSize: '12.5px' }}>{req.title}</span>
                      <span className="txs tmu" style={{ marginLeft: '6px' }}>v{req.version}</span>
                    </td>

                    <td>
                      <div className="fc g8">
                        <div style={{ width: '60px', height: '4px', background: 'var(--bg5)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${(req.completeness * 100).toFixed(0)}%`, height: '100%', background: 'var(--acc3)' }}></div>
                        </div>
                        <span className="txs tg">{(req.completeness * 100).toFixed(0)}%</span>
                      </div>
                    </td>

                    <td><span className={`tag ${STATUS_TAG[req.status]}`}>{STATUS_LABEL[req.status]}</span></td>
                    <td className="txs tmu">{relTime(req.created_at)}</td>

                    <td>
                      <div className="fc g8" onClick={e => e.stopPropagation()}>
                        <button className="btn btn-primary btn-xs" onClick={() => handleGenerate(req)}>生成方案</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => handleEdit(req)}>编辑</button>
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red, #e74c3c)' }}
                          onClick={() => handleDelete(req)}>删除</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
