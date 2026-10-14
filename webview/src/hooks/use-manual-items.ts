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

export interface ManualItem extends FixItem {
  areaId: string
}

export function useManualItems() {
  const [manualItems, setManualItems] = useState<ManualItem[]>([])

  const addManualItem = (input: NewItemInput, areaId: string) => {
    setManualItems((current) => [
      {
        areaId,
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
