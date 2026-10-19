import { useState, useEffect, useCallback } from 'react'
import { expenseApi, Expense, Category, CreateExpenseInput, UpdateExpenseInput, ExpenseFilter } from '../../api/expenses'
import { ExpenseModal } from '../../components/ExpenseModal'
import { FilterBar } from '../../components/FilterBar'
import { StatsSummary } from '../../components/StatsSummary'
import { ExpenseTable } from '../../components/ExpenseTable'
import { Toast, ToastData } from '../../components/Toast'
import { Analytics } from '../Analytics'
import { Members } from '../Members'
import { Settings } from '../Settings'

type Tab = 'dashboard' | 'analytics' | 'members' | 'settings'

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [users, setUsers] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ExpenseFilter>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [prefillUserId, setPrefillUserId] = useState<number | undefined>(undefined)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await expenseApi.list(filter)
      setExpenses(data ?? [])
    } catch {
      showToast('Ошибка загрузки данных', 'error')
    } finally {
      setLoading(false)
    }
  }, [filter, showToast])

  const loadUsers = useCallback(async () => {
    try {
      const data = await expenseApi.listUsers()
      setUsers(data ?? [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadExpenses()
    loadUsers()

    // Real-time polling so expenses from Telegram bot appear automatically
    const interval = setInterval(async () => {
      try {
        const [data, u] = await Promise.all([
          expenseApi.list(filter),
          expenseApi.listUsers(),
        ])
        setExpenses(data ?? [])
        setUsers(u ?? [])
      } catch { /* ignore periodic fetch error */ }
    }, 3000)

    return () => clearInterval(interval)
  }, [loadExpenses, loadUsers, filter])

  const handleCreate = async (data: CreateExpenseInput) => {
    await expenseApi.create(data)
    showToast('Трата добавлена ✓')
    setModalOpen(false)
    setPrefillUserId(undefined)
    loadExpenses()
    loadUsers()
  }

  const handleUpdate = async (id: number, data: UpdateExpenseInput) => {
    await expenseApi.update(id, data)
    showToast('Трата обновлена ✓')
    setEditExpense(null)
    loadExpenses()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту трату?')) return
    try {
      await expenseApi.delete(id)
      showToast('Трата удалена')
      loadExpenses()
    } catch {
      showToast('Ошибка удаления', 'error')
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">💰</div>
          <div>
            <div className="sidebar-brand-name">Family Budget</div>
            <div className="sidebar-brand-sub">Управление расходами</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Обзор</div>
          <button
            id="nav-dashboard"
            className={`sidebar-link ${tab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            <span className="sidebar-link-icon">📊</span>
            Дашборд
          </button>
          <button
            id="nav-analytics"
            className={`sidebar-link ${tab === 'analytics' ? 'active' : ''}`}
            onClick={() => setTab('analytics')}
          >
            <span className="sidebar-link-icon">📈</span>
            Аналитика
          </button>

          <div className="sidebar-nav-label">Данные</div>
          <button
            id="nav-new-expense"
            className="sidebar-link"
            onClick={() => {
              setPrefillUserId(undefined)
              setModalOpen(true)
            }}
          >
            <span className="sidebar-link-icon">＋</span>
            Новая трата
          </button>
          <button
            id="nav-members"
            className={`sidebar-link ${tab === 'members' ? 'active' : ''}`}
            onClick={() => setTab('members')}
          >
            <span className="sidebar-link-icon">👥</span>
            Участники
          </button>
          <button
            id="nav-settings"
            className={`sidebar-link ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
          >
            <span className="sidebar-link-icon">⚙️</span>
            Настройки
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot" />
            API подключён
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <div className="topbar-title">
              {tab === 'dashboard' && 'Дашборд'}
              {tab === 'analytics' && 'Аналитика расходов'}
              {tab === 'members' && 'Участники семьи'}
              {tab === 'settings' && 'Настройки'}
            </div>
            <div className="topbar-subtitle">
              {tab === 'dashboard' && (loading ? 'Загрузка...' : `${expenses.length} трат · ${fmt(total)}`)}
              {tab === 'analytics' && 'Статистика, распределение и динамика бюджета'}
              {tab === 'members' && `${users.length} участников в общем семейном бюджете`}
              {tab === 'settings' && 'Конфигурация Telegram-бота, категории и экспорт данных'}
            </div>
          </div>
          <div className="topbar-actions">
            <div className="live-pill" title="Данные автоматически синхронизируются с Telegram-ботом каждые 3 секунды">
              <span className="live-dot" />
              <span>Live Sync</span>
            </div>
            <button
              id="btn-add-expense"
              className="btn btn-primary"
              onClick={() => {
                setPrefillUserId(undefined)
                setModalOpen(true)
              }}
            >
              <span>＋</span> Добавить трату
            </button>
          </div>
        </header>

        <div className="page-content">
          {tab === 'dashboard' && (
            <>
              {/* Stats */}
              <div className="section-header" style={{ marginBottom: 14 }}>
                <div className="section-title">Статистика</div>
              </div>
              <StatsSummary expenses={expenses} />

              {/* Filters + Table */}
              <div className="section-header" style={{ marginBottom: 14 }}>
                <div className="section-title">Транзакции</div>
              </div>

              <FilterBar
                filter={filter}
                users={users}
                onChange={setFilter}
                onReset={() => setFilter({})}
              />

              <div className="panel">
                <ExpenseTable
                  expenses={expenses}
                  loading={loading}
                  onEdit={setEditExpense}
                  onDelete={handleDelete}
                />
              </div>
            </>
          )}

          {tab === 'analytics' && (
            <Analytics expenses={expenses} />
          )}

          {tab === 'members' && (
            <Members
              expenses={expenses}
              users={users}
              onAddExpenseForUser={(uid) => {
                setPrefillUserId(uid)
                setModalOpen(true)
              }}
              onToast={showToast}
            />
          )}

          {tab === 'settings' && (
            <Settings expenses={expenses} onToast={showToast} />
          )}
        </div>
      </div>

      {/* Create modal */}
      {modalOpen && (
        <ExpenseModal
          title="Новая трата"
          users={users}
          defaultUserId={prefillUserId}
          onSubmit={async (data) => { await handleCreate(data as CreateExpenseInput) }}
          onClose={() => {
            setModalOpen(false)
            setPrefillUserId(undefined)
          }}
        />
      )}

      {/* Edit modal */}
      {editExpense && (
        <ExpenseModal
          title="Редактировать трату"
          initial={editExpense}
          users={users}
          onSubmit={async (data) => {
            const update: UpdateExpenseInput = {
              amount:   (data as CreateExpenseInput).amount,
              category: (data as CreateExpenseInput).category as Category,
              spent_at: (data as CreateExpenseInput).spent_at,
              comment:  (data as CreateExpenseInput).comment,
            }
            await handleUpdate(editExpense.id, update)
          }}
          onClose={() => setEditExpense(null)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
