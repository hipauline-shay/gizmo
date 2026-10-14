import { useEffect, useMemo, useRef, useState } from 'react'
import { postMessage } from './hooks/use-vscode'
import { Header } from './components/header'
import { AreaTabs } from './components/area-tabs'
import { AddAreaTab } from './components/add-area-tab'
import { GizmoCard, type GizmoChip } from './components/gizmo-card'
import { VerdictCard } from './components/verdict-card'
import { FixList, type ItemStateMap } from './components/fix-list'
import { AnalysisSection } from './components/analysis-section'
import { StateAudit } from './components/state-audit'
import { FindingList } from './components/finding-list'
import { SpecCompare } from './components/spec-compare'
import { Priorities } from './components/priorities'
import { ScopeReview } from './components/scope-review'
import { BossReply } from './components/boss-reply'
import { ShareCard } from './components/share-card'
import { FollowUpChat } from './components/follow-up-chat'
import { Toast } from './components/toast'
import { EmptyState } from './components/empty-state'
import { LoadingState } from './components/loading-state'
import { ErrorState } from './components/error-state'
import { CreateItemModal } from './components/create-item-modal'
import { buildFixList, type FixItem, type FixStatus } from './lib/build-fix-list'
import {
  ADD_AREA_GREETING,
  EXPLAIN_PROMPT,
  bossReplyPrompt,
  buildShareSummary,
  countItems,
  gizmoGreeting,
  gizmoMood,
  reportGreeting,
  type ItemCounts,
} from './lib/gizmo'
import { formatCostUsd } from '../../src/shared/format-cost'
import { maxReportAreas } from '../../src/utilities/limits'
import { useRequirements } from './hooks/use-requirements'
import { useManualItems } from './hooks/use-manual-items'
import {
  ADD_TAB,
  SUMMARY_TAB,
  type AreaView,
  type CombinedSummary,
  type ExtensionToWebviewMessage,
  type PanelState,
  type TabId,
} from './types/panel'

const initialState: PanelState = { status: 'empty', chat: [], isAsking: false }
const CELEBRATION_MS = 2400

