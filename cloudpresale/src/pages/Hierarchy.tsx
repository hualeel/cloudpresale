import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { dashboardApi, opportunitiesApi, requirementsApi } from '../api'
import type { HierarchyCustomer, OppStage, ReqStatus, SolStatus } from '../api/types'

function fmt(val: string | null | undefined): string {
  if (!val) return '—'
  const n = parseFloat(val)
  if (n >= 1e4) return `¥${(n / 1e4).toFixed(0)}万`
  return `¥${n.toLocaleString()}`
}

const STAGE_TAG: Record<OppStage, string> = {
  initial: 'tag-gray', req_confirm: 'tag-b', proposal: 'tag-o',
  customer_report: 'tag-p', won: 'tag-g', lost: 'tag-r',
}
const STAGE_LABEL: Record<OppStage, string> = {
  initial: '初步接触', req_confirm: '需求确认', proposal: '方案制作',
  customer_report: '客户汇报', won: '已赢单', lost: '已输单',
}
const REQ_TAG: Record<ReqStatus, string> = {
  draft: 'tag-o', confirmed: 'tag-g', archived: 'tag-gray',
}
const REQ_LABEL: Record<ReqStatus, string> = {
  draft: '草稿', confirmed: '已确认', archived: '已归档',
}
const SOL_TAG: Record<SolStatus, string> = {
  generating: 'tag-o', draft: 'tag-gray', reviewing: 'tag-b',
  approved: 'tag-g', archived: 'tag-gray', completed: 'tag-g', failed: 'tag-r',
}

type SelId = string | null

