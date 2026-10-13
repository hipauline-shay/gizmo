import { useState } from 'react'
import type { FixItem, FixLevel, ItemSource } from '../lib/build-fix-list'

export interface NewItemInput {
  level: FixLevel
  kind: string
  title: string
  description: string
  createdBy: ItemSource
  requestedFor: ItemSource
}

export function useManualItems() {
  const [manualItems, setManualItems] = useState<FixItem[]>([])

  const addManualItem = (input: NewItemInput) => {
    setManualItems((current) => [
      {
        id: crypto.randomUUID(),
        level: input.level,
        kind: input.kind,
        text: input.title,
        description: input.description || undefined,
        evidence: [],
        createdBy: input.createdBy,
        requestedFor: input.requestedFor,
      },
      ...current,
    ])
  }

  return { manualItems, addManualItem }
}
