import { useState, useEffect } from 'react'
import { teamApi } from '../api'
import type { TeamMember, UserRole } from '../api/types'

const ROLE_TAG: Record<UserRole, string> = {
  admin: 'tag-r', senior_sa: 'tag-b', sa: 'tag-p', junior_sa: 'tag-g',
}
const ROLE_LABEL: Record<UserRole, string> = {
  admin: '管理员', senior_sa: '高级SA', sa: 'SA', junior_sa: '初级SA',
}

const GRADIENTS = [
  'linear-gradient(135deg,var(--acc1),var(--acc2))',
  'linear-gradient(135deg,var(--acc2),var(--acc4))',
  'linear-gradient(135deg,var(--acc3),#00a082)',
  'linear-gradient(135deg,var(--acc5),#cc9900)',
]

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}天前` : new Date(iso).toLocaleDateString('zh-CN')
}

export function Team() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    teamApi.list()
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalSolutions = members.reduce((s, m) => s + m.solutions_this_month, 0)

  return (
    <div>
      <div className="sh">
        <div>
          <div className="st">团队成员</div>
          <div className="ss2">
            {loading ? '加载中…' : `${members.length} 名售前架构师 · 本月共生成 ${totalSolutions} 份方案`}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="tmu txs" style={{ padding: '40px', textAlign: 'center' }}>加载中…</div>
      ) : (
        <>
          <div className="panel" style={{ marginBottom: '18px' }}>
            <table className="dt">
              <thead>
                <tr><th>姓名</th><th>本月方案</th><th>负责商机</th><th>加入时间</th></tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.user.id}>
                    <td>
                      <div className="fc g8">
                        <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px', background: GRADIENTS[i % GRADIENTS.length] }}>
                          {m.user.name.charAt(0)}
                        </div>
                        {m.user.name}
                      </div>
                    </td>
                    <td className="fw6">{m.solutions_this_month}</td>
                    <td className="tmu txs">{m.active_opportunities}个</td>
                    <td className="tmu txs">{relTime(m.user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top 2 member detail cards */}
          {members.length > 0 && (
            <div className="two">
              {members.slice(0, 2).map((m, i) => (
                <div key={m.user.id} className="panel">
                  <div className="ph">
                    <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px', background: GRADIENTS[i % GRADIENTS.length] }}>
                      {m.user.name.charAt(0)}
                    </div>
                    <span className="pt">{m.user.name} · 工作概览</span>
                  </div>
                  <div className="pb-">
                    <div className="three">
                      <div style={{ textAlign: 'center' }}>
                        <div className="sv" style={{ fontSize: '22px' }}>{m.solutions_this_month}</div>
                        <div className="sl">本月方案</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div className="sv" style={{ fontSize: '22px' }}>{m.active_opportunities}</div>
                        <div className="sl">负责商机</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div className="sv" style={{ fontSize: '22px', color: 'var(--acc3)' }}>
                          {m.user.is_active ? '活跃' : '离线'}
                        </div>
                        <div className="sl">状态</div>
                      </div>
                    </div>
                    <div className="div"></div>
                    <div className="fl" style={{ marginBottom: '6px' }}>邮箱</div>
                    <div className="txs tmu">{m.user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
