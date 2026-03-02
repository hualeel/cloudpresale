import { useState, useEffect } from 'react'
import { teamApi } from '../api'
import { useStore } from '../store/useStore'
import type { TeamMember } from '../api/types'

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员', senior_sa: '高级SA', sa: 'SA', junior_sa: '初级SA',
}

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'senior_sa', label: '高级SA' },
  { value: 'sa', label: 'SA' },
  { value: 'junior_sa', label: '初级SA' },
]

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
  const { user: currentUser } = useStore()
  const isAdmin = currentUser?.role === 'admin'

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null)
  const [editForm, setEditForm] = useState({ name: '', role: '', is_active: true, password: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = () => {
    setLoading(true)
    teamApi.list()
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const totalSolutions = members.reduce((s, m) => s + m.solutions_this_month, 0)

  function openEdit(m: TeamMember) {
    setEditTarget(m)
    setEditForm({ name: m.user.name, role: m.user.role, is_active: m.user.is_active, password: '' })
    setEditError('')
  }

  async function handleEdit() {
    if (!editTarget) return
    setEditLoading(true)
    setEditError('')
    try {
      const payload: Record<string, unknown> = { name: editForm.name, role: editForm.role, is_active: editForm.is_active }
      if (editForm.password) payload.password = editForm.password
      await teamApi.update(String(editTarget.user.id), payload)
      setEditTarget(null)
      load()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await teamApi.delete(String(deleteTarget.user.id))
      setDeleteTarget(null)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '删除失败')
    } finally {
      setDeleteLoading(false)
    }
  }

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
                <tr>
                  <th>姓名</th>
                  <th>角色</th>
                  <th>本月方案</th>
                  <th>负责商机</th>
                  <th>加入时间</th>
                  <th>状态</th>
                  {isAdmin && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={String(m.user.id)}>
                    <td>
                      <div className="fc g8">
                        <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px', background: GRADIENTS[i % GRADIENTS.length] }}>
                          {m.user.name.charAt(0)}
                        </div>
                        {m.user.name}
                      </div>
                    </td>
                    <td>
                      <span className="tag tag-b" style={{ fontSize: '10px' }}>
                        {ROLE_LABEL[m.user.role] ?? m.user.role}
                      </span>
                    </td>
                    <td className="fw6">{m.solutions_this_month}</td>
                    <td className="tmu txs">{m.active_opportunities}个</td>
                    <td className="tmu txs">{relTime(m.user.created_at)}</td>
                    <td>
                      <span className={`tag ${m.user.is_active ? 'tag-g' : 'tag-r'}`} style={{ fontSize: '10px' }}>
                        {m.user.is_active ? '活跃' : '已禁用'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="fc g8">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}>编辑</button>
                          {String(m.user.id) !== currentUser?.id && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--acc4)' }}
                              onClick={() => setDeleteTarget(m)}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {members.length > 0 && (
            <div className="two">
              {members.slice(0, 2).map((m, i) => (
                <div key={String(m.user.id)} className="panel">
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

      {/* 编辑弹窗 */}
      {editTarget && (
        <div className="mo open" onClick={(e) => { if (e.target === e.currentTarget) setEditTarget(null) }}>
          <div className="modal">
            <div className="mh">
              <div className="mt_">编辑成员</div>
              <button className="mc-" onClick={() => setEditTarget(null)}>×</button>
            </div>
            <div className="mb_">
              {editError && <div className="alert a-err">{editError}</div>}
              <div className="fgrid">
                <div className="fg full">
                  <div className="fl">姓名</div>
                  <input
                    className="fi"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="fg full">
                  <div className="fl">角色</div>
                  <select
                    className="fs"
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  >
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="fg full">
                  <div className="fl">新密码 <span className="tmu txs">（留空则不修改）</span></div>
                  <input
                    className="fi"
                    type="password"
                    placeholder="至少 6 位"
                    value={editForm.password}
                    onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div className="fg full">
                  <div className="fc g8" style={{ marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      id="is_active_chk"
                      checked={editForm.is_active}
                      onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                    />
                    <label htmlFor="is_active_chk" className="fl" style={{ cursor: 'pointer' }}>账号启用</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-ghost" onClick={() => setEditTarget(null)} disabled={editLoading}>取消</button>
              <button className="btn btn-primary" onClick={handleEdit} disabled={editLoading}>
                {editLoading ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="mo open" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div className="modal" style={{ width: '380px' }}>
            <div className="mh">
              <div className="mt_">确认删除</div>
              <button className="mc-" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="mb_">
              <p style={{ margin: 0, color: 'var(--text2)', lineHeight: 1.6 }}>
                确定要删除成员 <strong style={{ color: 'var(--text)' }}>{deleteTarget.user.name}</strong> 吗？
                <br />此操作不可撤销，相关数据将一并删除。
              </p>
            </div>
            <div className="mf">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>取消</button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--acc4)', borderColor: 'var(--acc4)' }}
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
