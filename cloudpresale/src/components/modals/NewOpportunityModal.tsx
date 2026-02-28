import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { customersApi, opportunitiesApi } from '../../api'
import type { Industry } from '../../api/types'

const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: 'bank_state', label: '银行（国有大行）' },
  { value: 'bank_joint', label: '银行（股份制）' },
  { value: 'bank_city', label: '银行（城商行/农商行）' },
  { value: 'insurance', label: '保险' },
  { value: 'securities', label: '券商' },
  { value: 'fund', label: '基金' },
  { value: 'other', label: '其他' },
]

const STAGE_OPTIONS = [
  { value: 'initial', label: '初步接触' },
  { value: 'req_confirm', label: '需求确认' },
  { value: 'proposal', label: '方案制作' },
  { value: 'customer_report', label: '客户汇报' },
  { value: 'won', label: '已赢单' },
  { value: 'lost', label: '已输单' },
]

export function NewOpportunityModal() {
  const { openModal, setModal, editingItem } = useStore()
  const isEditMode = openModal === 'editOpp'
  const isOpen = openModal === 'newOpp' || isEditMode

  const [customerName, setCustomerName] = useState('')
  const [industry, setIndustry] = useState<Industry>('bank_state')
  const [oppName, setOppName] = useState('')
  const [oppStage, setOppStage] = useState('initial')
  const [value, setValue] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [description, setDescription] = useState('')
  const [rawInput, setRawInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill form when entering edit mode
  useEffect(() => {
    if (isEditMode && editingItem) {
      setOppName(editingItem.name ?? '')
      setOppStage(editingItem.stage ?? 'initial')
      setValue(editingItem.value ?? '')
      setCloseDate(editingItem.expected_close ?? '')
      setDescription(editingItem.key_requirements ?? '')
    }
  }, [isEditMode, editingItem])

  if (!isOpen) return null

  function reset() {
    setCustomerName(''); setIndustry('bank_state'); setOppName('')
    setOppStage('initial'); setValue(''); setCloseDate('')
    setDescription(''); setRawInput(''); setError('')
  }

  function close() { reset(); setModal(null) }

  async function handleSubmit() {
    if (isEditMode) {
      // Edit mode: PATCH opportunity
      if (!oppName.trim()) { setError('请填写商机名称'); return }
      setError('')
      setLoading(true)
      try {
        let numValue: number | undefined
        if (value.toString().trim()) {
          const v = value.toString().replace(/[¥,\s]/g, '').replace('万', '0000').replace('亿', '00000000')
          const parsed = parseFloat(v)
          if (!isNaN(parsed)) numValue = parsed
        }
        await opportunitiesApi.update(editingItem.id, {
          name: oppName.trim(),
          stage: oppStage as any,
          value: numValue,
          expected_close: closeDate.trim() || undefined,
          key_requirements: description.trim() || undefined,
        } as any)
        close()
        window.dispatchEvent(new Event('data:refresh'))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '更新失败，请重试')
      } finally {
        setLoading(false)
      }
    } else {
      // Create mode: create customer then opportunity
      if (!customerName.trim()) { setError('请填写客户名称'); return }
      if (!oppName.trim()) { setError('请填写商机名称'); return }
      setError('')
      setLoading(true)
      try {
        // Create customer
        const customer = await customersApi.create({
          name: customerName.trim(),
          industry,
        })
        // Parse value: strip non-numeric chars, convert 万 to actual number
        let numValue: number | undefined
        if (value.trim()) {
          const v = value.replace(/[¥,\s]/g, '').replace('万', '0000').replace('亿', '00000000')
          const parsed = parseFloat(v)
          if (!isNaN(parsed)) numValue = parsed
        }
        // Create opportunity
        await opportunitiesApi.create({
          customer_id: customer.id,
          name: oppName.trim(),
          value: numValue,
          key_requirements: rawInput.trim() || undefined,
        })
        close()
        // Reload the page data by dispatching a custom event
        window.dispatchEvent(new Event('data:refresh'))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '创建失败，请重试')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="mo open" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="modal">
        <div className="mh">
          <div className="mt_">{isEditMode ? '编辑商机' : '新建客户 / 商机'}</div>
          <button className="mc-" onClick={close}>×</button>
        </div>
        <div className="mb_">
          {!isEditMode && (
            <div className="alert a-info">💡 填写客户和商机信息，后续在该商机下创建需求和生成方案。</div>
          )}
          {error && <div className="alert a-err" style={{ marginTop: '8px' }}>{error}</div>}
          <div className="fgrid">
            {!isEditMode && (
              <>
                <div className="fg full">
                  <div className="fl">客户名称 *</div>
                  <input className="fi" placeholder="例如：中国工商银行"
                    value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div className="fg">
                  <div className="fl">行业类型 *</div>
                  <select className="fs" value={industry} onChange={e => setIndustry(e.target.value as Industry)}>
                    {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="fg">
              <div className="fl">商机名称 *</div>
              <input className="fi" placeholder="例如：云原生平台建设"
                value={oppName} onChange={e => setOppName(e.target.value)} />
            </div>
            {isEditMode && (
              <div className="fg">
                <div className="fl">阶段</div>
                <select className="fs" value={oppStage} onChange={e => setOppStage(e.target.value)}>
                  {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            <div className="fg">
              <div className="fl">预估合同额</div>
              <input className="fi" placeholder="例如：1000万"
                value={value} onChange={e => setValue(e.target.value)} />
            </div>
            {isEditMode && (
              <>
                <div className="fg">
                  <div className="fl">预计关闭日期</div>
                  <input className="fi" type="date"
                    value={closeDate} onChange={e => setCloseDate(e.target.value)} />
                </div>
                <div className="fg full">
                  <div className="fl">商机描述</div>
                  <textarea className="ft" placeholder="商机背景、客户情况…"
                    value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              </>
            )}
            {!isEditMode && (
              <div className="fg full">
                <div className="fl">初步了解的客户诉求</div>
                <textarea className="ft" placeholder="粘贴沟通记录、RFP摘要，AI将自动解析结构化需求…"
                  value={rawInput} onChange={e => setRawInput(e.target.value)} />
              </div>
            )}
          </div>
        </div>
        <div className="mf">
          <button className="btn btn-ghost" onClick={close} disabled={loading}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (isEditMode ? '保存中…' : '创建中…') : (isEditMode ? '保存修改' : '创建商机 →')}
          </button>
        </div>
      </div>
    </div>
  )
}
