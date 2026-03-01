import { useState } from 'react'
import type { FormEvent } from 'react'
import { authApi } from '../api'
import { useStore } from '../store/useStore'

export function Login() {
  const { login } = useStore()
  const [email, setEmail] = useState('zhang@presale.ai')
  const [password, setPassword] = useState('demo123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const resp = await authApi.login(email, password)
      login(resp.access_token, resp.user)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', flexDirection: 'column', gap: '24px',
    }}>
      {/* Logo */}
      <div style={{textAlign: 'center'}}>
        <div style={{fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)', letterSpacing: '-0.5px'}}>
          Solve<span style={{color: 'var(--acc1)'}}>IQ</span>
        </div>
        <div style={{color: 'var(--text3)', fontSize: '13px', marginTop: '6px'}}>方案智能协同平台</div>
      </div>

      {/* Card */}
      <div className="panel" style={{width: '360px', padding: '28px 32px'}}>
        <div className="st" style={{marginBottom: '20px', textAlign: 'center'}}>登录账号</div>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
          <div>
            <div className="fl" style={{marginBottom: '6px'}}>邮箱</div>
            <input
              className="fi"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@presale.ai"
              required
              style={{width: '100%'}}
            />
          </div>
          <div>
            <div className="fl" style={{marginBottom: '6px'}}>密码</div>
            <input
              className="fi"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{width: '100%'}}
            />
          </div>
          {error && (
            <div className="alert a-err" style={{margin: 0, padding: '8px 12px', fontSize: '12.5px'}}>
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{marginTop: '4px', width: '100%', justifyContent: 'center'}}
          >
            {loading ? '登录中…' : '登录'}
          </button>
        </form>

        {/* Quick logins */}
        <div style={{marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px'}}>
          <div className="fl" style={{marginBottom: '10px', textAlign: 'center'}}>快速登录演示账号</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
            {[
              { label: '系统管理员', email: 'admin@presale.ai', pw: 'admin123', tag: 'tag-r' },
              { label: '高级SA 李华', email: 'zhang@presale.ai', pw: 'demo123', tag: 'tag-b' },
              { label: '高级SA 李鸿宇', email: 'li@presale.ai', pw: 'demo123', tag: 'tag-p' },
            ].map(acc => (
              <button
                key={acc.email}
                className="btn btn-ghost btn-sm"
                style={{justifyContent: 'flex-start', gap: '8px'}}
                onClick={() => { setEmail(acc.email); setPassword(acc.pw) }}
                type="button"
              >
                <span className={`tag ${acc.tag}`} style={{fontSize: '10px', padding: '1px 6px'}}>{acc.label}</span>
                <span className="tmu txs">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
