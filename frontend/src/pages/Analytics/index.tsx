import { useState, useMemo } from 'react'
import { Expense, Category, CATEGORIES, CAT_ICONS, CAT_COLORS } from '../../api/expenses'

interface Props {
  expenses: Expense[]
}

type Period = 'all' | 'month' | '30days' | '7days'

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)

const fmtShort = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M ₽`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k ₽`
  return `${n} ₽`
}

export function Analytics({ expenses }: Props) {
  const [period, setPeriod] = useState<Period>('all')

  // Filter expenses by period
  const filtered = useMemo(() => {
    if (period === 'all') return expenses

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    if (period === '7days') {
      const minDate = today - 7 * 86400000
      return expenses.filter(e => new Date(e.spent_at).getTime() >= minDate)
    }

    if (period === '30days') {
      const minDate = today - 30 * 86400000
      return expenses.filter(e => new Date(e.spent_at).getTime() >= minDate)
    }

    if (period === 'month') {
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      return expenses.filter(e => {
        const d = new Date(e.spent_at)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
    }

    return expenses
  }, [expenses, period])

  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered])

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {}
    filtered.forEach(e => {
      if (!map[e.category]) map[e.category] = { total: 0, count: 0 }
      map[e.category].total += e.amount
      map[e.category].count += 1
    })

    return Object.entries(map)
      .map(([cat, data]) => ({
        category: cat as Category,
        total: data.total,
        count: data.count,
        pct: total > 0 ? (data.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [filtered, total])

  // Daily timeline breakdown (sorted by date)
  const dailyStats = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(e => {
      const day = e.spent_at.slice(0, 10)
      map[day] = (map[day] || 0) + e.amount
    })

    const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
    const maxDay = Math.max(...entries.map(e => e[1]), 1)

    return { entries, maxDay }
  }, [filtered])

  // Top biggest single expenses
  const topExpenses = useMemo(() => {
    return [...filtered].sort((a, b) => b.amount - a.amount).slice(0, 5)
  }, [filtered])

  // Member stats
  const memberStats = useMemo(() => {
    const map: Record<number, { total: number; count: number }> = {}
    filtered.forEach(e => {
      if (!map[e.user_id]) map[e.user_id] = { total: 0, count: 0 }
      map[e.user_id].total += e.amount
      map[e.user_id].count += 1
    })

    return Object.entries(map)
      .map(([uid, data]) => ({
        user_id: Number(uid),
        total: data.total,
        count: data.count,
        pct: total > 0 ? (data.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [filtered, total])

  // Distinct active days
  const activeDays = new Set(filtered.map(e => e.spent_at.slice(0, 10))).size || 1
  const dailyAverage = total / activeDays

  const maxExpense = topExpenses[0]?.amount || 0

  return (
    <div className="analytics-view">
      {/* Time filters */}
      <div className="analytics-filters" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${period === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setPeriod('all')}
        >
          За всё время
        </button>
        <button
          className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setPeriod('month')}
        >
          Этот месяц
        </button>
        <button
          className={`btn ${period === '30days' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setPeriod('30days')}
        >
          Последние 30 дней
        </button>
        <button
          className={`btn ${period === '7days' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setPeriod('7days')}
        >
          Последние 7 дней
        </button>
      </div>

      {/* KPI row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>💰</div>
            <div className="stat-card-label">Сумма за период</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--accent-bright)' }}>
            {fmt(total)}
          </div>
          <div className="stat-card-sub">{filtered.length} операций в отчёте</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon" style={{ background: 'rgba(96,165,250,0.15)' }}>📅</div>
            <div className="stat-card-label">Среднесуточно</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--blue)' }}>
            {fmt(dailyAverage)}
          </div>
          <div className="stat-card-sub">активных дней: {activeDays}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>⚡</div>
            <div className="stat-card-label">Макс. чек</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--red)' }}>
            {fmt(maxExpense)}
          </div>
          <div className="stat-card-sub">
            {topExpenses[0]?.comment || topExpenses[0]?.category ? (CATEGORIES[topExpenses[0]?.category] || '—') : '—'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon" style={{ background: 'rgba(16,217,139,0.15)' }}>🏆</div>
            <div className="stat-card-label">Главная статья</div>
          </div>
          <div className="stat-card-value" style={{ color: CAT_COLORS[categoryStats[0]?.category] || 'var(--green)' }}>
            {categoryStats[0] ? `${categoryStats[0].pct.toFixed(0)}%` : '—'}
          </div>
          <div className="stat-card-sub">
            {categoryStats[0] ? `${CAT_ICONS[categoryStats[0].category]} ${CATEGORIES[categoryStats[0].category]}` : '—'}
          </div>
        </div>
      </div>

      {/* Grid: Daily Dynamics & Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Category Breakdown Panel */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">📊</span>
              Распределение по категориям
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {categoryStats.length} категорий
            </span>
          </div>
          <div className="panel-body">
            {categoryStats.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-state-icon">📂</div>
                <p>Нет расходов за выбранный период</p>
              </div>
            ) : (
              <div className="cat-list">
                {categoryStats.map(item => (
                  <div key={item.category} className="cat-row">
                    <div className="cat-row-top">
                      <div className="cat-label">
                        <span className="cat-dot" style={{ background: CAT_COLORS[item.category] || 'var(--accent)' }} />
                        <span>{CAT_ICONS[item.category] || '📦'}</span>
                        <span>{CATEGORIES[item.category] || item.category}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ({item.count} оп.)
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {item.pct.toFixed(1)}%
                        </span>
                        <span className="cat-amount">{fmt(item.total)}</span>
                      </div>
                    </div>
                    <div className="cat-bar">
                      <div
                        className="cat-bar-fill"
                        style={{
                          width: `${item.pct}%`,
                          background: CAT_COLORS[item.category] || 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily Spending Dynamics */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">📈</span>
              Динамика трат по дням
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {dailyStats.entries.length} дней активности
            </span>
          </div>
          <div className="panel-body">
            {dailyStats.entries.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-state-icon">📉</div>
                <p>Нет данных о тратах за период</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 8,
                  height: 190,
                  padding: '16px 8px 8px 8px',
                  background: 'rgba(255,255,255,0.015)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border)',
                  overflowX: 'auto',
                }}>
                  {dailyStats.entries.map(([day, amount]) => {
                    const heightPct = Math.max((amount / dailyStats.maxDay) * 100, 8)
                    const shortDay = day.slice(5) // MM-DD
                    return (
                      <div
                        key={day}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flex: '1 0 32px',
                          height: '100%',
                          justifyContent: 'flex-end',
                          position: 'relative',
                        }}
                        title={`${day}: ${fmt(amount)}`}
                      >
                        <span style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)',
                          marginBottom: 4,
                          whiteSpace: 'nowrap',
                          transform: 'scale(0.9)',
                        }}>
                          {fmtShort(amount)}
                        </span>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: 24,
                            height: `${heightPct}%`,
                            background: 'linear-gradient(180deg, var(--accent-bright) 0%, var(--accent) 100%)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease',
                          }}
                        />
                        <span style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-secondary)',
                          marginTop: 6,
                          whiteSpace: 'nowrap',
                        }}>
                          {shortDay}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Family members comparison & Top single purchases */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        {/* Spending by Member */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">👥</span>
              Доли участников семьи
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {memberStats.length} участников
            </span>
          </div>
          <div className="panel-body">
            {memberStats.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <p>Нет данных по участникам</p>
              </div>
            ) : (
              <div className="cat-list">
                {memberStats.map(m => (
                  <div key={m.user_id} className="cat-row">
                    <div className="cat-row-top">
                      <div className="cat-label">
                        <span className="user-chip">👤 ID {m.user_id}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {m.count} покупок
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-bright)' }}>
                          {m.pct.toFixed(1)}%
                        </span>
                        <span className="cat-amount">{fmt(m.total)}</span>
                      </div>
                    </div>
                    <div className="cat-bar">
                      <div
                        className="cat-bar-fill"
                        style={{
                          width: `${m.pct}%`,
                          background: 'linear-gradient(90deg, var(--accent), var(--blue))',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top 5 biggest purchases */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">💎</span>
              Крупнейшие траты
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Топ {topExpenses.length}
            </span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {topExpenses.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <p>Список пуст</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Сумма</th>
                    <th>Категория</th>
                    <th>Участник</th>
                    <th>Дата</th>
                    <th>Заметка</th>
                  </tr>
                </thead>
                <tbody>
                  {topExpenses.map(e => (
                    <tr key={e.id}>
                      <td><span className="amount">{fmt(e.amount)}</span></td>
                      <td>
                        <span className={`badge badge-${e.category}`}>
                          {CAT_ICONS[e.category] || '📦'} {CATEGORIES[e.category] || e.category}
                        </span>
                      </td>
                      <td><span className="user-chip">👤 {e.user_id}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(e.spent_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {e.comment || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
