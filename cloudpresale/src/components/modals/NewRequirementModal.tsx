import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { opportunitiesApi, requirementsApi } from '../../api'
import type { OpportunityOut } from '../../api/types'

const complianceOptions = ['等保三级', '等保二级', '信创适配', '金融监管合规', 'SOC2']
const moduleOptions = ['容器平台', 'DevOps平台', '微服务治理', '中间件服务', 'AI推理服务', '数据平台']

const CONTAINERIZATION_OPTIONS = ['0-20%', '20-50%', '50-80%', '80%以上']
const TARGET_OPTIONS = ['50%+', '70%+', '80%+', '90%+']

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

export function NewRequirementModal() {
  const { openModal, setModal, setSelectedReqId, setPage } = useStore()
  const [opps, setOpps] = useState<OpportunityOut[]>([])
  const [oppId, setOppId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [currentContainer, setCurrentContainer] = useState('20-50%')
  const [targetContainer, setTargetContainer] = useState('80%+')
  const [clusterCount, setClusterCount] = useState('')
  const [budgetRange, setBudgetRange] = useState('')
  const [decisionTimeline, setDecisionTimeline] = useState('')
  const [compliance, setCompliance] = useState(['等保三级', '信创适配', '金融监管合规'])
  const [modules, setModules] = useState(['容器平台', 'DevOps平台', '微服务治理', '中间件服务'])
  const [painPoints, setPainPoints] = useState('')
  const [rawInput, setRawInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (openModal !== 'newReq') return
    opportunitiesApi.list()
      .then(data => {
        setOpps(data.items)
        if (data.items.length > 0 && !oppId) setOppId(data.items[0].id)
      })
      .catch(console.error)
  }, [openModal])

  if (openModal !== 'newReq') return null

  function reset() {
    setTitle(''); setPainPoints(''); setRawInput(''); setError('')
    setCurrentContainer('20-50%'); setTargetContainer('80%+')
    setClusterCount(''); setBudgetRange(''); setDecisionTimeline('')
    setCompliance(['等保三级', '信创适配', '金融监管合规'])
    setModules(['容器平台', 'DevOps平台', '微服务治理', '中间件服务'])
  }

  function close() { reset(); setModal(null) }

  async function handleSubmit(goGenerate: boolean) {
    if (!oppId) { setError('请选择关联商机'); return }
    if (!title.trim()) { setError('请填写需求标题'); return }
    setError('')
    setLoading(true)
    try {
      const req = await requirementsApi.create({
        opportunity_id: oppId,
        title: title.trim(),
        content: {
          current_containerization: currentContainer,
          target_containerization: targetContainer,
          cluster_count: clusterCount || undefined,
          budget_range: budgetRange || undefined,
          decision_timeline: decisionTimeline || undefined,
          compliance,
          modules,
          pain_points: painPoints || undefined,
        },
        raw_input: rawInput.trim() || undefined,
      })
      reset()
      setModal(null)
      if (goGenerate) {
        setSelectedReqId(req.id)
        setPage('generate')
      }
      window.dispatchEvent(new Event('data:refresh'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mo open" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="modal wide">
        <div className="mh">
          <div className="mt_">新建需求</div>
          <button className="mc-" onClick={close}>×</button>
        </div>
        <div className="mb_">
          {error && <div className="alert a-err" style={{ marginBottom: '10px' }}>{error}</div>}
          <div className="fgrid">
            <div className="fg">
              <div className="fl">关联商机 *</div>
              <select className="fs" value={oppId} onChange={e => setOppId(e.target.value)}>
                {opps.length === 0 && <option value="">暂无商机，请先新建</option>}
                {opps.map(o => (
                  <option key={o.id} value={o.id}>{o.customer_name} · {o.name}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <div className="fl">需求标题 *</div>
              <input className="fi" placeholder="例如：容器平台建设需求 v1.0"
                value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="fg">
              <div className="fl">当前容器化比例</div>
              <select className="fs" value={currentContainer} onChange={e => setCurrentContainer(e.target.value)}>
                {CONTAINERIZATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="fg">
              <div className="fl">目标容器化比例</div>
              <select className="fs" value={targetContainer} onChange={e => setTargetContainer(e.target.value)}>
                {TARGET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="fg">
              <div className="fl">集群数量</div>
              <input className="fi" placeholder="例如：4（生产×2，测试×1，开发×1）"
                value={clusterCount} onChange={e => setClusterCount(e.target.value)} />
            </div>
            <div className="fg">
              <div className="fl">预算范围</div>
              <input className="fi" placeholder="例如：1000-1500万"
                value={budgetRange} onChange={e => setBudgetRange(e.target.value)} />
            </div>
            <div className="fg">
              <div className="fl">预计决策时间</div>
              <input className="fi" placeholder="例如：2025年Q1"
                value={decisionTimeline} onChange={e => setDecisionTimeline(e.target.value)} />
            </div>
            <div className="fg full">
              <div className="fl">合规要求</div>
              <div className="cg mt4">
                {complianceOptions.map(opt => (
                  <label key={opt} className={`ci${compliance.includes(opt) ? ' on' : ''}`}
                    onClick={() => setCompliance(toggle(compliance, opt))}>
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="fg full">
              <div className="fl">功能模块</div>
              <div className="cg mt4">
                {moduleOptions.map(opt => (
                  <label key={opt} className={`ci${modules.includes(opt) ? ' on' : ''}`}
                    onClick={() => setModules(toggle(modules, opt))}>
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="fg full">
              <div className="fl">痛点与诉求</div>
              <textarea className="ft" placeholder="描述客户的核心痛点、业务目标…"
                style={{ minHeight: '72px' }} value={painPoints} onChange={e => setPainPoints(e.target.value)} />
            </div>
            <div className="fg full">
              <div className="fl">沟通记录（AI自动解析）</div>
              <textarea className="ft" style={{ minHeight: '90px' }}
                placeholder="粘贴会议纪要、微信截图文字、RFP原文…"
                value={rawInput} onChange={e => setRawInput(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="btn btn-ghost" onClick={close} disabled={loading}>取消</button>
          <button className="btn btn-ghost" onClick={() => handleSubmit(false)} disabled={loading}>
            {loading ? '保存中…' : '仅保存需求'}
          </button>
          <button className="btn btn-primary" onClick={() => handleSubmit(true)} disabled={loading}>
            {loading ? '保存中…' : '保存 → 生成方案'}
          </button>
        </div>
      </div>
    </div>
  )
}
