import { useState, useEffect } from 'react'
import { settingsApi } from '../api'
import type { SystemConfig, LLMTestResult } from '../api/types'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle${value ? ' on' : ''}`} onClick={() => onChange(!value)} />
  )
}

const CLAUDE_MODELS = [
  { value: 'claude-sonnet-4-6',        label: 'Claude Sonnet 4.6（推荐）' },
  { value: 'claude-opus-4-6',          label: 'Claude Opus 4.6（最强）' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5（最快）' },
]

const DEEPSEEK_MODELS = [
  { value: 'deepseek-chat',     label: 'DeepSeek-V3（通用对话）' },
  { value: 'deepseek-reasoner', label: 'DeepSeek-R1（推理增强）' },
]

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

  // ── Anthropic Claude state ──────────────────────────
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-4-6')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [llmConnected, setLlmConnected] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [savingLlm, setSavingLlm] = useState(false)
  const [llmSaveMsg, setLlmSaveMsg] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<LLMTestResult | null>(null)

  // ── DeepSeek state ──────────────────────────────────
  const [deepseekModel, setDeepseekModel] = useState('deepseek-chat')
  const [deepseekKeyInput, setDeepseekKeyInput] = useState('')
  const [deepseekKeyConfigured, setDeepseekKeyConfigured] = useState(false)
  const [deepseekConnected, setDeepseekConnected] = useState(false)
  const [showDeepseekKey, setShowDeepseekKey] = useState(false)
  const [savingDeepseek, setSavingDeepseek] = useState(false)
  const [deepseekSaveMsg, setDeepseekSaveMsg] = useState('')
  const [testingDeepseek, setTestingDeepseek] = useState(false)
  const [deepseekTestResult, setDeepseekTestResult] = useState<LLMTestResult | null>(null)

  // ── System config state ─────────────────────────────
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    settingsApi.get()
      .then(data => {
        setSystem(data.system)
        setApiKeyConfigured(data.llm.anthropic_configured)
        setDeepseekKeyConfigured(data.llm.deepseek_configured)
        const isDeepseek = data.system.default_llm.startsWith('deepseek')
        if (isDeepseek) {
          setDeepseekModel(data.system.default_llm)
          setDeepseekConnected(data.llm.status === 'connected')
        } else {
          setClaudeModel(data.system.default_llm)
          setLlmConnected(data.llm.status === 'connected')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function patch<K extends keyof SystemConfig>(key: K, val: SystemConfig[K]) {
    setSystem(s => ({ ...s, [key]: val }))
  }

  // ── Claude handlers ─────────────────────────────────
  async function handleSaveLlm() {
    setSavingLlm(true)
    setLlmSaveMsg('')
    setTestResult(null)
    try {
      const payload: { anthropic_api_key?: string; default_model?: string } = {
        default_model: claudeModel,
      }
      if (apiKeyInput.trim()) payload.anthropic_api_key = apiKeyInput.trim()
      const llm = await settingsApi.updateLlm(payload)
      setApiKeyConfigured(llm.anthropic_configured)
      setLlmConnected(llm.status === 'connected')
      setSystem(s => ({ ...s, default_llm: claudeModel }))
      if (apiKeyInput.trim()) setApiKeyInput('')
      setLlmSaveMsg('ok')
    } catch (err: unknown) {
      setLlmSaveMsg('err: ' + (err instanceof Error ? err.message : '保存失败'))
    } finally {
      setSavingLlm(false)
      setTimeout(() => setLlmSaveMsg(''), 4000)
    }
  }

  async function handleTestLlm() {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await settingsApi.testLlm({
        provider: 'anthropic',
        api_key: apiKeyInput.trim() || undefined,
      })
      setTestResult(r)
      if (r.ok) setLlmConnected(true)
    } catch {
      setTestResult({ ok: false, model: claudeModel, latency_ms: null, error: '请求失败' })
    } finally {
      setTesting(false)
    }
  }

  // ── DeepSeek handlers ───────────────────────────────
  async function handleSaveDeepseek() {
    setSavingDeepseek(true)
    setDeepseekSaveMsg('')
    setDeepseekTestResult(null)
    try {
      const payload: { deepseek_api_key?: string; default_model?: string } = {
        default_model: deepseekModel,
      }
      if (deepseekKeyInput.trim()) payload.deepseek_api_key = deepseekKeyInput.trim()
      const llm = await settingsApi.updateLlm(payload)
      setDeepseekKeyConfigured(llm.deepseek_configured)
      setDeepseekConnected(llm.status === 'connected')
      setSystem(s => ({ ...s, default_llm: deepseekModel }))
      if (deepseekKeyInput.trim()) setDeepseekKeyInput('')
      setDeepseekSaveMsg('ok')
    } catch (err: unknown) {
      setDeepseekSaveMsg('err: ' + (err instanceof Error ? err.message : '保存失败'))
    } finally {
      setSavingDeepseek(false)
      setTimeout(() => setDeepseekSaveMsg(''), 4000)
    }
  }

  async function handleTestDeepseek() {
    setTestingDeepseek(true)
    setDeepseekTestResult(null)
    try {
      const r = await settingsApi.testLlm({
        provider: 'deepseek',
        api_key: deepseekKeyInput.trim() || undefined,
      })
      setDeepseekTestResult(r)
      if (r.ok) setDeepseekConnected(true)
    } catch {
      setDeepseekTestResult({ ok: false, model: deepseekModel, latency_ms: null, error: '请求失败' })
    } finally {
      setTestingDeepseek(false)
    }
  }

  async function handleSaveSystem() {
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

  if (loading) return (
    <div className="tmu txs" style={{ padding: '40px', textAlign: 'center' }}>加载中…</div>
  )

  // Which provider is currently active
  const activeProvider = system.default_llm.startsWith('deepseek') ? 'deepseek' : 'anthropic'

  return (
    <div>
      <div className="st" style={{ marginBottom: '18px' }}>平台配置中心</div>
      <div className="two" style={{ alignItems: 'start' }}>

        {/* LEFT: LLM 模型接入 */}
        <div>
          <div className="sh">
            <div className="st">🤖 LLM 模型接入</div>
            <span className="tag tag-g txs" style={{ fontSize: '10px' }}>
              当前: {system.default_llm}
            </span>
          </div>

          {/* ── Anthropic Claude ── */}
          <div className="llm" style={{
            borderColor: llmConnected ? 'rgba(0,212,170,.25)'
              : apiKeyConfigured ? 'rgba(99,102,241,.3)' : 'var(--border)',
            opacity: activeProvider === 'anthropic' ? 1 : 0.75,
          }}>
            <div className="llm-logo" style={{ background: 'linear-gradient(135deg,#cc6600,#994d00)' }}>🟠</div>
            <div className="llm-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div className="llm-name">Anthropic Claude</div>
                <span className={`tag ${llmConnected ? 'tag-g' : apiKeyConfigured ? 'tag-o' : 'tag-gray'} txs`}>
                  {llmConnected ? '● 已连通' : apiKeyConfigured ? '● 已配置' : '● 未配置'}
                </span>
                {activeProvider === 'anthropic' && (
                  <span className="tag tag-g txs" style={{ fontSize: '9px' }}>当前使用</span>
                )}
              </div>

              {/* Model selector */}
              <div className="fg" style={{ marginBottom: '10px' }}>
                <div className="fl" style={{ marginBottom: '5px', fontSize: '11.5px' }}>模型</div>
                <select
                  className="fi"
                  style={{ fontSize: '12px', padding: '5px 8px' }}
                  value={claudeModel}
                  onChange={e => setClaudeModel(e.target.value)}
                >
                  {CLAUDE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* API Key input */}
              <div className="fg" style={{ marginBottom: '10px' }}>
                <div className="fl" style={{ marginBottom: '5px', fontSize: '11.5px' }}>
                  API Key
                  {apiKeyConfigured && (
                    <span className="tmu" style={{ marginLeft: '6px', fontSize: '10px' }}>（已保存，输入新值可替换）</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    className="fi"
                    type={showKey ? 'text' : 'password'}
                    placeholder={apiKeyConfigured ? '输入新 Key 可替换…' : 'sk-ant-api03-…'}
                    value={apiKeyInput}
                    onChange={e => { setApiKeyInput(e.target.value); setTestResult(null) }}
                    style={{ flex: 1, fontSize: '12px' }}
                    autoComplete="off"
                  />
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setShowKey(v => !v)}
                    style={{ flexShrink: 0 }}
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <div className="txs tmu" style={{ marginTop: '4px', fontSize: '10.5px' }}>
                  可在 <span style={{ color: 'var(--acc1)' }}>console.anthropic.com</span> 获取
                </div>
              </div>

              {testResult && (
                <div className={`alert ${testResult.ok ? 'a-ok' : 'a-err'}`} style={{ fontSize: '11.5px', marginBottom: '10px' }}>
                  {testResult.ok
                    ? `✓ 连接成功 · ${testResult.model} · 延迟 ${testResult.latency_ms}ms`
                    : `✗ 连接失败：${testResult.error}`}
                </div>
              )}
              {llmSaveMsg && (
                <div className={`alert ${llmSaveMsg === 'ok' ? 'a-ok' : 'a-err'}`} style={{ fontSize: '11.5px', marginBottom: '10px' }}>
                  {llmSaveMsg === 'ok' ? '✓ 配置已保存（Claude 设为默认模型）' : llmSaveMsg}
                </div>
              )}

              <div className="fc g8">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleTestLlm}
                  disabled={testing || (!apiKeyInput.trim() && !apiKeyConfigured)}
                  title={!apiKeyInput.trim() && !apiKeyConfigured ? '请先输入 API Key' : ''}
                >
                  {testing ? '⟳ 测试中…' : '🔌 测试连接'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveLlm}
                  disabled={savingLlm}
                >
                  {savingLlm ? '保存中…' : '保存并设为默认'}
                </button>
              </div>
            </div>
          </div>

          {/* ── DeepSeek ── */}
          <div className="llm" style={{
            borderColor: deepseekConnected ? 'rgba(0,212,170,.25)'
              : deepseekKeyConfigured ? 'rgba(99,102,241,.3)' : 'var(--border)',
            opacity: activeProvider === 'deepseek' ? 1 : 0.75,
          }}>
            <div className="llm-logo" style={{ background: 'linear-gradient(135deg,#1a7ad4,#0d4f8c)' }}>🔷</div>
            <div className="llm-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div className="llm-name">DeepSeek</div>
                <span className={`tag ${deepseekConnected ? 'tag-g' : deepseekKeyConfigured ? 'tag-o' : 'tag-gray'} txs`}>
                  {deepseekConnected ? '● 已连通' : deepseekKeyConfigured ? '● 已配置' : '● 未配置'}
                </span>
                {activeProvider === 'deepseek' && (
                  <span className="tag tag-g txs" style={{ fontSize: '9px' }}>当前使用</span>
                )}
              </div>

              {/* Model selector */}
              <div className="fg" style={{ marginBottom: '10px' }}>
                <div className="fl" style={{ marginBottom: '5px', fontSize: '11.5px' }}>模型</div>
                <select
                  className="fi"
                  style={{ fontSize: '12px', padding: '5px 8px' }}
                  value={deepseekModel}
                  onChange={e => setDeepseekModel(e.target.value)}
                >
                  {DEEPSEEK_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* API Key input */}
              <div className="fg" style={{ marginBottom: '10px' }}>
                <div className="fl" style={{ marginBottom: '5px', fontSize: '11.5px' }}>
                  API Key
                  {deepseekKeyConfigured && (
                    <span className="tmu" style={{ marginLeft: '6px', fontSize: '10px' }}>（已保存，输入新值可替换）</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    className="fi"
                    type={showDeepseekKey ? 'text' : 'password'}
                    placeholder={deepseekKeyConfigured ? '输入新 Key 可替换…' : 'sk-…'}
                    value={deepseekKeyInput}
                    onChange={e => { setDeepseekKeyInput(e.target.value); setDeepseekTestResult(null) }}
                    style={{ flex: 1, fontSize: '12px' }}
                    autoComplete="off"
                  />
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setShowDeepseekKey(v => !v)}
                    style={{ flexShrink: 0 }}
                  >
                    {showDeepseekKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <div className="txs tmu" style={{ marginTop: '4px', fontSize: '10.5px' }}>
                  可在 <span style={{ color: 'var(--acc1)' }}>platform.deepseek.com</span> 获取
                </div>
              </div>

              {deepseekTestResult && (
                <div className={`alert ${deepseekTestResult.ok ? 'a-ok' : 'a-err'}`} style={{ fontSize: '11.5px', marginBottom: '10px' }}>
                  {deepseekTestResult.ok
                    ? `✓ 连接成功 · ${deepseekTestResult.model} · 延迟 ${deepseekTestResult.latency_ms}ms`
                    : `✗ 连接失败：${deepseekTestResult.error}`}
                </div>
              )}
              {deepseekSaveMsg && (
                <div className={`alert ${deepseekSaveMsg === 'ok' ? 'a-ok' : 'a-err'}`} style={{ fontSize: '11.5px', marginBottom: '10px' }}>
                  {deepseekSaveMsg === 'ok' ? '✓ 配置已保存（DeepSeek 设为默认模型）' : deepseekSaveMsg}
                </div>
              )}

              <div className="fc g8">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleTestDeepseek}
                  disabled={testingDeepseek || (!deepseekKeyInput.trim() && !deepseekKeyConfigured)}
                  title={!deepseekKeyInput.trim() && !deepseekKeyConfigured ? '请先输入 API Key' : ''}
                >
                  {testingDeepseek ? '⟳ 测试中…' : '🔌 测试连接'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveDeepseek}
                  disabled={savingDeepseek}
                >
                  {savingDeepseek ? '保存中…' : '保存并设为默认'}
                </button>
              </div>
            </div>
          </div>

          {/* OpenAI — planned */}
          <div className="llm" style={{ opacity: 0.5 }}>
            <div className="llm-logo" style={{ background: 'linear-gradient(135deg,#10a37f,#0d7a5e)' }}>🟢</div>
            <div className="llm-info">
              <div className="llm-name">OpenAI GPT-4o</div>
              <div className="llm-desc">暂未启用（规划中）</div>
              <div className="fc g8 mt8"><span className="tag tag-gray txs">● 未启用</span></div>
            </div>
          </div>

          {/* Private LLM — planned */}
          <div className="llm" style={{ opacity: 0.5 }}>
            <div className="llm-logo" style={{ background: 'linear-gradient(135deg,#1a56db,#0e3a8c)' }}>🔵</div>
            <div className="llm-info">
              <div className="llm-name">私有化 Qwen2.5-72B</div>
              <div className="llm-desc">暂未启用（规划中）</div>
              <div className="fc g8 mt8"><span className="tag tag-gray txs">● 未启用</span></div>
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
            <button className="btn btn-primary btn-sm" onClick={handleSaveSystem} disabled={saving}>
              {saving ? '保存中…' : '保存系统配置'}
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
