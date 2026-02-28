import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { customersApi } from '../../api'
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

export function NewCustomerModal() {
  const { openModal, setModal } = useStore()
  const isOpen = openModal === 'newCustomer'

  const [name, setName] = useState('')
  const [industry, setIndustry] = useState<Industry>('bank_state')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  function close() {
    setName(''); setIndustry('bank_state'); setError('')
    setModal(null)
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('请填写客户名称'); return }
    setError('')
    setLoading(true)
    try {
      await customersApi.create({ name: name.trim(), industry })
      close()
      window.dispatchEvent(new Event('data:refresh'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mo open" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="modal">
        <div className="mh">
          <div className="mt_">新建客户</div>
          <button className="mc-" onClick={close}>×</button>
        </div>
        <div className="mb_">
          {error && <div className="alert a-err">{error}</div>}
          <div className="fgrid">
            <div className="fg full">
              <div className="fl">客户名称 *</div>
              <input className="fi" placeholder="例如：中国工商银行"
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <div className="fg full">
              <div className="fl">行业类型 *</div>
              <select className="fs" value={industry} onChange={e => setIndustry(e.target.value as Industry)}>
                {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="btn btn-ghost" onClick={close} disabled={loading}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '创建中…' : '创建客户'}
          </button>
        </div>
      </div>
    </div>
  )
}
