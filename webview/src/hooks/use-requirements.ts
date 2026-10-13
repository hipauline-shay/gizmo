import { useRef, useState } from 'react'
import type { Evidence, GapAnalysis } from '../types/panel'

export type ReqStatus = 'Built' | 'Partial' | 'Missing' | 'Unchecked'

export interface ReqItem {
  id: string
  text: string
  status: ReqStatus
  addedDate: string
  deferred: boolean
  explanation?: string
  evidence: Evidence[]
}

export interface ChangeItem {
  kind: 'Added' | 'Removed'
  date: string
  text: string
}

const GAP_STATUS_TO_REQ: Record<string, ReqStatus> = {
  built: 'Built',
  partial: 'Partial',
  missing: 'Missing',
  'not-specified': 'Unchecked',
}

export function today(): string {
  const d = new Date()
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`
}

export function useRequirements() {
  const [reqs, setReqs] = useState<ReqItem[]>([])
  const [changes, setChanges] = useState<ChangeItem[]>([])
  const previousComparison = useRef<GapAnalysis | undefined>(undefined)

  const addRequirement = (text: string) => {
    const value = text.trim()
    if (!value) return
    if (reqs.some((r) => r.text.toLowerCase() === value.toLowerCase())) return
    setReqs((current) => [
      {
        id: crypto.randomUUID(),
        text: value,
        status: 'Unchecked',
        addedDate: today(),
        deferred: false,
        evidence: [],
      },
      ...current,
    ])
    setChanges((current) => [{ kind: 'Added', date: today(), text: value }, ...current])
  }

  const toggleLater = (id: string) => {
    setReqs((current) => current.map((r) => (r.id === id ? { ...r, deferred: !r.deferred } : r)))
  }

  const removeRequirement = (id: string) => {
    const req = reqs.find((r) => r.id === id)
    setReqs((current) => current.filter((r) => r.id !== id))
    if (req)
      setChanges((current) => [{ kind: 'Removed', date: today(), text: req.text }, ...current])
  }

  const mergeComparison = (comparison: GapAnalysis) => {
    if (comparison === previousComparison.current) return
    previousComparison.current = comparison
    setReqs((current) =>
      current.map((req) => {
        const match = comparison.items.find(
          (item) => item.requirement.toLowerCase() === req.text.toLowerCase(),
        )
        if (!match) return req
        return {
          ...req,
          status: GAP_STATUS_TO_REQ[match.status] ?? 'Unchecked',
          explanation: match.explanation,
          evidence: match.evidence,
        }
      }),
    )
  }

  return { reqs, changes, addRequirement, toggleLater, removeRequirement, mergeComparison }
}
