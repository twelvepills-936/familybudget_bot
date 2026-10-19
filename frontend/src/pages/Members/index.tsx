import { useMemo } from 'react'
import { Expense, Category, CATEGORIES, CAT_ICONS } from '../../api/expenses'

interface Props {
  expenses: Expense[]
  users: number[]
  onAddExpenseForUser: (userId: number) => void
  onToast: (msg: string, type?: 'success' | 'error') => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)

export function Members({ expenses, users, onAddExpenseForUser, onToast }: Props) {
  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])

  // Aggregate stats per user
  const userStats = useMemo(() => {
    // Collect all unique user IDs from both users list and expenses
    const allUserIds = Array.from(new Set([...users, ...expenses.map(e => e.user_id)]))

    return allUserIds.map(uid => {
      const userExpenses = expenses.filter(e => e.user_id === uid)
      const userTotal = userExpenses.reduce((s, e) => s + e.amount, 0)
      const count = userExpenses.length
      const avg = count > 0 ? userTotal / count : 0
      const pct = total > 0 ? (userTotal / total) * 100 : 0

      // Find favorite category
      const catCounts: Record<string, number> = {}
      userExpenses.forEach(e => {
        catCounts[e.category] = (catCounts[e.category] || 0) + e.amount
      })
      const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]

      // Recent 3 expenses
      const recent = [...userExpenses]
        .sort((a, b) => new Date(b.spent_at).getTime() - new Date(a.spent_at).getTime())
        .slice(0, 3)

      return {
        id: uid,
        total: userTotal,
        count,
        avg,
        pct,
        topCat: topCat ? (topCat[0] as Category) : null,
        topCatAmount: topCat ? topCat[1] : 0,
        recent,
      }
    }).sort((a, b) => b.total - a.total)
  }, [expenses, users, total])

  const copyBotLink = () => {
    navigator.clipboard.writeText('https://t.me/testfbbotbotbot')
    onToast('Ссылка на бота скопирована в буфер!')
  }

  return (
    <div className="members-view">
      {/* Overview KPI row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon" style={{ background: 'rgba(16,217,139,0.15)' }}>👥</div>
            <div className="stat-card-label">Всего участников</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--green)' }}>
            {userStats.length}
          </div>
          <div className="stat-card-sub">в общем семейном бюджете</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>💰</div>
            <div className="stat-card-label">Общие расходы</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--accent-bright)' }}>
            {fmt(total)}
          </div>
          <div className="stat-card-sub">все транзакции семьи</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon" style={{ background: 'rgba(96,165,250,0.15)' }}>⚖️</div>
            <div className="stat-card-label">В среднем на участника</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--blue)' }}>
            {userStats.length > 0 ? fmt(total / userStats.length) : '0 ₽'}
          </div>
          <div className="stat-card-sub">равномерное распределение</div>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div className="section-title">Карточки участников</div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 20,
        marginBottom: 28,
      }}>
        {userStats.map((u, idx) => (
          <div key={u.id} className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, hsl(${(idx * 65 + 240) % 360}, 75%, 60%), hsl(${(idx * 65 + 280) % 360}, 80%, 45%))`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                  👤
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                    Участник #{idx + 1}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Telegram ID: <span style={{ fontFamily: 'monospace' }}>{u.id}</span>
                  </div>
                </div>
              </div>
              <span className="user-chip" style={{ background: 'rgba(139,92,246,0.15)', borderColor: 'var(--accent)' }}>
                {u.pct.toFixed(0)}% бюджета
              </span>
            </div>

            <div className="panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Spending Summary */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--r-sm)',
                padding: '12px 16px',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Всего потрачено</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-bright)' }}>
                    {fmt(u.total)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Средний чек</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {fmt(u.avg)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Операций</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {u.count} трат
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Любимая статья</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {u.topCat ? `${CAT_ICONS[u.topCat]} ${CATEGORIES[u.topCat]}` : '—'}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Доля в расходах</span>
                  <span>{u.pct.toFixed(1)}%</span>
                </div>
                <div className="stat-card-bar">
                  <div
                    className="stat-card-bar-fill"
                    style={{
                      width: `${u.pct}%`,
                      background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                    }}
                  />
                </div>
              </div>

              {/* Recent purchases snippet */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Последние траты:
                </div>
                {u.recent.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Нет трат</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {u.recent.map(e => (
                      <div key={e.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        padding: '4px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{CAT_ICONS[e.category] || '📦'}</span>
                          <span style={{ color: 'var(--text-secondary)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.comment || CATEGORIES[e.category] || e.category}
                          </span>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {fmt(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add expense button for user */}
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                onClick={() => onAddExpenseForUser(u.id)}
              >
                ＋ Добавить трату для ID {u.id}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Guide how to connect family members */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(99,102,241,0.03) 100%)' }}>
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-icon">💡</span>
            Как подключить нового члена семьи?
          </div>
          <button className="btn btn-primary btn-sm" onClick={copyBotLink}>
            📋 Скопировать ссылку на бота
          </button>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              padding: 16,
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>1️⃣ Отправьте бота</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Отправьте ссылку на бота <strong style={{ color: 'var(--accent-bright)' }}>@testfbbotbotbot</strong> вашему супругу(-е), детям или родителям.
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              padding: 16,
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>2️⃣ Любое сообщение</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Участник нажимает Start или пишет обычным языком: например <code style={{ color: 'var(--green)' }}>Кофе 350</code> или <code style={{ color: 'var(--green)' }}>Аптека 1200</code>.
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              padding: 16,
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>3️⃣ Автоматический учёт</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                ИИ Gemini мгновенно определит категорию и сумму, запишет в общую базу, и профиль появится на этой странице.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
