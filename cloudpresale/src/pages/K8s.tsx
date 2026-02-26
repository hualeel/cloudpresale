const deployments = [
  { name: 'presale-api', image: 'sha-a4b3c2d', replicas: '3/3', status: 'Running', updated: '今天 14:35' },
  { name: 'presale-worker', image: 'sha-a4b3c2d', replicas: '2/2', status: 'Running', updated: '今天 14:35' },
  { name: 'presale-frontend', image: 'sha-a4b3c2d', replicas: '2/2', status: 'Running', updated: '今天 14:35' },
  { name: 'chroma', image: '0.4.22', replicas: '1/1', status: 'Running', updated: '3天前' },
  { name: 'minio', image: 'latest', replicas: '1/1', status: 'Running', updated: '3天前' },
  { name: 'postgres', image: '16.2', replicas: '1/1', status: 'Running', updated: '1周前' },
]

export function K8s() {
  return (
    <div>
      <div className="sh">
        <div>
          <div className="st">K8s 集群状态</div>
          <div className="ss2">presale-prod 命名空间</div>
        </div>
        <button className="btn btn-ghost btn-sm">🔄 刷新</button>
      </div>

      <div className="three" style={{marginBottom:'18px'}}>
        <div className="scard g"><div className="sl">Pods 运行中</div><div className="sv tg">12/12</div><div className="ss">全部健康</div></div>
        <div className="scard b"><div className="sl">Services</div><div className="sv">5</div><div className="ss">LoadBalancer×1, ClusterIP×4</div></div>
        <div className="scard p"><div className="sl">CPU 使用率</div><div className="sv">34%</div><div className="ss">内存: 58%</div></div>
      </div>

      <div className="panel">
        <div className="ph"><span>☸️</span><span className="pt">Deployments · presale-prod</span></div>
        <table className="dt">
          <thead>
            <tr><th>名称</th><th>镜像版本</th><th>副本</th><th>状态</th><th>最后更新</th><th>操作</th></tr>
          </thead>
          <tbody>
            {deployments.map((d, i) => (
              <tr key={i}>
                <td><span className="code fw6">{d.name}</span></td>
                <td><span className="code txs">{d.image}</span></td>
                <td><span className="tg">{d.replicas}</span></td>
                <td><span className="tag tag-g">{d.status}</span></td>
                <td className="tmu txs">{d.updated}</td>
                <td><button className="btn btn-ghost btn-xs">重启</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt16 panel">
        <div className="ph"><span>📊</span><span className="pt">资源使用趋势（最近24小时）</span></div>
        <div className="pb-">
          <div className="three">
            <div>
              <div className="fl" style={{marginBottom:'8px'}}>CPU 使用率</div>
              <div style={{height:'60px',background:'var(--bg3)',borderRadius:'var(--r2)',display:'flex',alignItems:'flex-end',padding:'8px',gap:'3px'}}>
                {[20,34,28,45,38,52,34,29,41,36,34,40].map((v, i) => (
                  <div key={i} style={{flex:1,height:`${v}%`,background:'var(--acc1)',borderRadius:'2px',opacity:.7}}></div>
                ))}
              </div>
              <div className="txs tmu mt4">当前: 34% · 峰值: 52%</div>
            </div>
            <div>
              <div className="fl" style={{marginBottom:'8px'}}>内存使用率</div>
              <div style={{height:'60px',background:'var(--bg3)',borderRadius:'var(--r2)',display:'flex',alignItems:'flex-end',padding:'8px',gap:'3px'}}>
                {[50,55,58,60,57,62,58,56,59,58,60,58].map((v, i) => (
                  <div key={i} style={{flex:1,height:`${v}%`,background:'var(--acc2)',borderRadius:'2px',opacity:.7}}></div>
                ))}
              </div>
              <div className="txs tmu mt4">当前: 58% · 峰值: 62%</div>
            </div>
            <div>
              <div className="fl" style={{marginBottom:'8px'}}>网络吞吐 (MB/s)</div>
              <div style={{height:'60px',background:'var(--bg3)',borderRadius:'var(--r2)',display:'flex',alignItems:'flex-end',padding:'8px',gap:'3px'}}>
                {[15,22,18,35,28,42,25,20,31,28,22,30].map((v, i) => (
                  <div key={i} style={{flex:1,height:`${v}%`,background:'var(--acc3)',borderRadius:'2px',opacity:.7}}></div>
                ))}
              </div>
              <div className="txs tmu mt4">当前: 30MB/s · 峰值: 42MB/s</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
