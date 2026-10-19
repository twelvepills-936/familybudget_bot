import { Expense, Category, CATEGORIES, CAT_ICONS } from '../api/expenses'

interface Props {
  expenses: Expense[]
  loading: boolean
  onEdit: (e: Expense) => void
  onDelete: (id: number) => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })

export function ExpenseTable({ expenses, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="loading-spinner"><div className="spinner" /></div>
    )
  }

  return (
    <>
      <div className="table-toolbar">
        <div className="table-toolbar-title">Список трат</div>
        <div className="table-count">{expenses.length} записей</div>
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <h3>Нет трат</h3>
          <p>Измените фильтры или добавьте первую трату</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Участник</th>
                <th>Сумма</th>
                <th>Категория</th>
                <th>Дата</th>
                <th>Комментарий</th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                      #{e.id}
                    </span>
                  </td>
                  <td>
                    <span className="user-chip">👤 {e.user_id}</span>
                  </td>
                  <td>
                    <span className="amount">{fmt(e.amount)}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${e.category}`}>
                      {CAT_ICONS[e.category] ?? ''} {CATEGORIES[e.category as Category] ?? e.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
                    {fmtDate(e.spent_at)}
                  </td>
                  <td style={{
                    color: 'var(--text-secondary)',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.83rem'
                  }}>
                    {e.comment || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <div className="td-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        id={`btn-edit-${e.id}`}
                        className="btn btn-secondary btn-sm btn-icon"
                        onClick={() => onEdit(e)}
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      <button
                        id={`btn-delete-${e.id}`}
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={() => onDelete(e.id)}
                        title="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
