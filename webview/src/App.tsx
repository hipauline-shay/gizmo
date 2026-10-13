import { useEffect, useMemo, useRef, useState } from 'react'
import { postMessage } from './hooks/use-vscode'
import { Header } from './components/header'
import { ModeTabs } from './components/mode-tabs'
import { GizmoCard, type GizmoChip } from './components/gizmo-card'
import { VerdictCard } from './components/verdict-card'
import { FixList, type ItemStateMap } from './components/fix-list'
import { AnalysisSection } from './components/analysis-section'
import { StateAudit } from './components/state-audit'
import { FindingList } from './components/finding-list'
import { SpecCompare } from './components/spec-compare'
import { Priorities } from './components/priorities'
import { ScopeReview } from './components/scope-review'
import { RelatedCode } from './components/related-code'
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
  EXPLAIN_PROMPT,
  bossReplyPrompt,
  buildShareSummary,
  countItems,
  gizmoGreeting,
  gizmoMood,
} from './lib/gizmo'
import { formatCostUsd } from '../../src/shared/format-cost'
import { useRequirements } from './hooks/use-requirements'
import { useManualItems } from './hooks/use-manual-items'
import type { ExtensionToWebviewMessage, Mode, PanelState, ProductAnalysis } from './types/panel'

const initialState: PanelState = { status: 'empty', chat: [], isAsking: false }
const CELEBRATION_MS = 2400

