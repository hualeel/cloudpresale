import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { solutionsApi, requirementsApi, deliverablesApi } from '../api'
import type { SolutionOut, RequirementOut, DeliverableOut, DlvType } from '../api/types'

async function downloadPackage(solId: string, setPackaging: (id: string | null) => void) {
  setPackaging(solId)
  try {
    const { url } = await deliverablesApi.packageUrl(solId)
    window.open(url, '_blank')
  } catch {
    alert('打包下载失败（存储服务未连接或暂无就绪交付物）')
  } finally {
    setPackaging(null)
  }
}

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

type ReqGroup = {
  req: RequirementOut
  solutions: SolutionOut[]
}

export function Deliverables() {
  const { setPage } = useStore()
  const [allReqs, setAllReqs] = useState<RequirementOut[]>([])
  const [groups, setGroups] = useState<ReqGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterOpp, setFilterOpp] = useState('')
  const [filterReq, setFilterReq] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [packaging, setPackaging] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      requirementsApi.list(),
      solutionsApi.list(),
    ]).then(([reqData, solData]) => {
      // Keep all requirements for filter dropdowns
      setAllReqs(reqData.items)

      const reqMap = new Map<string, RequirementOut>(reqData.items.map(r => [r.id, r]))
      const groupMap = new Map<string, ReqGroup>()
      for (const sol of solData.items) {
        if (!groupMap.has(sol.requirement_id)) {
          const req = reqMap.get(sol.requirement_id)
          if (!req) continue
          groupMap.set(sol.requirement_id, { req, solutions: [] })
        }
        groupMap.get(sol.requirement_id)!.solutions.push(sol)
      }
      for (const g of groupMap.values()) {
        g.solutions.sort((a, b) => {
          if (a.is_current !== b.is_current) return a.is_current ? -1 : 1
          return Number(b.version) - Number(a.version)
        })
      }
      const sorted = [...groupMap.values()].sort((a, b) => {
        const ca = a.req.customer_name ?? '', cb = b.req.customer_name ?? ''
        if (ca !== cb) return ca.localeCompare(cb)
        const oa = a.req.opportunity_name ?? '', ob = b.req.opportunity_name ?? ''
        if (oa !== ob) return oa.localeCompare(ob)
        return a.req.title.localeCompare(b.req.title)
      })
      setGroups(sorted)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Filter options derived from ALL requirements (not just solution groups)
  const customers = useMemo(() => {
    const set = new Set(allReqs.map(r => r.customer_name).filter(Boolean))
    return Array.from(set).sort()
  }, [allReqs])

  const opportunities = useMemo(() => {
    const map = new Map<string, string>()
    allReqs
      .filter(r => !filterCustomer || r.customer_name === filterCustomer)
      .forEach(r => {
        if (r.opportunity_id) map.set(r.opportunity_id, r.opportunity_name ?? r.opportunity_id)
      })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [allReqs, filterCustomer])

  const reqOptions = useMemo(() => {
    return allReqs
      .filter(r => {
        if (filterCustomer && r.customer_name !== filterCustomer) return false
        if (filterOpp && r.opportunity_id !== filterOpp) return false
        return true
      })
      .map(r => ({ id: r.id, title: r.title }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [allReqs, filterCustomer, filterOpp])

  // Reset downstream filters when upstream changes
  useEffect(() => { setFilterOpp(''); setFilterReq('') }, [filterCustomer])
  useEffect(() => { setFilterReq('') }, [filterOpp])

  // Apply all filters
  const filtered = useMemo(() => {
    return groups.filter(g => {
      if (filterCustomer && g.req.customer_name !== filterCustomer) return false
      if (filterOpp && g.req.opportunity_id !== filterOpp) return false
      if (filterReq && g.req.id !== filterReq) return false
      return true
    })
  }, [groups, filterCustomer, filterOpp, filterReq])

  const hasFilter = !!(filterCustomer || filterOpp || filterReq || filterType)

  async function handleDownload(dlv: DeliverableOut) {
    setDownloading(dlv.id)
    try { await download(dlv) } finally { setDownloading(null) }
  }

  // Count ready deliverables across filtered groups
  const totalDlv = filtered.reduce((n, g) =>
    n + g.solutions.reduce((m, s) => m + s.deliverables.filter(d => d.status === 'ready').length, 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="sh">
        <div>
          <div className="st">交付物管理</div>
          <div className="ss2">
            {loading ? '加载中…'
              : hasFilter
                ? `全部 ${groups.length} 组，筛选后 ${filtered.length} 组 · ${totalDlv} 个文件就绪`
                : `共 ${groups.length} 组需求 · ${totalDlv} 个文件就绪`}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setPage('generate')}>✨ 生成新方案</button>
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

          <select className="fs" style={{ width: '200px', padding: '5px 8px', fontSize: '12px' }}
            value={filterReq} onChange={e => setFilterReq(e.target.value)}>
            <option value="">全部需求</option>
            {reqOptions.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>

          <select className="fs" style={{ width: '110px', padding: '5px 8px', fontSize: '12px' }}
            value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">全部类型</option>
            <option value="word">Word</option>
            <option value="ppt">PPT</option>
          </select>

          {hasFilter && (
            <button className="btn btn-ghost btn-xs" onClick={() => {
              setFilterCustomer(''); setFilterOpp(''); setFilterReq(''); setFilterType('')
            }}>✕ 清除</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="tmu txs" style={{ padding: '40px', textAlign: 'center' }}>加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📦</div>
            <div className="txs">
              {hasFilter ? '没有符合条件的交付物，' : '暂无交付物，'}
            </div>
            <div style={{ marginTop: '10px' }}>
              {hasFilter
                ? <button className="btn btn-ghost btn-xs" onClick={() => { setFilterCustomer(''); setFilterOpp(''); setFilterReq(''); setFilterType('') }}>清除筛选</button>
                : <button className="btn btn-primary btn-sm" onClick={() => setPage('generate')}>✨ 生成方案</button>}
            </div>
          </div>
        </div>
      ) : (
        filtered.map(({ req, solutions }) => (
          <div key={req.id} className="panel" style={{ marginBottom: '18px' }}>
            {/* Panel header — full breadcrumb */}
            <div className="ph">
              <span>📋</span>
              <span className="pt" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                <span className="tag dim-c" style={{ fontSize: '11px' }}>🏦 {req.customer_name}</span>
                <span className="tmu">›</span>
                <span className="tag dim-o" style={{ fontSize: '11px' }}>💼 {req.opportunity_name}</span>
                <span className="tmu">›</span>
                <span>{req.title}</span>
              </span>
              <span className="txs tmu ml-auto" style={{ flexShrink: 0 }}>{solutions.length} 个版本</span>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: '10px', flexShrink: 0 }}
                onClick={() => setPage('generate')}>
                ➕ 新版本迭代
              </button>
            </div>
            <div className="pb-">
              {solutions.map((sol, idx) => {
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
                        {sol.deliverables.some(d => d.status === 'ready') && (
                          <button
                            className="btn btn-ghost btn-xs"
                            disabled={packaging === sol.id}
                            onClick={() => downloadPackage(sol.id, setPackaging)}
                            title="打包下载全部交付物（ZIP）"
                          >
                            {packaging === sol.id ? '打包中…' : '📦 打包下载'}
                          </button>
                        )}
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
