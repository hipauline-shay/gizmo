import { useEffect } from 'react'

interface ToastProps {
  message: string
  showUndo: boolean
  onUndo: () => void
  onDismiss: () => void
}

export const Toast = ({ message, showUndo, onUndo, onDismiss }: ToastProps) => {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      {showUndo && (
        <button type="button" className="toast-undo" onClick={onUndo}>
          Undo
        </button>
      )}
    </div>
  )
}