export const App = () => {
  const [state, setState] = useState<PanelState>(initialState)
  // Empty until the first report arrives; the effect below then opens its first area.
  const [activeTab, setActiveTab] = useState<TabId>('')

  const [itemState, setItemState] = useState<ItemStateMap>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [showDoneRows, setShowDoneRows] = useState(false)
  const [showDismissedRows, setShowDismissedRows] = useState(false)
  const [toast, setToast] = useState('')
  const [toastUndo, setToastUndo] = useState(false)
  const [lastAction, setLastAction] = useState<{ id: string; previous: FixStatus } | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBossReplyOpen, setIsBossReplyOpen] = useState(false)
  const [isCelebrating, setIsCelebrating] = useState(false)

  const scrollByTab = useRef<Record<TabId, number>>({})
  const requirements = useRequirements()
  const { manualItems, addManualItem } = useManualItems()
  const areas = useMemo(() => state.areas ?? [], [state.areas])

  useEffect(() => {
    if (state.specComparison) requirements.mergeComparison(state.specComparison)
  }, [state.specComparison])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data?.type === 'state') setState(event.data.state)
    }
    window.addEventListener('message', handleMessage)
    postMessage({ type: 'ready' })
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // A finished scan opens its area's tab; its fresh findings start scrolled to the top.
  useEffect(() => {
    if (!state.focusArea) return
    scrollByTab.current[state.focusArea.id] = 0
    setExpanded({})
    setDismissing(null)
    setActiveTab(state.focusArea.id)
    window.scrollTo(0, 0)
  }, [state.focusArea?.nonce])

  useEffect(() => {
    const isKnownTab =
      activeTab === SUMMARY_TAB || activeTab === ADD_TAB || areas.some((a) => a.id === activeTab)
    if (!isKnownTab) setActiveTab(areas[0]?.id ?? SUMMARY_TAB)
  }, [areas, activeTab])

  useEffect(() => {
    if (!isCelebrating) return
    const timer = setTimeout(() => setIsCelebrating(false), CELEBRATION_MS)
    return () => clearTimeout(timer)
  }, [isCelebrating])

  const itemsByArea = useMemo(() => {
    const byArea = new Map<string, FixItem[]>()
    for (const area of areas)
      byArea.set(area.id, [
        ...buildFixList(area.analysis, area.id),
        ...manualItems.filter((item) => item.areaId === area.id),
      ])
    return byArea
  }, [areas, manualItems])
  const allItems = useMemo(() => [...itemsByArea.values()].flat(), [itemsByArea])

  const statusOf = (id: string): FixStatus => itemState[id]?.status ?? 'open'
  const totalCounts = countItems(allItems, statusOf)

  const setItem = (id: string, status: FixStatus, reason?: string) => {
    setItemState((current) => ({ ...current, [id]: { status, reason } }))
  }

  const showToast = (message: string) => {
    setToast(message)
    setToastUndo(false)
  }

  const handleToggleDone = (id: string) => {
    const current = statusOf(id)
    setItem(id, current === 'done' ? 'open' : 'done')
    const item = allItems.find((candidate) => candidate.id === id)
    const isLastBlocker = current === 'open' && item?.level === 1 && totalCounts.blocking === 1
    if (!isLastBlocker) return
    setIsCelebrating(true)
    showToast('That was the last blocker. Gizmo is doing a happy dance.')
  }

  const handleLater = (id: string) => {
    setItem(id, statusOf(id) === 'later' ? 'open' : 'later')
  }

  const handleToggleEvidence = (id: string) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }))
  }

  const handleAskDismiss = (id: string) => {
    setDismissing((current) => (current === id ? null : id))
  }

  const handleDismiss = (id: string, reason: string) => {
    setLastAction({ id, previous: statusOf(id) })
    setItem(id, 'dismissed', reason)
    setDismissing(null)
    setToast(`Dismissed as ${reason.toLowerCase()}`)
    setToastUndo(true)
  }

  const handleUndo = () => {
    if (!lastAction) return
    setItem(lastAction.id, lastAction.previous)
    setLastAction(null)
    setToast('')
    setToastUndo(false)
  }

  const handleCopy = (text: string, message = 'Copied. Paste it into Slack or email.') => {
    postMessage({ type: 'copy', text })
    showToast(message)
  }

  const handleEmail = (body: string) => {
    const subject = `Update: ${areas.map((area) => area.label).join(', ') || 'what we built'}`
    postMessage({ type: 'openEmail', subject, body })
  }

  const handleAsk = (question: string, label?: string) => {
    if (state.isAsking) return
    postMessage({ type: 'ask', question, label })
    scrollToId('ask-gizmo')
  }

  const handleTabChange = (nextTab: TabId) => {
    if (nextTab === activeTab) return
    scrollByTab.current[activeTab] = window.scrollY
    setActiveTab(nextTab)
    requestAnimationFrame(() => window.scrollTo(0, scrollByTab.current[nextTab] ?? 0))
  }

  const goTo = (nextTab: TabId, targetId: string) => {
    handleTabChange(nextTab)
    scrollToId(targetId)
  }

  if (state.status === 'empty')
    return <EmptyState mapStatus={state.mapStatus} hasApiKey={state.hasApiKey} />
  if (state.status === 'scope' && state.scope)
    return <ScopeReview scope={state.scope} mapStatus={state.mapStatus} />
  if (state.status === 'loading')
    return <LoadingState step={state.loadingStep ?? 1} estimateUsd={state.estimateUsd} />
  if (state.status === 'error' && state.error) return <ErrorState error={state.error} />
  const [firstArea] = areas
  if (!firstArea) return <EmptyState mapStatus={state.mapStatus} hasApiKey={state.hasApiKey} />

  const activeArea = areas.find((area) => area.id === activeTab)
  const itemsOf = (areaId: string): FixItem[] => itemsByArea.get(areaId) ?? []
  const rescanningAreaId = state.addArea?.status === 'loading' ? state.addArea.areaId : undefined
  const isAddingArea = state.addArea?.status === 'loading' && !state.addArea.areaId
  const canAddArea = areas.length < maxReportAreas

  const shareSummary = buildShareSummary({
    areas: areas.map((area) => ({
      label: area.label,
      analysis: area.analysis,
      items: itemsOf(area.id),
    })),
    combined: state.combined,
    statusOf,
  })

  const tabCounts = activeArea ? countItems(itemsOf(activeArea.id), statusOf) : totalCounts
  const greeting = activeArea
    ? gizmoGreeting({
        featureName: activeArea.analysis.featureName,
        fileCount: activeArea.meta.includedFiles,
        counts: tabCounts,
      })
    : activeTab === ADD_TAB
      ? ADD_AREA_GREETING
      : areas.length === 1
        ? gizmoGreeting({
            featureName: firstArea.analysis.featureName,
            fileCount: firstArea.meta.includedFiles,
            counts: totalCounts,
          })
        : reportGreeting({ areaLabels: areas.map((area) => area.label), counts: totalCounts })

  const maskedSecrets = areas.reduce((total, area) => total + (area.meta.maskedSecrets ?? 0), 0)
  const trustNote = [
    state.cost &&
      `Last run cost ${formatCostUsd(state.cost.lastUsd)} · ${formatCostUsd(state.cost.totalUsd)} this session, on your own API key`,
    secretCheckLabel(maskedSecrets),
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ')

  const handleShare = () => {
    handleCopy(shareSummary, 'Update copied. Paste it into Slack or email.')
    setIsCelebrating(true)
  }

  const chips: GizmoChip[] =
    activeTab === ADD_TAB
      ? []
      : [
          ...(tabCounts.blocking > 0
            ? [
                {
                  label: 'Show me the blockers',
                  onSelect: () =>
                    activeArea ? scrollToId('open-items') : scrollToId('summary-blockers'),
                },
              ]
            : []),
          {
            label: 'Explain what we built',
            onSelect: () => handleAsk(EXPLAIN_PROMPT, 'Explain what we built'),
          },
          {
            label: 'Help me answer my boss',
            onSelect: () => {
              setIsBossReplyOpen(true)
              scrollToId('boss-reply')
            },
          },
          { label: 'Write my team update', onSelect: () => goTo(SUMMARY_TAB, 'share-update') },
        ]

  const headerTitle =
    activeArea?.label ??
    (activeTab === ADD_TAB ? 'Add an area' : `Summary of ${areaCountLabel(areas.length)}`)
  const headerStatus = rescanningAreaId
    ? 'Rescanning…'
    : isAddingArea
      ? 'Adding an area…'
      : state.isCombining
        ? 'Updating the Summary…'
        : 'Analysis ready'
  const busyTab =
    rescanningAreaId ?? (isAddingArea ? ADD_TAB : state.isCombining ? SUMMARY_TAB : undefined)

  return (
    <div className="app">
      <div className="app-header-sticky">
        <Header
          title={headerTitle}
          status={headerStatus}
          rescanAreaId={
            activeArea && state.addArea?.status !== 'loading' ? activeArea.id : undefined
          }
          onShare={handleShare}
        />
        <AreaTabs
          areas={areas}
          activeTab={activeTab}
          busyTab={busyTab}
          canAddArea={canAddArea}
          onChange={handleTabChange}
        />
      </div>
      <main
        className="content"
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        <GizmoCard
          mood={activeTab === ADD_TAB ? 'happy' : gizmoMood(tabCounts)}
          message={greeting}
          readAloudText={activeTab === SUMMARY_TAB ? shareSummary : greeting}
          chips={chips}
          isCelebrating={isCelebrating}
          costNote={trustNote}
        />

        {activeArea &&
          (rescanningAreaId === activeArea.id ? (
            <LoadingState
              step={state.addArea?.loadingStep ?? 1}
              estimateUsd={state.estimateUsd}
              isInline
            />
          ) : (
            <>
              <VerdictCard
                analysis={activeArea.analysis}
                items={itemsOf(activeArea.id)}
                itemState={itemState}
              />
              <FixList
                headerAction={
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    + New open item
                  </button>
                }
                items={itemsOf(activeArea.id)}
                itemState={itemState}
                expanded={expanded}
                dismissing={dismissing}
                showDoneRows={showDoneRows}
                showDismissedRows={showDismissedRows}
                onToggleShowDone={() => setShowDoneRows((value) => !value)}
                onToggleShowDismissed={() => setShowDismissedRows((value) => !value)}
                onToggleDone={handleToggleDone}
                onLater={handleLater}
                onToggleEvidence={handleToggleEvidence}
                onAskDismiss={handleAskDismiss}
                onDismiss={handleDismiss}
              />
              <AnalysisSection
                title="UX states"
                meta={`${activeArea.analysis.states.filter((s) => s.status === 'implemented').length} of ${activeArea.analysis.states.length} built`}
              >
                <StateAudit states={activeArea.analysis.states} showEvidence={true} />
              </AnalysisSection>
              <AnalysisSection
                title="What's working"
                defaultOpen={false}
                meta={activeArea.analysis.whatsWorking.length}
              >
                <FindingList
                  findings={activeArea.analysis.whatsWorking}
                  showEvidence={true}
                  checklist={true}
                />
              </AnalysisSection>
              <SpecCompare
                reqs={requirements.reqs}
                changes={requirements.changes}
                isComparing={state.isComparing ?? false}
                areaId={activeArea.id}
                onAddRequirement={requirements.addRequirement}
                onToggleLater={requirements.toggleLater}
                onRemoveRequirement={requirements.removeRequirement}
              />
            </>
          ))}

        {activeTab === ADD_TAB && (
          <AddAreaTab
            addArea={state.addArea}
            areaCount={areas.length}
            estimateUsd={state.estimateUsd}
            mapStatus={state.mapStatus}
          />
        )}

        {activeTab === SUMMARY_TAB && (
          <SummaryTab
            areas={areas}
            combined={state.combined}
            isCombining={state.isCombining ?? false}
            counts={totalCounts}
            countsOf={(areaId) => countItems(itemsOf(areaId), statusOf)}
            isAtMaxAreas={!canAddArea}
            shareSummary={shareSummary}
            onOpenArea={handleTabChange}
            onCopy={() => handleCopy(shareSummary, 'Update copied. Paste it into Slack or email.')}
            onEmail={() => handleEmail(shareSummary)}
          />
        )}

        {activeTab !== ADD_TAB && (
          <>
            {isBossReplyOpen && (
              <BossReply
                isAsking={state.isAsking}
                onDraft={(message, audience) =>
                  handleAsk(
                    bossReplyPrompt({ message, audience }),
                    `Help me reply: "${message.trim()}"`,
                  )
                }
                onClose={() => setIsBossReplyOpen(false)}
              />
            )}
            <FollowUpChat
              chat={state.chat}
              isAsking={state.isAsking}
              onCopy={(text) => handleCopy(text)}
              onEmail={handleEmail}
            />
          </>
        )}
      </main>
      <Toast
        message={toast}
        showUndo={toastUndo}
        onUndo={handleUndo}
        onDismiss={() => setToast('')}
      />
      {isCreateModalOpen && activeArea && (
        <CreateItemModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={(input) => addManualItem(input, activeArea.id)}
        />
      )}
    </div>
  )
}

