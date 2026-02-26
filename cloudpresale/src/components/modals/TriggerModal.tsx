import { useStore } from '../../store/useStore'

export function TriggerModal() {
  const { openModal, setModal } = useStore()
  if (openModal !== 'trigger') return null

  return (
    <div className="mo open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
      <div className="modal">
        <div className="mh">
          <div className="mt_">手动触发 CI/CD</div>
          <button className="mc-" onClick={() => setModal(null)}>×</button>
        </div>
        <div className="mb_">
          <div className="fgrid">
            <div className="fg full">
              <div className="fl">目标分支</div>
              <select className="fs">
                <option selected>main</option>
                <option>develop</option>
                <option>feat/llm-router</option>
              </select>
            </div>
            <div className="fg full">
              <div className="fl">部署环境</div>
              <select className="fs">
                <option selected>生产 (presale-prod)</option>
                <option>测试 (presale-test)</option>
              </select>
            </div>
            <div className="fg full">
              <div className="fl">触发原因（可选）</div>
              <input className="fi" placeholder="例如：紧急修复LLM路由Bug" />
            </div>
          </div>
          <div className="alert a-warn mt12" style={{marginBottom:0}}>⚠️ 手动触发将跳过PR审核流程，直接部署到选定环境，请确认。</div>
        </div>
        <div className="mf">
          <button className="btn btn-ghost" onClick={() => setModal(null)}>取消</button>
          <button className="btn btn-primary" onClick={() => setModal(null)}>确认触发流水线</button>
        </div>
      </div>
    </div>
  )
}
