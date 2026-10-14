import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ADD_TAB, SUMMARY_TAB, type AreaView, type TabId } from '../types/panel'

interface AreaTabsProps {
  areas: AreaView[]
  activeTab: TabId
  busyTab?: TabId
  canAddArea: boolean
  onChange: (tab: TabId) => void
}

export const AreaTabs = ({ areas, activeTab, busyTab, canAddArea, onChange }: AreaTabsProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const allTabs: { id: TabId; label: string }[] = [
    ...areas.map((area) => ({ id: area.id, label: area.label })),
    ...(canAddArea ? [{ id: ADD_TAB, label: '+ Add area' }] : []),
    { id: SUMMARY_TAB, label: 'Summary' },
  ]

  // Keeps the open tab in view and shows the edge fade only while tabs are hidden to the right.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const updateFade = (): void =>
      setIsOverflowing(scroller.scrollWidth - scroller.scrollLeft - scroller.clientWidth > 1)
    const showActiveTab = (): void => {
      const active = scroller.querySelector<HTMLElement>(`[data-tab="${activeTab}"]`)
      active?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      updateFade()
    }
    showActiveTab()
    const observer = new ResizeObserver(showActiveTab)
    observer.observe(scroller)
    scroller.addEventListener('scroll', updateFade)
    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', updateFade)
    }
  }, [activeTab, areas.length, canAddArea])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const index = allTabs.findIndex((tab) => tab.id === activeTab)
    const step = event.key === 'ArrowRight' ? 1 : -1
    const next = allTabs[(index + step + allTabs.length) % allTabs.length]
    if (!next) return
    onChange(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  return (
    <div className="area-tabs" role="tablist" aria-label="Report areas" onKeyDown={handleKeyDown}>
      <div
        className={isOverflowing ? 'area-tabs-scroller is-overflowing' : 'area-tabs-scroller'}
        ref={scrollerRef}
      >
        {areas.map((area) => (
          <TabButton
            key={area.id}
            id={area.id}
            label={area.label}
            isActive={activeTab === area.id}
            isBusy={busyTab === area.id}
            onSelect={onChange}
          />
        ))}
      </div>
      {/* "+ Add area" and Summary stay pinned so they are reachable at any panel width. */}
      <div className="area-tabs-pinned">
        {canAddArea && (
          <TabButton
            id={ADD_TAB}
            label="+ Add area"
            isActive={activeTab === ADD_TAB}
            isBusy={busyTab === ADD_TAB}
            isAdd
            onSelect={onChange}
          />
        )}
        <TabButton
          id={SUMMARY_TAB}
          label="Summary"
          isActive={activeTab === SUMMARY_TAB}
          isBusy={busyTab === SUMMARY_TAB}
          onSelect={onChange}
        />
      </div>
    </div>
  )
}

interface TabButtonProps {
  id: TabId
  label: string
  isActive: boolean
  isBusy: boolean
  isAdd?: boolean
  onSelect: (tab: TabId) => void
}

const TabButton = ({ id, label, isActive, isBusy, isAdd, onSelect }: TabButtonProps) => (
  <button
    type="button"
    role="tab"
    id={`tab-${id}`}
    data-tab={id}
    aria-selected={isActive}
    aria-controls={`panel-${id}`}
    aria-busy={isBusy}
    tabIndex={isActive ? 0 : -1}
    title={label}
    className={['tab', 'area-tab', isActive ? 'tab-active' : '', isAdd ? 'area-tab-add' : '']
      .filter(Boolean)
      .join(' ')}
    onClick={() => onSelect(id)}
  >
    <span className="area-tab-label">{label}</span>
    {isBusy && (
      <span className="area-tab-busy" aria-hidden="true">
        …
      </span>
    )}
  </button>
)