interface SummaryTabProps {
  areas: AreaView[]
  combined?: CombinedSummary
  isCombining: boolean
  counts: ItemCounts
  countsOf: (areaId: string) => ItemCounts
  isAtMaxAreas: boolean
  shareSummary: string
  onOpenArea: (areaId: TabId) => void
  onCopy: () => void
  onEmail: () => void
}

const SummaryTab = ({
  areas,
  combined,
  isCombining,
  counts,
  countsOf,
  isAtMaxAreas,
  shareSummary,
  onOpenArea,
  onCopy,
  onEmail,
}: SummaryTabProps) => {
  const [first] = areas
  if (!first) return null
  const isSingleArea = areas.length === 1
  const firstStakeholder = first.analysis.perspectives.stakeholder
  const fallbackSummary = isSingleArea
    ? firstStakeholder.launchSummary || first.analysis.summary
    : areas.map((area) => `${area.label}: ${area.analysis.summary}`).join(' ')
  const summaryText = isCombining
    ? 'Combining your areas into one summary…'
    : (combined?.summary ?? fallbackSummary)
  const launchGoal = combined?.launchGoal ?? (isSingleArea ? firstStakeholder.launchGoal : '')
  const priorities = combined?.nextSteps ?? (isSingleArea ? first.analysis.nextSteps : [])
  const hasNoBlockers = areas.every(
    (area) => area.analysis.perspectives.stakeholder.launchBlockers.length === 0,
  )

  return (
    <>
      <section
        className="verdict-card verdict-card-amber"
        aria-label="Can we ship?"
        aria-busy={isCombining}
      >
        <p className="verdict-eyebrow">Can we ship?</p>
        <h1 className="verdict-headline">{shipVerdictHeadline(counts.blocking)}</h1>
        <p className="summary-text">{summaryText}</p>
        {launchGoal && (
          <p className="summary-text">
            <strong>Goal of this launch:</strong> {launchGoal}
          </p>
        )}
      </section>

      {!isSingleArea && (
        <AnalysisSection title="Areas in this report" meta={areas.length}>
          <ul className="summary-areas">
            {areas.map((area) => (
              <li key={area.id} className="summary-area">
                <span className="summary-area-name">{area.label}</span>
                <span className="summary-area-counts">{countsLabel(countsOf(area.id))}</span>
                <button
                  type="button"
                  className="details-link"
                  aria-label={`Open the ${area.label} tab`}
                  onClick={() => onOpenArea(area.id)}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
          {isAtMaxAreas && (
            <p className="muted">
              This report has {maxReportAreas} areas, the most one report can hold. Start a new scan
              for more.
            </p>
          )}
        </AnalysisSection>
      )}

      <section id="summary-blockers">
        <AnalysisSection title="What's blocking release">
          {isSingleArea ? (
            <FindingList findings={firstStakeholder.launchBlockers} showEvidence={false} />
          ) : hasNoBlockers ? (
            <p className="muted">Nothing blocks a release in any area.</p>
          ) : (
            areas.map((area) => {
              const blockers = area.analysis.perspectives.stakeholder.launchBlockers
              if (blockers.length === 0) return null
              return (
                <div key={area.id} className="summary-area-findings">
                  <p className="summary-area-label">{area.label}</p>
                  <FindingList findings={blockers} showEvidence={false} />
                </div>
              )
            })
          )}
        </AnalysisSection>
      </section>

      {priorities.length > 0 && (
        <AnalysisSection title="Recommended priorities">
          <Priorities steps={priorities} />
        </AnalysisSection>
      )}

      <ShareCard summary={shareSummary} onCopy={onCopy} onEmail={onEmail} />
    </>
  )
}

function countsLabel({ blocking, alsoToFix }: ItemCounts): string {
  if (blocking === 0 && alsoToFix === 0) return 'All clear'
  return [blocking > 0 ? `${blocking} blocking` : '', alsoToFix > 0 ? `${alsoToFix} to fix` : '']
    .filter(Boolean)
    .join(' · ')
}

function areaCountLabel(count: number): string {
  return count === 1 ? '1 area' : `${count} areas`
}

function secretCheckLabel(masked: number): string {
  if (masked === 0) return 'Secret check: nothing to mask'
  return `Secret check: ${masked} string${masked === 1 ? '' : 's'} masked before sending`
}

function shipVerdictHeadline(blocking: number): string {
  if (blocking === 0) return 'Yes — nothing is blocking a ship'
  if (blocking === 1) return 'Almost — one thing blocks it'
  return `Almost — ${blocking} things block it`
}

function scrollToId(id: string): void {
  setTimeout(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }, 60)
}
