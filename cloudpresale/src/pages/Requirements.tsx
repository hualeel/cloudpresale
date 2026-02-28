import { useState, useEffect, useCallback } from 'react'
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

  const fetchReqs = useCallback(() => {
    requirementsApi.list()
      .then(data => {
        setReqs(data.items)
        if (data.items.length > 0) {
          setSelected(prev => {
            // Keep current selection if it still exists, otherwise use first
            const still = data.items.find(r => r.id === prev?.id)
            return still ?? data.items[0]
          })
        } else {
          setSelected(null)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchReqs()
  }, [fetchReqs])

  // Listen for cross-page refresh events
  useEffect(() => {
    window.addEventListener('data:refresh', fetchReqs)
    return () => window.removeEventListener('data:refresh', fetchReqs)
  }, [fetchReqs])

  function handleGenerate(req: RequirementOut) {
    setSelectedReqId(req.id)
    setPage('generate')
  }

  function handleEdit(req: RequirementOut) {
    setEditingItem(req)
    setModal('editReq')
  }

  async function handleDelete(req: RequirementOut) {
    if (!window.confirm(`确认删除需求「${req.title}」？\n关联的方案将同步删除，此操作不可撤销。`)) return
    // Optimistic: remove immediately
    const remaining = reqs.filter(r => r.id !== req.id)
    setReqs(remaining)
    if (selected?.id === req.id) setSelected(remaining.length > 0 ? remaining[0] : null)
    try {
      await requirementsApi.delete(req.id)
    } catch (err) {
      console.error(err)
      alert('删除失败，请重试')
      fetchReqs() // restore on failure
    }
  }

  const content = selected?.content ?? {}

  return (
    <div>
      <div className="sh">
        <div>
          <div className="st">需求管理</div>
          <div className="ss2">{loading ? '加载中…' : `共 ${reqs.length} 条需求`}</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('newReq')}>＋ 新建需求</button>
      </div>

      <div className="alert a-info">💡 需求完整度越高，AI生成方案质量越好。建议填写所有必填字段后再触发方案生成。</div>

      {/* Selected requirement detail */}
      {selected && (
        <div className="panel">
          <div className="ph">
            <span>📋</span>
            <span className="pt">{selected.customer_name} · {selected.opportunity_name} · 需求详情</span>
            <span className={`tag ${STATUS_TAG[selected.status]} ml-auto`}>{STATUS_LABEL[selected.status]}</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: '9px' }} onClick={() => handleEdit(selected)}>
              编辑
            </button>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: '9px' }} onClick={() => handleGenerate(selected)}>
              🤖 生成方案
            </button>
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

      {/* Requirements list */}
      <div className="mt16">
        <div className="sh"><div className="st">需求列表</div></div>
        <div className="panel">
          {loading ? (
            <div className="tmu txs" style={{ padding: '20px', textAlign: 'center' }}>加载中…</div>
          ) : reqs.length === 0 ? (
            <div className="tmu txs" style={{ padding: '20px', textAlign: 'center' }}>
              暂无需求，<button className="btn btn-ghost btn-xs" onClick={() => setModal('newReq')}>新建需求</button>
            </div>
          ) : (
            <table className="dt">
              <thead><tr><th>需求标题</th><th>客户</th><th>完整度</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
              <tbody>
                {reqs.map(req => (
                  <tr key={req.id} onClick={() => setSelected(req)} style={{ cursor: 'pointer' }}
                    className={selected?.id === req.id ? 'sel' : ''}>
                    <td><span className="fw6">{req.title}</span></td>
                    <td className="txs tmu">{req.customer_name}</td>
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
                        <button className="btn btn-primary btn-xs" onClick={() => handleGenerate(req)}>
                          生成方案
                        </button>
                        <button className="btn btn-ghost btn-xs" onClick={() => handleEdit(req)}>
                          编辑
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--red, #e74c3c)' }}
                          onClick={() => handleDelete(req)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
