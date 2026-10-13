import { useId, useState, type ReactNode } from 'react'

interface AnalysisSectionProps {
  title: string
  meta?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export const AnalysisSection = ({
  title,
  meta,
  defaultOpen = true,
  children,
}: AnalysisSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <section className="section-card">
      <h2 className="section-heading">
        <button
          type="button"
          className="section-toggle"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="chevron" aria-hidden="true">
            {isOpen ? '▾' : '▸'}
          </span>
          <span className="section-toggle-title">{title}</span>
          {meta !== undefined && <span className="section-toggle-meta">{meta}</span>}
        </button>
      </h2>
      {isOpen && (
        <div className="section-body" id={contentId}>
          {children}
        </div>
      )}
    </section>
  )
}
