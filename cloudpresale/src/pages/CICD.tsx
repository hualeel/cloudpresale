import { useStore } from '../store/useStore'

const pipelineSteps = [
  { icon: '📦', label: '代码检出', time: '8s', cls: 'done' },
  { icon: '🔍', label: 'Lint + 单测', time: '45s', cls: 'done' },
  { icon: '🐳', label: 'Docker构建', time: '1m 52s', cls: 'done' },
  { icon: '🔒', label: '镜像安全扫描', time: '38s', cls: 'done' },
  { icon: '📤', label: '推送镜像仓库', time: '24s', cls: 'done' },
  { icon: '☸️', label: 'K8s滚动更新', time: '45s', cls: 'done' },
  { icon: '✅', label: '健康检查', time: '20s', cls: 'done' },
]

export function CICD() {
  const { setModal } = useStore()

  return (
    <div>
      <div className="sh">
        <div>
          <div className="st">CI/CD 流水线</div>
          <div className="ss2">GitHub Actions → K8s 自动化部署</div>
        </div>
        <div className="fc g8">
          <span className="tag tag-o txs">演示数据</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal('trigger')}>⚡ 手动触发</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('pipelineDetail')}>📋 查看配置</button>
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="panel" style={{marginBottom:'18px'}}>
        <div className="ph">
          <span>🔄</span>
          <span className="pt">最新构建 #127 · main → prod · 推送触发</span>
          <span className="tag tag-g ml-auto">✓ 全部通过</span>
        </div>
        <div className="pb-">
          <div className="pipeline-vis">
            {pipelineSteps.map((step, i) => (
              <>
                <div key={`step-${i}`} className="pv-step">
                  <div className={`pv-circle ${step.cls}`}>{step.icon}</div>
                  <div className="pv-label">{step.label}</div>
                  <div className="pv-time">{step.time}</div>
                </div>
                {i < pipelineSteps.length - 1 && <div key={`line-${i}`} className="pv-line done"></div>}
              </>
            ))}
          </div>
          <div className="alert a-ok" style={{marginBottom:0}}>✅ #127 构建成功 · 总耗时 4m 32s · 已部署到 presale-prod 命名空间 · Pods: 3/3 Running</div>
        </div>
      </div>

      {/* Build History + Config */}
      <div className="two">
        <div>
          <div className="sh"><div className="st">构建历史</div></div>
          <div className="panel">
            <table className="dt">
              <thead><tr><th>#</th><th>分支</th><th>触发</th><th>状态</th><th>时间</th><th>耗时</th></tr></thead>
              <tbody>
                <tr onClick={() => setModal('pipelineDetail')} style={{cursor:'pointer'}}>
                  <td><span className="code tacc">#127</span></td><td><span className="code txs">main</span></td><td className="tmu txs">push</td>
                  <td><span className="tag tag-g">✓ 成功</span></td><td className="tmu txs">今天 14:30</td><td className="tmu txs">4m32s</td>
                </tr>
                <tr><td><span className="code tacc">#126</span></td><td><span className="code txs">feat/llm-router</span></td><td className="tmu txs">PR合并</td><td><span className="tag tag-g">✓ 成功</span></td><td className="tmu txs">今天 11:15</td><td className="tmu txs">3m18s</td></tr>
                <tr><td><span className="code tacc">#125</span></td><td><span className="code txs">main</span></td><td className="tmu txs">push</td><td><span className="tag tag-o">⟳ 运行中</span></td><td className="tmu txs">今天 09:42</td><td className="tmu txs">1m12s…</td></tr>
                <tr><td><span className="code">#124</span></td><td><span className="code txs">fix/db-schema</span></td><td className="tmu txs">push</td><td><span className="tag tag-r">✗ 失败</span></td><td className="tmu txs">昨天 17:20</td><td className="tmu txs">2m05s</td></tr>
                <tr><td><span className="code">#123</span></td><td><span className="code txs">main</span></td><td className="tmu txs">定时</td><td><span className="tag tag-g">✓ 成功</span></td><td className="tmu txs">昨天 02:00</td><td className="tmu txs">4m10s</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="sh"><div className="st">GitHub Actions 配置预览</div></div>
          <div className="panel">
            <div className="ph"><span>📝</span><span className="pt">.github/workflows/deploy.yml</span></div>
            <div className="codeblock">
              <pre>
                <span className="cb-comment"># 触发条件：push 到 main 或 PR{'\n'}</span>
                <span className="cb-key">on:{'\n'}</span>
                {'  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\n'}
                <span className="cb-key">jobs:{'\n'}</span>
                {'  '}<span className="cb-str">build-and-deploy:{'\n'}</span>
                {'    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - '}
                <span className="cb-key">name:</span> <span className="cb-str">Run Tests{'\n'}</span>
                {'        run: |\n          pip install -r requirements.txt\n          pytest tests/ -v\n\n      - '}
                <span className="cb-key">name:</span> <span className="cb-str">Build Docker Image{'\n'}</span>
                {'        run: |\n          docker build -t $IMAGE_NAME:$SHA .\n\n      - '}
                <span className="cb-key">name:</span> <span className="cb-str">Deploy to K8s{'\n'}</span>
                {'        run: |\n          kubectl set image deploy/api \\\n            api=$IMAGE_NAME:$SHA -n presale-prod'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
