import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { customersApi, opportunitiesApi } from '../../api'
import type { CustomerOut } from '../../api/types'

const STAGE_OPTIONS = [
  { value: 'initial', label: '初步接触' },
  { value: 'req_confirm', label: '需求确认' },
  { value: 'proposal', label: '方案制作' },
  { value: 'customer_report', label: '客户汇报' },
  { value: 'won', label: '已赢单' },
  { value: 'lost', label: '已输单' },
]

export function NewOpportunityModal() {
  const { openModal, setModal, editingItem, newOppCustomerId, setNewOppCustomerId } = useStore()
  const isEditMode = openModal === 'editOpp'
  const isOpen = openModal === 'newOpp' || isEditMode

  const [customers, setCustomers] = useState<CustomerOut[]>([])
  const [customerId, setCustomerId] = useState('')
  const [oppName, setOppName] = useState('')
  const [oppStage, setOppStage] = useState('initial')
  const [value, setValue] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [description, setDescription] = useState('')
  const [rawInput, setRawInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load customer list when create modal opens
  useEffect(() => {
    if (openModal === 'newOpp') {
      customersApi.list({ limit: 200 }).then(data => {
        setCustomers(data.items)
        // Pre-select customer from context (e.g. clicked from Hierarchy)
        const presel = newOppCustomerId ?? (data.items[0]?.id ?? '')
        setCustomerId(presel)
      }).catch(console.error)
    }
  }, [openModal, newOppCustomerId])

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
    setCustomers([]); setCustomerId('')
    setOppName(''); setOppStage('initial'); setValue('')
    setCloseDate(''); setDescription(''); setRawInput(''); setError('')
    setNewOppCustomerId(null)
  }

  function close() { reset(); setModal(null) }

  function parseValue(raw: string): number | undefined {
    if (!raw.trim()) return undefined
    const v = raw.replace(/[¥,\s]/g, '').replace('万', '0000').replace('亿', '00000000')
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  async function handleSubmit() {
    if (isEditMode) {
      if (!oppName.trim()) { setError('请填写商机名称'); return }
      setError(''); setLoading(true)
      try {
        await opportunitiesApi.update(editingItem.id, {
          name: oppName.trim(),
          stage: oppStage as any,
          value: parseValue(value.toString()),
          expected_close: closeDate.trim() || undefined,
          key_requirements: description.trim() || undefined,
        } as any)
        close()
        window.dispatchEvent(new Event('data:refresh'))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '更新失败，请重试')
      } finally { setLoading(false) }
    } else {
      if (!customerId) { setError('请选择客户'); return }
      if (!oppName.trim()) { setError('请填写商机名称'); return }
      setError(''); setLoading(true)
      try {
        await opportunitiesApi.create({
          customer_id: customerId,
          name: oppName.trim(),
          stage: oppStage as any,
          value: parseValue(value),
          key_requirements: rawInput.trim() || description.trim() || undefined,
        })
        close()
        window.dispatchEvent(new Event('data:refresh'))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '创建失败，请重试')
      } finally { setLoading(false) }
    }
  }

  return (
    <div className="mo open" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="modal">
        <div className="mh">
          <div className="mt_">{isEditMode ? '编辑商机' : '新建商机'}</div>
          <button className="mc-" onClick={close}>×</button>
        </div>
        <div className="mb_">
          {error && <div className="alert a-err" style={{ marginBottom: '10px' }}>{error}</div>}
          <div className="fgrid">
            {/* Create mode: customer selector */}
            {!isEditMode && (
              <div className="fg full">
                <div className="fl">所属客户 *</div>
                {customers.length === 0 ? (
                  <div className="alert a-warn" style={{ marginTop: '4px' }}>
                    暂无客户，请先
                    <button className="btn btn-ghost btn-xs" style={{ marginLeft: '6px' }}
                      onClick={() => { close(); setTimeout(() => setModal('newCustomer'), 100) }}>
                      新建客户
                    </button>
                  </div>
                ) : (
                  <select className="fs" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                    <option value="">— 请选择客户 —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="fg full">
              <div className="fl">商机名称 *</div>
              <input className="fi" placeholder="例如：核心系统容器化改造"
                value={oppName} onChange={e => setOppName(e.target.value)} />
            </div>

            <div className="fg">
              <div className="fl">阶段</div>
              <select className="fs" value={oppStage} onChange={e => setOppStage(e.target.value)}>
                {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="fg">
              <div className="fl">预估合同额</div>
              <input className="fi" placeholder="例如：1000万"
                value={value} onChange={e => setValue(e.target.value)} />
            </div>

            <div className="fg">
              <div className="fl">预计关闭日期</div>
              <input className="fi" type="date"
                value={closeDate} onChange={e => setCloseDate(e.target.value)} />
            </div>

            <div className="fg full">
              <div className="fl">{isEditMode ? '商机描述' : '初步了解的客户诉求'}</div>
              <textarea className="ft"
                placeholder={isEditMode ? '商机背景、客户情况…' : '粘贴沟通记录、RFP摘要，AI将自动解析结构化需求…'}
                value={isEditMode ? description : rawInput}
                onChange={e => isEditMode ? setDescription(e.target.value) : setRawInput(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="btn btn-ghost" onClick={close} disabled={loading}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || (!isEditMode && customers.length === 0)}>
            {loading ? (isEditMode ? '保存中…' : '创建中…') : (isEditMode ? '保存修改' : '创建商机')}
          </button>
        </div>
      </div>
    </div>
  )
}
