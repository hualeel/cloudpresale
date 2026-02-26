import { useStore } from '../../store/useStore'

const jobs = [
  { name: 'checkout', status: 'tag-g', statusText: '✓', time: '8s' },
  { name: 'lint-and-test', status: 'tag-g', statusText: '✓', time: '45s' },
  { name: 'docker-build', status: 'tag-g', statusText: '✓', time: '1m52s' },
  { name: 'trivy-scan', status: 'tag-g', statusText: '✓', time: '38s' },
  { name: 'push-image', status: 'tag-g', statusText: '✓', time: '24s' },
  { name: 'k8s-deploy', status: 'tag-g', statusText: '✓', time: '45s' },
  { name: 'health-check', status: 'tag-g', statusText: '✓', time: '20s' },
]

export function PipelineDetailModal() {
  const { openModal, setModal } = useStore()
  if (openModal !== 'pipelineDetail') return null

  return (
    <div className="mo open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
      <div className="modal wide">
        <div className="mh">
          <div className="mt_">构建 #127 详情</div>
          <button className="mc-" onClick={() => setModal(null)}>×</button>
        </div>
        <div className="mb_">
          <div className="alert a-ok">✅ 构建成功 · main → presale-prod · push by 张志远 · 4m32s</div>
          <div className="three">
            <div className="fg"><div className="fl">提交 SHA</div><span className="code txs tacc">a4b3c2d</span></div>
            <div className="fg"><div className="fl">提交信息</div><span className="ts">feat: 补充信创LLM路由逻辑</span></div>
            <div className="fg"><div className="fl">镜像 Tag</div><span className="code txs">registry.xx.com/presale:a4b3c2d</span></div>
          </div>
          <div className="div"></div>
          <div className="fw6 ts" style={{marginBottom:'10px'}}>各 Job 耗时</div>
          <table className="dt">
            <thead><tr><th>Job</th><th>状态</th><th>耗时</th><th>日志</th></tr></thead>
            <tbody>
              {jobs.map((job, i) => (
                <tr key={i}>
                  <td>{job.name}</td>
                  <td><span className={`tag ${job.status}`}>{job.statusText}</span></td>
                  <td className="tmu txs">{job.time}</td>
                  <td><button className="btn btn-ghost btn-xs">查看</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mf">
          <button className="btn btn-ghost" onClick={() => setModal(null)}>关闭</button>
        </div>
      </div>
    </div>
  )
}
