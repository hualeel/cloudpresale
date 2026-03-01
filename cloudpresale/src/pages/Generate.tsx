import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { requirementsApi, solutionsApi } from '../api'
import type { RequirementOut, SolutionProgress, AgentType } from '../api/types'

const AGENT_LABEL: Record<AgentType, string> = {
  arch: '架构设计 Agent', sizing: '规模测算 Agent', security: '安全合规 Agent',
  migration: '迁移路径 Agent', plan: '实施计划 Agent', pricing: '报价估算 Agent',
}
const DLV_OPTIONS = [
  { key: 'word_tech',      icon: '📘', name: 'Word技术方案',    desc: '完整技术方案文档，供技术团队评审' },
  { key: 'ppt_overview',  icon: '📊', name: '总体方案PPT',     desc: '面向IT管理层的技术方案演示' },
  { key: 'ppt_exec',      icon: '🎯', name: '高层汇报PPT',     desc: '面向CIO/决策层的精简汇报版本' },
  { key: 'ppt_container', icon: '📑', name: '容器平台专项PPT', desc: '面向IT基础架构团队，含架构与规格详情' },
  { key: 'ppt_devops',    icon: '📑', name: 'DevOps专项PPT',   desc: '面向开发/DevOps团队，含迁移与实施计划' },
  { key: 'ppt_security',  icon: '🔐', name: '安全合规专项PPT', desc: '面向安全团队/CISO，含等保合规详述' },
]
const STATUS_TAG: Record<string, string> = {
  draft: 'tag-o', confirmed: 'tag-g', archived: 'tag-gray',
}
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿', confirmed: '已确认', archived: '已归档',
}

