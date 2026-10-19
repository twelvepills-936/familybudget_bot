import { Expense, CATEGORIES, Category, CAT_COLORS, CAT_ICONS } from '../api/expenses'

interface Props {
  expenses: Expense[]
}

export function StatsSummary({ expenses }: Props) {
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const count = expenses.length
  const avg   = count ? total / count : 0

  const byCat = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})

  const topCats = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)

  const maxCat = topCats[0]?.[1] ?? 1

  return (
    <>
      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {/* Total */}
        <div className="stat-card stat-card-violet">
          <div className="stat-card-glow" />
          <div className="stat-card-top">
            <div className="stat-card-icon icon-violet">💳</div>
            <div className="stat-card-badge">Общий итог</div>
          </div>
          <div className="stat-card-label">Всего расходов</div>
          <div className="stat-card-value text-glow-violet">
            {fmt(total)}
          </div>
          <div className="stat-card-sub">
            <span>⚡ {count} операций</span>
            <span className="stat-card-tag">Семейный бюджет</span>
          </div>
          <div className="stat-card-bar">
            <div className="stat-card-bar-fill bar-violet" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Average */}
        <div className="stat-card stat-card-blue">
          <div className="stat-card-glow" />
          <div className="stat-card-top">
            <div className="stat-card-icon icon-blue">📊</div>
            <div className="stat-card-badge">Аналитика</div>
          </div>
          <div className="stat-card-label">Средний чек</div>
          <div className="stat-card-value text-glow-blue">
            {count ? fmt(avg) : '—'}
          </div>
          <div className="stat-card-sub">
            <span>🎯 в среднем</span>
            <span className="stat-card-tag">на операцию</span>
          </div>
          <div className="stat-card-bar">
            <div className="stat-card-bar-fill bar-blue" style={{ width: count ? '65%' : '0%' }} />
          </div>
        </div>

        {/* Top Category */}
        {topCats[0] && (
          <div className="stat-card stat-card-gold">
            <div className="stat-card-glow" />
            <div className="stat-card-top">
              <div className="stat-card-icon icon-gold">
                {CAT_ICONS[topCats[0][0] as Category] ?? '📂'}
              </div>
              <div className="stat-card-badge">Лидер затрат</div>
            </div>
            <div className="stat-card-label">Топ категория</div>
            <div className="stat-card-value text-glow-gold">
              {fmt(topCats[0][1])}
            </div>
            <div className="stat-card-sub">
              <span>{CATEGORIES[topCats[0][0] as Category] ?? topCats[0][0]}</span>
              <span className="stat-card-tag">{((topCats[0][1] / (total || 1)) * 100).toFixed(0)}% от всех</span>
            </div>
            <div className="stat-card-bar">
              <div className="stat-card-bar-fill bar-gold" style={{
                width: `${(topCats[0][1] / (total || 1)) * 100}%`,
              }} />
            </div>
          </div>
        )}

        {/* Users */}
        <div className="stat-card stat-card-green">
          <div className="stat-card-glow" />
          <div className="stat-card-top">
            <div className="stat-card-icon icon-green">👥</div>
            <div className="stat-card-badge">Семья</div>
          </div>
          <div className="stat-card-label">Участников</div>
          <div className="stat-card-value text-glow-green">
            {new Set(expenses.map(e => e.user_id)).size}
          </div>
          <div className="stat-card-sub">
            <span>👤 Активные профили</span>
            <span className="stat-card-tag">Telegram</span>
          </div>
          <div className="stat-card-bar">
            <div className="stat-card-bar-fill bar-green" style={{ width: '85%' }} />
          </div>
        </div>
      </div>

      {/* Category Breakdown Panel */}
      {topCats.length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">🗂️</span>
              Расходы по категориям
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {topCats.length} категорий
            </div>
          </div>
          <div className="panel-body">
            <div className="cat-list">
              {topCats.map(([cat, amount]) => {
                const pct = maxCat > 0 ? (amount / maxCat) * 100 : 0
                const totalPct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0'
                return (
                  <div key={cat} className="cat-row">
                    <div className="cat-row-top">
                      <div className="cat-label">
                        <span className="cat-dot" style={{ background: CAT_COLORS[cat as Category] }} />
                        <span>{CAT_ICONS[cat as Category] ?? ''}</span>
                        {CATEGORIES[cat as Category] ?? cat}
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                          {totalPct}%
                        </span>
                        <span className="cat-amount">{fmt(amount)}</span>
                      </div>
                    </div>
                    <div className="cat-bar">
                      <div
                        className="cat-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: CAT_COLORS[cat as Category],
                          opacity: 0.75
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