export function Hierarchy() {
  const { setPage, setModal, setSelectedReqId, setSelectedSolId, setEditingItem } = useStore()
  const [tree, setTree] = useState<HierarchyCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<SelId>(null)

  // 选中节点的详情
  const [detailType, setDetailType] = useState<'opp' | 'req' | 'sol' | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown>>({})

  const fetchTree = useCallback(() => {
    dashboardApi.hierarchy()
      .then(data => {
        setTree(data)
        // 默认选中第一个商机（仅初次加载时）
        setSelId(prev => {
          if (prev === null && data[0]?.opportunities[0]) {
            const opp = data[0].opportunities[0]
            setDetailType('opp')
            setDetail({ ...opp, customer_name: data[0].name })
            return `opp-${opp.id}`
          }
          return prev
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

  useEffect(() => {
    window.addEventListener('data:refresh', fetchTree)
    return () => window.removeEventListener('data:refresh', fetchTree)
  }, [fetchTree])

  function selectNode(type: 'opp' | 'req' | 'sol', id: string, data: Record<string, unknown>) {
    setSelId(`${type}-${id}`)
    setDetailType(type)
    setDetail(data)
    if (type === 'req') setSelectedReqId(id)
    if (type === 'sol') setSelectedSolId(id)
  }

  function handleEditOpp() {
    setEditingItem(detail)
    setModal('editOpp')
  }

  function handleEditReq() {
    setEditingItem(detail)
    setModal('editReq')
  }

  async function handleDeleteOpp() {
    const name = String(detail.name ?? '')
    const id = String(detail.id ?? '')
    if (!id) return
    if (!window.confirm(`确认删除商机「${name}」？\n关联的需求与方案将同步删除，此操作不可撤销。`)) return
    try {
      await opportunitiesApi.delete(id)
      setSelId(null)
      setDetailType(null)
      setDetail({})
      window.dispatchEvent(new Event('data:refresh'))
    } catch (err) {
      console.error(err)
      alert('删除失败，请重试')
    }
  }

  async function handleDeleteReq() {
    const title = String(detail.title ?? '')
    const id = String(detail.id ?? '')
    if (!id) return
    if (!window.confirm(`确认删除需求「${title}」？\n关联的方案将同步删除，此操作不可撤销。`)) return
    try {
      await requirementsApi.delete(id)
      setSelId(null)
      setDetailType(null)
      setDetail({})
      window.dispatchEvent(new Event('data:refresh'))
    } catch (err) {
      console.error(err)
      alert('删除失败，请重试')
    }
  }

  return (
    <div className="two" style={{ alignItems: 'start' }}>
      {/* LEFT: Tree */}
      <div>
        <div className="sh">
          <div>
            <div className="st">客户 · 商机 · 需求 · 方案</div>
            <div className="ss2">四维层级统一管理</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('newOpp')}>＋ 新建</button>
        </div>
        <div className="fc g8 mt4" style={{ marginBottom: '11px', flexWrap: 'wrap' }}>
          <span className="tag dim-c">🏦 客户</span>
          <span className="tag dim-o">💼 商机</span>
          <span className="tag dim-r">📋 需求</span>
          <span className="tag dim-s">📄 方案版本</span>
        </div>

        {loading ? (
          <div className="tmu txs" style={{ padding: '20px' }}>加载中…</div>
        ) : (
          <div className="dim-tree">
            {tree.map(cust => (
              <div key={cust.id}>
                {/* Customer */}
                <div
                  className={`tree-row${selId === `cust-${cust.id}` ? ' sel' : ''}`}
                  onClick={() => selectNode('opp', cust.id, { type: 'customer', ...cust })}
                  style={{ marginTop: '4px' }}
                >
                  <span className="tree-ico">🏦</span>
                  <span className="tree-name">{cust.name}</span>
                  <span className="tag dim-c" style={{ marginRight: '6px' }}>{cust.tier ?? cust.industry}</span>
                  <span className="tree-meta">{cust.opportunities.length}个商机</span>
                </div>

                {cust.opportunities.map(opp => (
                  <div key={opp.id}>
                    {/* Opportunity */}
                    <div
                      className={`tree-row i1${selId === `opp-${opp.id}` ? ' sel' : ''}`}
                      onClick={() => selectNode('opp', opp.id, { ...opp, customer_name: cust.name })}
                    >
                      <span className="tree-ico">💼</span>
                      <span className="tree-name">{opp.name}</span>
                      <span className={`tag ${STAGE_TAG[opp.stage]}`}>{STAGE_LABEL[opp.stage]}</span>
                      <span className="tree-meta" style={{ marginLeft: 'auto' }}>{fmt(opp.value)}</span>
                    </div>

                    {opp.requirements.map(req => (
                      <div key={req.id}>
                        {/* Requirement */}
                        <div
                          className={`tree-row i2${selId === `req-${req.id}` ? ' sel' : ''}`}
                          onClick={() => selectNode('req', req.id, { ...req, opp_name: opp.name, customer_name: cust.name })}
                        >
                          <span className="tree-ico">📋</span>
                          <span className="tree-name">{req.title}</span>
                          <span className={`tag ${REQ_TAG[req.status]}`}>{REQ_LABEL[req.status]}</span>
                        </div>

                        {req.solutions.map(sol => (
                          <div
                            key={sol.id}
                            className={`tree-row i3${selId === `sol-${sol.id}` ? ' sel' : ''}`}
                            onClick={() => selectNode('sol', sol.id, { ...sol, req_title: req.title, customer_name: cust.name })}
                          >
                            <span className="tree-ico">📄</span>
                            <span className="tree-name">技术方案 v{sol.version}</span>
                            <span className={`tag ${sol.is_current ? 'tag-g' : SOL_TAG[sol.status]}`}>
                              {sol.is_current ? '当前版本' : '历史'}
                            </span>
                            <span className="tree-meta" style={{ marginLeft: 'auto' }}>
                              {new Date(sol.created_at).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Detail Panel */}
      <div>
        <div className="sh">
          <div>
            <div className="st">节点详情</div>
            <div className="ss2 txs tmu">
              {detailType === 'opp' && `${String(detail.customer_name ?? '')} · ${String(detail.name ?? '')}`}
              {detailType === 'req' && `${String(detail.customer_name ?? '')} · ${String(detail.title ?? '')}`}
              {detailType === 'sol' && `${String(detail.customer_name ?? '')} · v${String(detail.version ?? '')}`}
              {!detailType && '请从左侧选择节点'}
            </div>
          </div>
          <div className="fc g8">
            {detailType === 'opp' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={handleEditOpp}>编辑</button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red, #e74c3c)' }}
                  onClick={handleDeleteOpp}
                >
                  删除
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setPage('generate'); setSelectedReqId(null) }}>🤖 生成方案</button>
              </>
            )}
            {detailType === 'req' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={handleEditReq}>编辑</button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red, #e74c3c)' }}
                  onClick={handleDeleteReq}
                >
                  删除
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setPage('generate')}>🤖 生成方案</button>
              </>
            )}
          </div>
        </div>

        {detailType === 'opp' && (
          <div className="panel mt4">
            <div className="ph"><span>💼</span><span className="pt">商机信息</span>
              <span className={`tag ${STAGE_TAG[detail.stage as OppStage] ?? 'tag-gray'} ml-auto`}>
                {STAGE_LABEL[detail.stage as OppStage] ?? '—'}
              </span>
            </div>
            <div className="pb-">
              <div className="fgrid">
                <div className="fg"><div className="fl">商机名称</div><div className="ts">{String(detail.name ?? '—')}</div></div>
                <div className="fg"><div className="fl">预估合同额</div><div className="ts tg fw6">{fmt(detail.value as string)}</div></div>
                <div className="fg"><div className="fl">客户</div><div className="ts">{String(detail.customer_name ?? '—')}</div></div>
              </div>
            </div>
          </div>
        )}

        {detailType === 'req' && (
          <div className="panel mt4">
            <div className="ph"><span>📋</span><span className="pt">需求详情</span>
              <span className={`tag ${REQ_TAG[detail.status as ReqStatus] ?? 'tag-gray'} ml-auto`}>
                {REQ_LABEL[detail.status as ReqStatus] ?? '—'}
              </span>
            </div>
            <div className="pb-">
              <div className="fc g12" style={{ marginBottom: '14px' }}>
                <span className="txs tmu">需求完整度</span>
                <div style={{ flex: 1, height: '5px', background: 'var(--bg5)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(Number(detail.completeness) * 100).toFixed(0)}%`, height: '100%', background: 'linear-gradient(90deg,var(--acc3),var(--acc1))', borderRadius: '3px' }}></div>
                </div>
                <span className="ts fw6 tg">{(Number(detail.completeness) * 100).toFixed(0)}%</span>
              </div>
              <div className="fg"><div className="fl">需求标题</div><div className="ts">{String(detail.title ?? '—')}</div></div>
              <div className="fg mt8"><div className="fl">版本</div><div className="ts">v{String(detail.version ?? '1')}</div></div>
            </div>
          </div>
        )}

        {detailType === 'sol' && (
          <div className="panel mt4">
            <div className="ph"><span>📄</span><span className="pt">方案版本 v{String(detail.version ?? '')}</span>
              <span className={`tag ${detail.is_current ? 'tag-g' : 'tag-gray'} ml-auto`}>
                {detail.is_current ? '当前版本' : '历史版本'}
              </span>
            </div>
            <div className="pb-">
              <div className="fg"><div className="fl">需求</div><div className="ts">{String(detail.req_title ?? '—')}</div></div>
              <div className="fg mt8"><div className="fl">状态</div><div className="ts">{String(detail.status ?? '—')}</div></div>
              <div className="fg mt8"><div className="fl">创建时间</div>
                <div className="ts">{detail.created_at ? new Date(String(detail.created_at)).toLocaleString('zh-CN') : '—'}</div>
              </div>
              <button className="btn btn-primary btn-sm mt16" onClick={() => setPage('deliverables')}>查看交付物</button>
            </div>
          </div>
        )}

        {!detailType && (
          <div className="panel mt4">
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🌲</div>
              <div className="txs">从左侧树形列表选择节点<br />查看详细信息</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
