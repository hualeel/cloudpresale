import { useState } from 'react'

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return <button className={`toggle${on ? ' on' : ''}`} onClick={() => setOn(!on)}></button>
}

export function Settings() {
  return (
    <div>
      <div className="st" style={{marginBottom:'18px'}}>平台配置中心</div>
      <div className="two" style={{alignItems:'start'}}>
        <div>
          <div className="sh"><div className="st">🤖 LLM 模型接入</div></div>

          {/* Claude */}
          <div className="llm" style={{borderColor:'rgba(0,212,170,.25)'}}>
            <div className="llm-logo" style={{background:'linear-gradient(135deg,#cc6600,#994d00)'}}>🟠</div>
            <div className="llm-info">
              <div className="llm-name">Anthropic Claude Sonnet 4.6</div>
              <div className="llm-desc">长文档生成效果优秀，适合Word技术方案全文生成。长上下文窗口支持大型方案内容。</div>
              <div className="llm-row">
                <input className="llm-key" type="password" defaultValue="sk-ant-xxxxxxxx" placeholder="Anthropic API Key" />
                <button className="btn btn-ghost btn-xs">测试</button>
                <Toggle defaultOn={true} />
              </div>
              <div className="fc g8 mt8">
                <select className="fi" style={{fontSize:'11px',padding:'3px 7px',width:'auto'}}>
                  <option>claude-sonnet-4-6</option>
                  <option>claude-opus-4-6</option>
                  <option>claude-haiku-4-5</option>
                </select>
                <span className="tag tag-g txs">● 已连通</span>
              </div>
            </div>
          </div>

          {/* OpenAI */}
          <div className="llm">
            <div className="llm-logo" style={{background:'linear-gradient(135deg,#10a37f,#0d7a5e)'}}>🟢</div>
            <div className="llm-info">
              <div className="llm-name">OpenAI GPT-4o</div>
              <div className="llm-desc">通用生成模型，用于架构设计、内容扩写等任务。确保无敏感客户信息传入。</div>
              <div className="llm-row">
                <input className="llm-key" type="password" defaultValue="sk-proj-xxxxxxxx" placeholder="API Key" />
                <button className="btn btn-ghost btn-xs">测试</button>
                <Toggle defaultOn={false} />
              </div>
              <div className="fc g8 mt8">
                <select className="fi" style={{fontSize:'11px',padding:'3px 7px',width:'auto'}}>
                  <option>gpt-4o</option>
                  <option>gpt-4o-mini</option>
                </select>
                <span className="tag tag-gray txs">● 未启用</span>
              </div>
            </div>
          </div>

          {/* Private LLM */}
          <div className="llm" style={{borderColor:'rgba(0,212,170,.25)'}}>
            <div className="llm-logo" style={{background:'linear-gradient(135deg,#1a56db,#0e3a8c)'}}>🔵</div>
            <div className="llm-info">
              <div className="llm-name">私有化 Qwen2.5-72B</div>
              <div className="llm-desc">内网私有化部署，处理含客户名称等敏感信息，数据不出域。</div>
              <div className="llm-row">
                <input className="llm-key" defaultValue="http://internal-llm:8000/v1" placeholder="内网地址" />
                <button className="btn btn-ghost btn-xs">测试</button>
                <Toggle defaultOn={true} />
              </div>
              <div className="fc g8 mt8">
                <span className="tag tag-o txs">敏感数据专用</span>
                <span className="tag tag-g txs">● 已连通</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="sh"><div className="st">⚙️ 系统参数</div></div>
          <div className="panel" style={{marginBottom:'14px'}}>
            <div className="pb-">
              <div className="cfg-row">
                <div><div className="cfg-lbl">敏感数据路由</div><div className="cfg-desc">含客户名称的请求自动路由至私有化模型</div></div>
                <Toggle defaultOn={true} />
              </div>
              <div className="cfg-row">
                <div><div className="cfg-lbl">RAG Top-K</div><div className="cfg-desc">每次检索返回文档块数量</div></div>
                <select className="fi" style={{width:'70px',fontSize:'11.5px',padding:'4px 7px'}}>
                  <option>3</option>
                  <option selected>5</option>
                  <option>8</option>
                </select>
              </div>
              <div className="cfg-row">
                <div><div className="cfg-lbl">Agent超时时间</div></div>
                <select className="fi" style={{width:'90px',fontSize:'11.5px',padding:'4px 7px'}}>
                  <option selected>5分钟</option>
                  <option>10分钟</option>
                </select>
              </div>
              <div className="cfg-row">
                <div><div className="cfg-lbl">操作审计日志</div></div>
                <Toggle defaultOn={true} />
              </div>
              <div className="cfg-row">
                <div><div className="cfg-lbl">成功案例自动回流</div><div className="cfg-desc">赢单后方案自动入库知识库</div></div>
                <Toggle defaultOn={true} />
              </div>
              <div className="cfg-row">
                <div><div className="cfg-lbl">并发生成上限</div><div className="cfg-desc">同时允许的方案生成任务数</div></div>
                <select className="fi" style={{width:'70px',fontSize:'11.5px',padding:'4px 7px'}}>
                  <option>3</option>
                  <option selected>5</option>
                  <option>10</option>
                </select>
              </div>
            </div>
          </div>

          <div className="sh"><div className="st">🚀 GitHub / CI/CD 配置</div></div>
          <div className="panel">
            <div className="pb-">
              <div className="fg mt4"><div className="fl">GitHub 仓库地址</div><input className="fi" defaultValue="https://github.com/yourorg/cloudpresale-ai" /></div>
              <div className="fg mt8"><div className="fl">镜像仓库地址</div><input className="fi" defaultValue="registry.yourcompany.com/presale" /></div>
              <div className="fg mt8"><div className="fl">K8s 集群 API Server</div><input className="fi" defaultValue="https://k8s.internal:6443" /></div>
              <div className="fg mt8"><div className="fl">部署命名空间</div><input className="fi" defaultValue="presale-prod" /></div>
              <div className="fc g8 mt12 ml-auto" style={{justifyContent:'flex-end'}}>
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
