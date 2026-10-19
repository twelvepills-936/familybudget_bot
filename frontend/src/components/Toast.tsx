export interface ToastData {
  id: number
  msg: string
  type: 'success' | 'error'
}

interface Props {
  toasts: ToastData[]
}

export function Toast({ toasts }: Props) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <div className="toast-icon">
            {t.type === 'success' ? '✓' : '⚠'}
          </div>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
