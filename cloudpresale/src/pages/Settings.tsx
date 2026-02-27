import { useState, useEffect } from 'react'
import { settingsApi } from '../api'
import type { SystemConfig, LLMTestResult } from '../api/types'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle${value ? ' on' : ''}`} onClick={() => onChange(!value)} />
  )
}

const LLM_MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001']

export function Settings() {
  const [system, setSystem] = useState<SystemConfig>({
    default_llm: 'claude-sonnet-4-6',
    sensitive_data_routing: true,
    rag_top_k: 5,
    agent_timeout_minutes: 5,
    audit_log_enabled: true,
    auto_knowledge_base: true,
    max_concurrent_generations: 5,
  })
  const [anthropicConfigured, setAnthropicConfigured] = useState(false)
  const [llmConnected, setLlmConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<LLMTestResult | null>(null)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    settingsApi.get()
      .then(data => {
        setSystem(data.system)
        setAnthropicConfigured(data.llm.anthropic_configured)
        setLlmConnected(data.llm.status === 'connected')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function patch<K extends keyof SystemConfig>(key: K, val: SystemConfig[K]) {
    setSystem(s => ({ ...s, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    try {
      await settingsApi.updateSystem(system)
      setSaveMsg('ok')
    } catch {
      setSaveMsg('err')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function handleTestLlm() {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await settingsApi.testLlm()
      setTestResult(r)
      if (r.ok) setLlmConnected(true)
    } catch {
      setTestResult({ ok: false, model: system.default_llm, latency_ms: null, error: '请求失败' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return (
    <div className="tmu txs" style={{ padding: '40px', textAlign: 'center' }}>加载中…</div>
  )

  return (
    <div>
      <div className="st" style={{ marginBottom: '18px' }}>平台配置中心</div>
      <div className="two" style={{ alignItems: 'start' }}>

        {/* LEFT: LLM 模型接入 */}
        <div>
          <div className="sh"><div className="st">🤖 LLM 模型接入</div></div>

          {/* Anthropic Claude */}
          <div className="llm" style={{ borderColor: llmConnected ? 'rgba(0,212,170,.25)' : 'var(--border)' }}>
            <div className="llm-logo" style={{ background: 'linear-gradient(135deg,#cc6600,#994d00)' }}>🟠</div>
            <div className="llm-info">
              <div className="llm-name">Anthropic Claude</div>
              <div className="llm-desc">
                {anthropicConfigured
                  ? 'API Key 已通过环境变量配置（ANTHROPIC_API_KEY）。'
                  : 'API Key 未配置，请在服务器环境变量中设置 ANTHROPIC_API_KEY。'}
              </div>
              <div className="llm-row">
                <input
                  className="llm-key"
                  type="password"
                  value={anthropicConfigured ? '••••••••••••••••' : ''}
                  placeholder="通过环境变量 ANTHROPIC_API_KEY 配置"
                  disabled
                  style={{ opacity: 0.6 }}
                />
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={handleTestLlm}
                  disabled={testing || !anthropicConfigured}
                >
                  {testing ? '测试中…' : '测试'}
                </button>
                <span className={`tag ${llmConnected ? 'tag-g' : anthropicConfigured ? 'tag-o' : 'tag-gray'} txs`}>
                  {llmConnected ? '● 已连通' : anthropicConfigured ? '● 未验证' : '● 未配置'}
                </span>
              </div>
              {testResult && (
                <div className={`alert ${testResult.ok ? 'a-ok' : 'a-err'} mt8`} style={{ fontSize: '11.5px' }}>
                  {testResult.ok
                    ? `✓ 连通正常 · ${testResult.model} · ${testResult.latency_ms}ms`
                    : `✗ 连接失败：${testResult.error}`}
                </div>
              )}
              <div className="fc g8 mt8">
                <select
                  className="fi"
                  style={{ fontSize: '11px', padding: '3px 7px', width: 'auto' }}
                  value={system.default_llm}
                  onChange={e => patch('default_llm', e.target.value)}
                >
                  {LLM_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="txs tmu">默认模型</span>
              </div>
            </div>
          </div>

          {/* OpenAI — UI only */}
          <div className="llm" style={{ opacity: 0.5 }}>
            <div className="llm-logo" style={{ background: 'linear-gradient(135deg,#10a37f,#0d7a5e)' }}>🟢</div>
            <div className="llm-info">
              <div className="llm-name">OpenAI GPT-4o</div>
              <div className="llm-desc">暂未启用（规划中）</div>
              <div className="fc g8 mt8">
                <span className="tag tag-gray txs">● 未启用</span>
              </div>
            </div>
          </div>

          {/* Private LLM — UI only */}
          <div className="llm" style={{ opacity: 0.5 }}>
            <div className="llm-logo" style={{ background: 'linear-gradient(135deg,#1a56db,#0e3a8c)' }}>🔵</div>
            <div className="llm-info">
              <div className="llm-name">私有化 Qwen2.5-72B</div>
              <div className="llm-desc">暂未启用（规划中）</div>
              <div className="fc g8 mt8">
                <span className="tag tag-gray txs">● 未启用</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: 系统参数 */}
        <div>
          <div className="sh"><div className="st">⚙️ 系统参数</div></div>
          <div className="panel" style={{ marginBottom: '14px' }}>
            <div className="pb-">

              <div className="cfg-row">
                <div>
                  <div className="cfg-lbl">敏感数据路由</div>
                  <div className="cfg-desc">含客户名称的请求自动路由至私有化模型</div>
                </div>
                <Toggle value={system.sensitive_data_routing} onChange={v => patch('sensitive_data_routing', v)} />
              </div>

              <div className="cfg-row">
                <div><div className="cfg-lbl">RAG Top-K</div><div className="cfg-desc">每次检索返回文档块数量</div></div>
                <select className="fi" style={{ width: '70px', fontSize: '11.5px', padding: '4px 7px' }}
                  value={system.rag_top_k}
                  onChange={e => patch('rag_top_k', Number(e.target.value))}>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                </select>
              </div>

              <div className="cfg-row">
                <div><div className="cfg-lbl">Agent 超时时间</div></div>
                <select className="fi" style={{ width: '90px', fontSize: '11.5px', padding: '4px 7px' }}
                  value={system.agent_timeout_minutes}
                  onChange={e => patch('agent_timeout_minutes', Number(e.target.value))}>
                  <option value={5}>5分钟</option>
                  <option value={10}>10分钟</option>
                </select>
              </div>

              <div className="cfg-row">
                <div><div className="cfg-lbl">操作审计日志</div></div>
                <Toggle value={system.audit_log_enabled} onChange={v => patch('audit_log_enabled', v)} />
              </div>

              <div className="cfg-row">
                <div>
                  <div className="cfg-lbl">成功案例自动回流</div>
                  <div className="cfg-desc">赢单后方案自动入库知识库</div>
                </div>
                <Toggle value={system.auto_knowledge_base} onChange={v => patch('auto_knowledge_base', v)} />
              </div>

              <div className="cfg-row">
                <div>
                  <div className="cfg-lbl">并发生成上限</div>
                  <div className="cfg-desc">同时允许的方案生成任务数</div>
                </div>
                <select className="fi" style={{ width: '70px', fontSize: '11.5px', padding: '4px 7px' }}
                  value={system.max_concurrent_generations}
                  onChange={e => patch('max_concurrent_generations', Number(e.target.value))}>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>

            </div>
          </div>

          <div className="fc g8" style={{ justifyContent: 'flex-end' }}>
            {saveMsg === 'ok' && <span className="tag tag-g txs">✓ 已保存</span>}
            {saveMsg === 'err' && <span className="tag tag-r txs">✗ 保存失败</span>}
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? '保存中…' : '保存配置'}
            </button>
          </div>

          <div className="sh" style={{ marginTop: '18px' }}><div className="st">🚀 GitHub / CI/CD 配置</div></div>
          <div className="panel">
            <div className="pb-">
              <div className="fg mt4"><div className="fl">GitHub 仓库地址</div><input className="fi" defaultValue="https://github.com/yourorg/cloudpresale-ai" /></div>
              <div className="fg mt8"><div className="fl">镜像仓库地址</div><input className="fi" defaultValue="registry.yourcompany.com/presale" /></div>
              <div className="fg mt8"><div className="fl">K8s 集群 API Server</div><input className="fi" defaultValue="https://k8s.internal:6443" /></div>
              <div className="fg mt8"><div className="fl">部署命名空间</div><input className="fi" defaultValue="presale-prod" /></div>
              <div className="fc g8 mt12" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm">保存配置</button>
                <button className="btn btn-primary btn-sm">测试连接</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
