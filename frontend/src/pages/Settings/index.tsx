import { Expense, CATEGORIES, CAT_ICONS, CAT_COLORS, CATEGORY_LIST } from '../../api/expenses'

interface Props {
  expenses: Expense[]
  onToast: (msg: string, type?: 'success' | 'error') => void
}

export function Settings({ expenses, onToast }: Props) {
  // Export CSV
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      onToast('Нет данных для экспорта', 'error')
      return
    }

    const headers = ['ID', 'User ID', 'Amount', 'Category', 'Spent At', 'Comment', 'Created At']
    const rows = expenses.map(e => [
      e.id,
      e.user_id,
      e.amount,
      `"${CATEGORIES[e.category] || e.category}"`,
      e.spent_at.slice(0, 10),
      `"${(e.comment || '').replace(/"/g, '""')}"`,
      e.created_at,
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `family_expenses_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    onToast('Файл CSV успешно сформирован и скачан!')
  }

  // Export JSON
  const handleExportJSON = () => {
    if (expenses.length === 0) {
      onToast('Нет данных для экспорта', 'error')
      return
    }

    const jsonContent = JSON.stringify(expenses, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `family_expenses_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    onToast('Файл JSON успешно сформирован и скачан!')
  }

  return (
    <div className="settings-view">
      {/* Bot & AI Integration Card */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-icon">🤖</span>
            Telegram-бот и Искусственный Интеллект
          </div>
          <span className="user-chip" style={{ color: 'var(--green)', borderColor: 'rgba(16,217,139,0.3)' }}>
            ● Онлайн
          </span>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Бот синхронизирован с базой данных и автоматически распознаёт естественную речь через Gemini.
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '14px 18px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                marginBottom: 16,
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Имя бота в Telegram</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-bright)' }}>
                  @testfbbotbotbot
                </div>
                <div style={{ marginTop: 10 }}>
                  <a
                    href="https://t.me/testfbbotbotbot"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    ↗ Открыть в Telegram
                  </a>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Примеры фраз для бота:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
                  💬 <strong style={{ color: 'var(--accent-bright)' }}>«Кофе 350»</strong> — создаст трату 350 ₽ в категории «Кафе и рестораны» за сегодня
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
                  💬 <strong style={{ color: 'var(--accent-bright)' }}>«Такси 450 вчера»</strong> — запишет 450 ₽ во вчерашний день
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
                  💬 <strong style={{ color: 'var(--accent-bright)' }}>«Купил корм для кошки 800»</strong> — автоматически выберет категорию «Питомцы»
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
                  💬 <strong style={{ color: 'var(--accent-bright)' }}>«Сколько потратил за эту неделю?»</strong> — бот сгенерирует сводный аналитический отчёт
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Catalog */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-icon">🏷️</span>
            Справочник категорий ({CATEGORY_LIST.length})
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            15 активных категорий
          </span>
        </div>
        <div className="panel-body">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: 12,
          }}>
            {CATEGORY_LIST.map(cat => (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--r-sm)',
                  background: `${CAT_COLORS[cat]}20`,
                  color: CAT_COLORS[cat],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                }}>
                  {CAT_ICONS[cat]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {CATEGORIES[cat]}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    код: {cat}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Export & Backup */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-icon">💾</span>
            Резервное копирование и экспорт данных
          </div>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Вы можете в любой момент выгрузить все транзакции семейного бюджета в форматах CSV (для Excel / Google Таблиц) или JSON (для резервного сохранения).
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              📥 Скачать отчёт в CSV
            </button>
            <button className="btn btn-secondary" onClick={handleExportJSON}>
              📦 Скачать бэкап в JSON
            </button>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-icon">ℹ️</span>
            О системе
          </div>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Версия приложения</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>v1.0.0 (Release)</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Архитектура</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Go + React + PostgreSQL</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Языковая модель</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Google Gemini via Proxy</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Статус базы данных</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--green)' }}>✓ Подключена (PostgreSQL)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
