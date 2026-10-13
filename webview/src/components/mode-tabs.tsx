import type { KeyboardEvent } from 'react'
import type { Mode } from '../types/panel'

interface ModeTabsProps {
  mode: Mode
  onChange: (mode: Mode) => void
}

const tabs: { id: Mode; label: string }[] = [
  { id: 'check', label: 'Check' },
  { id: 'summary', label: 'Summary' },
]

export const ModeTabs = ({ mode, onChange }: ModeTabsProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === mode)
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const next = tabs[(index + 1) % tabs.length]
      if (next) onChange(next.id)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const previous = tabs[(index - 1 + tabs.length) % tabs.length]
      if (previous) onChange(previous.id)
    }
  }

  return (
    <div className="mode-tabs" role="tablist" aria-label="View" onKeyDown={handleKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={mode === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={mode === tab.id ? 0 : -1}
          className={mode === tab.id ? 'tab tab-active' : 'tab'}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