export const App = () => {
  const [state, setState] = useState<PanelState>(initialState)
  const [mode, setMode] = useState<Mode>('check')

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

  const previousAnalysis = useRef<ProductAnalysis | undefined>(undefined)
  const scrollByMode = useRef<Record<Mode, number>>({ check: 0, summary: 0 })
  const requirements = useRequirements()
  const { manualItems, addManualItem } = useManualItems()

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

  useEffect(() => {
    if (state.analysis !== previousAnalysis.current) {
      previousAnalysis.current = state.analysis
      // Item statuses (done/later/dismissed) are keyed by a stable id tied to the
      // code location + kind, so they survive a rescan on purpose — only the
      // transient drawer UI state resets here.
      setExpanded({})
      setDismissing(null)
      scrollByMode.current = { check: 0, summary: 0 }
    }
  }, [state.analysis])

  useEffect(() => {
    if (!isCelebrating) return
    const timer = setTimeout(() => setIsCelebrating(false), CELEBRATION_MS)
    return () => clearTimeout(timer)
  }, [isCelebrating])

  const fixItems = useMemo<FixItem[]>(
    () => (state.analysis ? buildFixList(state.analysis) : []),
    [state.analysis],
  )
  const allItems = useMemo(() => [...fixItems, ...manualItems], [fixItems, manualItems])

  const statusOf = (id: string): FixStatus => itemState[id]?.status ?? 'open'
  const counts = countItems(allItems, statusOf)

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
    const isLastBlocker = current === 'open' && item?.level === 1 && counts.blocking === 1
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
    const subject = `Update: ${state.analysis?.featureName ?? 'what we built'}`
    postMessage({ type: 'openEmail', subject, body })
  }

  const handleAsk = (question: string, label?: string) => {
    if (state.isAsking) return
    postMessage({ type: 'ask', question, label })
    scrollToId('ask-gizmo')
  }

  const handleModeChange = (nextMode: Mode) => {
    if (nextMode === mode) return
    scrollByMode.current[mode] = window.scrollY
    setMode(nextMode)
    requestAnimationFrame(() => window.scrollTo(0, scrollByMode.current[nextMode]))
  }

  const goTo = (nextMode: Mode, targetId: string) => {
    handleModeChange(nextMode)
    scrollToId(targetId)
  }

  if (state.status === 'empty')
    return <EmptyState mapStatus={state.mapStatus} hasApiKey={state.hasApiKey} />
  if (state.status === 'scope' && state.scope)
    return <ScopeReview scope={state.scope} mapStatus={state.mapStatus} />
  if (state.status === 'loading') return <LoadingState step={state.loadingStep ?? 1} />
  if (state.status === 'error' && state.error) return <ErrorState error={state.error} />
  if (!state.analysis) return <EmptyState mapStatus={state.mapStatus} hasApiKey={state.hasApiKey} />

  const analysis = state.analysis
  const shareSummary = buildShareSummary({ analysis, items: allItems, statusOf })
  const greeting = gizmoGreeting({
    featureName: analysis.featureName,
    fileCount: state.meta?.includedFiles,
    counts,
  })

  const trustNote = [
    state.cost &&
      `Last run cost ${formatCostUsd(state.cost.lastUsd)} · ${formatCostUsd(state.cost.totalUsd)} this session, on your own API key`,
    state.meta && secretCheckLabel(state.meta.maskedSecrets ?? 0),
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ')

  const handleShare = () => {
    handleCopy(shareSummary, 'Update copied. Paste it into Slack or email.')
    setIsCelebrating(true)
  }

  const chips: GizmoChip[] = [
    ...(counts.blocking > 0
      ? [{ label: 'Show me the blockers', onSelect: () => goTo('check', 'open-items') }]
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
    { label: 'Write my team update', onSelect: () => goTo('summary', 'share-update') },
  ]

  return (
    <div className="app">
      <div className="app-header-sticky">
        <Header meta={state.meta} status="Analysis ready" onShare={handleShare} />
        <ModeTabs mode={mode} onChange={handleModeChange} />
      </div>
      <main
        className="content"
        id={`panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`tab-${mode}`}
      >
        <GizmoCard
          mood={gizmoMood(counts)}
          message={greeting}
          readAloudText={mode === 'summary' ? shareSummary : greeting}
          chips={chips}
          isCelebrating={isCelebrating}
          costNote={trustNote}
        />

        {mode === 'check' && (
          <>
            {state.relatedSuggestions && state.relatedSuggestions.length > 0 && (
              <RelatedCode suggestions={state.relatedSuggestions} />
            )}
            <VerdictCard analysis={analysis} items={allItems} itemState={itemState} />
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
              items={allItems}
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
              meta={`${analysis.states.filter((s) => s.status === 'implemented').length} of ${analysis.states.length} built`}
            >
              <StateAudit states={analysis.states} showEvidence={true} />
            </AnalysisSection>
            <AnalysisSection
              title="What's working"
              defaultOpen={false}
              meta={analysis.whatsWorking.length}
            >
              <FindingList findings={analysis.whatsWorking} showEvidence={true} checklist={true} />
            </AnalysisSection>
            <SpecCompare
              reqs={requirements.reqs}
              changes={requirements.changes}
              isComparing={state.isComparing ?? false}
              onAddRequirement={requirements.addRequirement}
              onToggleLater={requirements.toggleLater}
              onRemoveRequirement={requirements.removeRequirement}
            />
          </>
        )}

        {mode === 'summary' && (
          <SummaryTab
            analysis={analysis}
            shareSummary={shareSummary}
            onCopy={() => handleCopy(shareSummary, 'Update copied. Paste it into Slack or email.')}
            onEmail={() => handleEmail(shareSummary)}
          />
        )}

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
      </main>
      <Toast
        message={toast}
        showUndo={toastUndo}
        onUndo={handleUndo}
        onDismiss={() => setToast('')}
      />
      {isCreateModalOpen && (
        <CreateItemModal onClose={() => setIsCreateModalOpen(false)} onCreate={addManualItem} />
      )}
    </div>
  )
}

interface SummaryTabProps {
  analysis: ProductAnalysis
  shareSummary: string
  onCopy: () => void
  onEmail: () => void
}

const SummaryTab = ({ analysis, shareSummary, onCopy, onEmail }: SummaryTabProps) => {
  const stakeholder = analysis.perspectives.stakeholder

  return (
    <>
      <section className="verdict-card verdict-card-amber" aria-label="Can we ship?">
        <p className="verdict-eyebrow">Can we ship?</p>
        <h1 className="verdict-headline">
          {shipVerdictHeadline(stakeholder.launchBlockers.length)}
        </h1>
        <p className="summary-text">
          {stakeholder.launchSummary || 'No launch summary could be determined.'}
        </p>
        {stakeholder.launchGoal && (
          <p className="summary-text">
            <strong>Goal of this launch:</strong> {stakeholder.launchGoal}
          </p>
        )}
      </section>

      <AnalysisSection title="What's blocking release">
        <FindingList findings={stakeholder.launchBlockers} showEvidence={false} />
      </AnalysisSection>

      <AnalysisSection title="Recommended priorities">
        <Priorities steps={analysis.nextSteps} />
      </AnalysisSection>

      <ShareCard summary={shareSummary} onCopy={onCopy} onEmail={onEmail} />
    </>
  )
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
