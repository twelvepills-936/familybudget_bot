import { useState, FormEvent } from 'react'
import { Expense, Category, CATEGORIES, CAT_ICONS, CATEGORY_LIST, CreateExpenseInput } from '../api/expenses'

interface Props {
  title: string
  initial?: Expense
  users: number[]
  defaultUserId?: number
  onSubmit: (data: CreateExpenseInput) => Promise<void>
  onClose: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

export function ExpenseModal({ title, initial, users, defaultUserId, onSubmit, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState<CreateExpenseInput>({
    user_id:  initial?.user_id ?? (defaultUserId || (users[0] ?? 0)),
    amount:   initial?.amount ?? 0,
    category: (initial?.category as Category) ?? 'other',
    spent_at: initial?.spent_at ? initial.spent_at.slice(0, 10) : today(),
    comment:  initial?.comment ?? '',
  })

  const set = <K extends keyof CreateExpenseInput>(k: K, v: CreateExpenseInput[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.amount <= 0) { setError('Сумма должна быть больше 0'); return }
    if (!form.user_id)    { setError('Выберите участника'); return }
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button id="btn-modal-close" className="modal-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* User */}
            <div className="form-group">
              <label htmlFor="field-user">Участник (Telegram ID)</label>
              {users.length > 0 ? (
                <select
                  id="field-user"
                  value={form.user_id}
                  onChange={e => set('user_id', Number(e.target.value))}
                  required
                >
                  {users.map(uid => (
                    <option key={uid} value={uid}>👤 ID {uid}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="field-user-input"
                  type="number"
                  placeholder="Telegram ID"
                  value={form.user_id || ''}
                  onChange={e => set('user_id', Number(e.target.value))}
                  required
                />
              )}
            </div>

            {/* Amount */}
            <div className="form-group">
              <label htmlFor="field-amount">Сумма (₽)</label>
              <input
                id="field-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="350.00"
                value={form.amount || ''}
                onChange={e => set('amount', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="field-category">Категория</label>
              <select
                id="field-category"
                value={form.category}
                onChange={e => set('category', e.target.value as Category)}
              >
                {CATEGORY_LIST.map(c => (
                  <option key={c} value={c}>{CAT_ICONS[c]} {CATEGORIES[c]}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="form-group">
              <label htmlFor="field-date">Дата траты</label>
              <input
                id="field-date"
                type="date"
                value={form.spent_at}
                onChange={e => set('spent_at', e.target.value)}
                required
              />
            </div>

            {/* Comment */}
            <div className="form-group span-2">
              <label htmlFor="field-comment">Комментарий (необязательно)</label>
              <input
                id="field-comment"
                type="text"
                placeholder="Кофе, Пятёрочка, заправка..."
                value={form.comment ?? ''}
                onChange={e => set('comment', e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="form-error">
              ⚠️ {error}
            </div>
          )}

          <div className="modal-footer">
            <button id="btn-modal-cancel" type="button" className="btn btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button id="btn-modal-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Сохранение...</>
              ) : (
                '✓ Сохранить'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
