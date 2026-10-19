import { Category, CATEGORIES, CAT_ICONS, CATEGORY_LIST, ExpenseFilter } from '../api/expenses'

interface Props {
  filter: ExpenseFilter
  users: number[]
  onChange: (f: ExpenseFilter) => void
  onReset: () => void
}

export function FilterBar({ filter, users, onChange, onReset }: Props) {
  const set = (key: keyof ExpenseFilter, value: string | number | undefined) =>
    onChange({ ...filter, [key]: value || undefined })

  const hasFilters = Object.values(filter).some(v => v !== undefined && v !== '')

  const fmtDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const setPeriod = (p: 'all' | 'today' | '7days' | 'month') => {
    const now = new Date()
    if (p === 'all') {
      onChange({ ...filter, from: undefined, to: undefined })
    } else if (p === 'today') {
      const todayStr = fmtDate(now)
      onChange({ ...filter, from: todayStr, to: todayStr })
    } else if (p === '7days') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000)
      onChange({ ...filter, from: fmtDate(weekAgo), to: fmtDate(now) })
    } else if (p === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      onChange({ ...filter, from: fmtDate(monthStart), to: fmtDate(now) })
    }
  }

  return (
    <div className="filter-bar">
      <div className="filter-presets">
        <span className="filter-presets-label">Быстрый период:</span>
        <button
          type="button"
          className={`filter-chip ${!filter.from && !filter.to ? 'active' : ''}`}
          onClick={() => setPeriod('all')}
        >
          Всё время
        </button>
        <button
          type="button"
          className="filter-chip"
          onClick={() => setPeriod('today')}
        >
          Сегодня
        </button>
        <button
          type="button"
          className="filter-chip"
          onClick={() => setPeriod('7days')}
        >
          7 дней
        </button>
        <button
          type="button"
          className="filter-chip"
          onClick={() => setPeriod('month')}
        >
          Текущий месяц
        </button>
      </div>

      <div className="filter-row">
        <div className="filter-group filter-search-group">
          <label>Поиск</label>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              id="filter-search"
              type="text"
              placeholder="Кофе, такси, продукты..."
              value={filter.search ?? ''}
              onChange={e => set('search', e.target.value)}
            />
            {filter.search && (
              <button
                className="search-clear-btn"
                onClick={() => set('search', undefined)}
                type="button"
                title="Очистить поиск"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>Участник семьи</label>
          <select
            id="filter-user"
            value={filter.user_id ?? ''}
            onChange={e => set('user_id', e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Все участники</option>
            {users.map(uid => (
              <option key={uid} value={uid}>👤 ID {uid}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Категория</label>
          <select
            id="filter-category"
            value={filter.category ?? ''}
            onChange={e => set('category', e.target.value as Category)}
          >
            <option value="">Все категории</option>
            {CATEGORY_LIST.map(c => (
              <option key={c} value={c}>{CAT_ICONS[c]} {CATEGORIES[c]}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Дата с</label>
          <input
            id="filter-from"
            type="date"
            value={filter.from ?? ''}
            onChange={e => set('from', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Дата по</label>
          <input
            id="filter-to"
            type="date"
            value={filter.to ?? ''}
            onChange={e => set('to', e.target.value)}
          />
        </div>

        <div className="filter-bar-actions">
          {hasFilters && (
            <button id="btn-reset-filter" className="btn btn-secondary" onClick={onReset}>
              ✕ Сбросить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