export function Generate() {
  const { setPage, selectedReqId } = useStore()

  const [reqs, setReqs] = useState<RequirementOut[]>([])
  const [currentReqId, setCurrentReqId] = useState<string | null>(selectedReqId)
  const [req, setReq] = useState<RequirementOut | null>(null)
  const [changeNote, setChangeNote] = useState('')
  const [dlvSelected, setDlvSelected] = useState([true, true, true, false, false, false])

  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterOpp, setFilterOpp] = useState('')

  const [solId, setSolId] = useState<string | null>(null)
  const [progress, setProgress] = useState<SolutionProgress | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load ALL requirements
  useEffect(() => {
    requirementsApi.list().then(data => {
      setReqs(data.items)
      if (selectedReqId) {
        const found = data.items.find(r => r.id === selectedReqId)
        if (found) {
          setCurrentReqId(selectedReqId)
          setReq(found)
          setFilterCustomer(found.customer_name ?? '')
          setFilterOpp(found.opportunity_id ?? '')
          return
        }
      }
      // Default: auto-select first item
      const first = data.items[0] ?? null
      if (first) {
        setCurrentReqId(first.id)
        setReq(first)
      }
    }).catch(console.error)
  }, [])

  // Unique customers
  const customers = useMemo(() => {
    const set = new Set(reqs.map(r => r.customer_name).filter((n): n is string => n !== null))
    return Array.from(set).sort()
  }, [reqs])

  // Opportunities filtered by selected customer
  const opportunities = useMemo(() => {
    const map = new Map<string, string>()
    reqs
      .filter(r => !filterCustomer || r.customer_name === filterCustomer)
      .forEach(r => { if (r.opportunity_id) map.set(r.opportunity_id, r.opportunity_name ?? r.opportunity_id) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [reqs, filterCustomer])

  // Reset opp filter when customer changes
  useEffect(() => { setFilterOpp('') }, [filterCustomer])

  // Requirements filtered by customer + opp
  const filteredReqs = useMemo(() => {
    return reqs.filter(r => {
      if (filterCustomer && r.customer_name !== filterCustomer) return false
      if (filterOpp && r.opportunity_id !== filterOpp) return false
      return true
    })
  }, [reqs, filterCustomer, filterOpp])

  // When filter changes, keep selection if still valid; otherwise pick first
  useEffect(() => {
    if (filteredReqs.length === 0) { setCurrentReqId(null); setReq(null); return }
    const still = filteredReqs.find(r => r.id === currentReqId)
    if (!still) { setCurrentReqId(filteredReqs[0].id); setReq(filteredReqs[0]) }
  }, [filteredReqs])

  // Poll progress
  useEffect(() => {
    if (!solId) return
    pollRef.current = setInterval(async () => {
      try {
        const p = await solutionsApi.progress(solId)
        setProgress(p)
        if (p.solution_status === 'completed' || p.solution_status === 'failed') {
          clearInterval(pollRef.current!)
          setGenerating(false)
        }
      } catch { /* ignore */ }
    }, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [solId])

  async function handleGenerate() {
    if (!currentReqId) return
    setError('')
    setGenerating(true)
    setSolId(null)
    setProgress(null)
    try {
      const types = DLV_OPTIONS.filter((_, i) => dlvSelected[i]).map(d => d.key)
      const sol = await solutionsApi.create({
        requirement_id: currentReqId,
        change_note: changeNote || undefined,
        deliverable_types: types,
      })
      setSolId(sol.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建方案失败')
      setGenerating(false)
    }
  }

  const doneCount = progress?.agents_done ?? 0
  const totalAgents = progress?.agents_total ?? 6
  const overallPct = progress ? Math.round(progress.overall_progress * 100) : 0

  return (
    <div className="two" style={{ alignItems: 'start' }}>
      {/* LEFT: Controls + Progress */}
      <div>
        <div className="sh">
          <div>
            <div className="st">AI方案生成</div>
            <div className="ss2">{req ? `${req.customer_name} · ${req.opportunity_name}` : '请选择需求'}</div>
          </div>
        </div>

        {/* Steps */}
        <div className="steps">
          <div className={`step ${req ? 'done' : 'active'}`}><div className="step-c">{req ? '✓' : '1'}</div><span className="step-l">选择需求</span></div>
          <div className={`step-line ${req ? 'done' : ''}`}></div>
          <div className={`step ${generating || progress ? 'active' : ''}`}><div className="step-c">2</div><span className="step-l">Agent生成</span></div>
          <div className={`step-line ${progress?.solution_status === 'completed' ? 'done' : ''}`}></div>
          <div className={`step ${progress?.solution_status === 'completed' ? 'done' : ''}`}><div className="step-c">3</div><span className="step-l">归档交付物</span></div>
        </div>

        {/* Requirement Select */}
        <div className="panel mt4" style={{ marginBottom: '14px' }}>
          <div className="ph"><span>📋</span><span className="pt">选择需求</span>
            <span className="txs tmu ml-auto">{filteredReqs.length} 条</span>
          </div>
          <div className="pb-">

            {/* Cascading filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <select className="fs" style={{ flex: 1, minWidth: '120px', padding: '5px 8px', fontSize: '12px' }}
                value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
                <option value="">全部客户</option>
                {customers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="fs" style={{ flex: 1, minWidth: '140px', padding: '5px 8px', fontSize: '12px' }}
                value={filterOpp} onChange={e => setFilterOpp(e.target.value)}>
                <option value="">全部商机</option>
                {opportunities.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>

            {/* Requirement cards */}
            {filteredReqs.length === 0 ? (
              <div className="tmu txs" style={{ padding: '16px', textAlign: 'center' }}>暂无需求，请调整筛选条件</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                {filteredReqs.map(r => (
                  <div key={r.id}
                    onClick={() => { setCurrentReqId(r.id); setReq(r) }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1.5px solid ${currentReqId === r.id ? 'var(--acc1)' : 'var(--border1)'}`,
                      background: currentReqId === r.id ? 'rgba(99,102,241,0.06)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span className="fw6" style={{ fontSize: '12.5px' }}>{r.title}</span>
                        <span className="txs tmu">v{r.version}</span>
                      </div>
                      <div className="txs tmu" style={{ marginTop: '2px' }}>
                        🏦 {r.customer_name} · 💼 {r.opportunity_name}
                      </div>
                    </div>
                    <span className={`tag ${STATUS_TAG[r.status]}`} style={{ fontSize: '10px', flexShrink: 0 }}>{STATUS_LABEL[r.status]}</span>
                    <span className="txs tg fw6" style={{ flexShrink: 0, minWidth: '30px', textAlign: 'right' }}>{(r.completeness * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}

            <div className="fg" style={{ marginTop: '12px' }}>
              <div className="fl" style={{ marginBottom: '6px' }}>版本备注（可选）</div>
              <input className="fi" value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="例如：补充信创适配方案" />
            </div>
          </div>
        </div>

        {/* Agent Progress */}
        {(generating || progress) && (
          <div className="panel" style={{ marginBottom: '14px' }}>
            <div className="ph">
              <span>🤖</span>
              <span className="pt">多Agent并行生成</span>
              <span className="tag tag-o ml-auto">{doneCount}/{totalAgents} 完成</span>
            </div>
            <div className="pb-">
              <div className="ag-grid">
                {(progress?.agents ?? []).map((ag, i) => {
                  const isDone = ag.status === 'done'
                  const isRun = ag.status === 'running'
                  const pct = isDone ? 100 : Math.round(ag.progress * 100)
                  return (
                    <div key={i} className={`ag${isDone ? ' done' : isRun ? ' run' : ''}`}>
                      <div className="ag-h">
                        <div className="ag-dot"></div>
                        <div>
                          <div className="ag-name">{AGENT_LABEL[ag.agent_type]}</div>
                          <div className="ag-status">
                            {isDone ? `✓ 完成${ag.finished_at ? ` · ${Math.round((new Date(ag.finished_at).getTime() - new Date(ag.started_at!).getTime()) / 1000)}s` : ''}` : ag.status === 'running' ? '生成中…' : '等待中'}
                          </div>
                        </div>
                      </div>
                      <div className="pbar">
                        <div className={`pfill ${isDone ? 'pf-g' : isRun ? 'pf-y' : 'pf-b'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  )
                })}
                {(progress?.agents ?? []).length === 0 && Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="ag">
                    <div className="ag-h"><div className="ag-dot"></div><div><div className="ag-name">{Object.values(AGENT_LABEL)[i]}</div><div className="ag-status">等待中</div></div></div>
                    <div className="pbar"><div className="pfill pf-b" style={{ width: '0%' }}></div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Deliverable Selection */}
        <div className="panel">
          <div className="ph">
            <span>📦</span>
            <span className="pt">选择输出交付物</span>
            <span className="txs tmu ml-auto">已选 {dlvSelected.filter(Boolean).length} 项</span>
          </div>
          <div className="pb-">
            <div className="dlv-grid">
              {DLV_OPTIONS.map((d, i) => (
                <div key={i} className={`dlv${dlvSelected[i] ? ' on' : ''}`} onClick={() => setDlvSelected(s => s.map((v, j) => j === i ? !v : v))}>
                  <div className="ck">{dlvSelected[i] ? '✓' : ''}</div>
                  <div className="dlv-icon">{d.icon}</div>
                  <div className="dlv-name">{d.name}</div>
                  <div className="dlv-desc">{d.desc}</div>
                </div>
              ))}
            </div>
            {error && <div className="alert a-err" style={{ margin: '10px 0 0' }}>{error}</div>}
            {progress?.solution_status === 'completed' && (
              <div className="alert a-ok" style={{ margin: '10px 0 0' }}>✅ 方案生成完成！</div>
            )}
            <div className="fc g8 mt16" style={{ justifyContent: 'flex-end' }}>
              {progress?.solution_status === 'completed' && (
                <button className="btn btn-ghost" onClick={() => setPage('deliverables')}>查看交付物</button>
              )}
              <button
                className="btn btn-success"
                onClick={handleGenerate}
                disabled={generating || !currentReqId}
              >
                {generating ? `⟳ 生成中 ${overallPct}%…` : '✨ 生成并归档交付物包'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Preview */}
      <div>
        <div className="sh"><div className="st">需求信息预览</div></div>
        {req ? (
          <div className="panel">
            <div className="ph">
              <span>📋</span>
              <span className="pt" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                <span className="tag dim-c" style={{ fontSize: '11px' }}>🏦 {req.customer_name}</span>
                <span className="tmu">›</span>
                <span className="tag dim-o" style={{ fontSize: '11px' }}>💼 {req.opportunity_name}</span>
                <span className="tmu">›</span>
                <span>{req.title}</span>
              </span>
              <span className="tag tag-g ml-auto" style={{ flexShrink: 0 }}>完整度 {(req.completeness * 100).toFixed(0)}%</span>
            </div>
            <div className="pb-" style={{ fontSize: '12px', lineHeight: 1.7, color: 'var(--text2)' }}>
              {Object.entries(req.content).map(([k, v]) => (
                v ? (
                  <div key={k} className="fc g8 mt4">
                    <span className="tag tag-b" style={{ fontSize: '10px' }}>{k}</span>
                    <span className="txs">{Array.isArray(v) ? v.join('、') : String(v)}</span>
                  </div>
                ) : null
              ))}
              {req.raw_input && (
                <>
                  <div className="div"></div>
                  <div className="fl" style={{ marginBottom: '6px' }}>原始需求描述</div>
                  <div className="tmu" style={{ fontSize: '12px' }}>{req.raw_input}</div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="panel">
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🤖</div>
              <div className="txs">选择需求<br />开始 AI 方案生成</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
