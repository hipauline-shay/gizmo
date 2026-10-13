import { useState } from 'react'
import { TAG_GROUPS, levelForKind } from '../lib/manual-items'
import type { NewItemInput } from '../hooks/use-manual-items'
import type { ItemSource } from '../lib/build-fix-list'

interface CreateItemModalProps {
  onClose: () => void
  onCreate: (input: NewItemInput) => void
}

const ROLE_OPTIONS: { value: ItemSource; label: string }[] = [
  { value: 'pm', label: 'Product Manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'stakeholder', label: 'Stakeholder' },
]

export const CreateItemModal = ({ onClose, onCreate }: CreateItemModalProps) => {
  const firstKind = TAG_GROUPS[0]?.kinds[0] ?? ''
  const [kind, setKind] = useState(firstKind)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [createdBy, setCreatedBy] = useState<ItemSource>('designer')
  const [requestedFor, setRequestedFor] = useState<ItemSource>('pm')

  const handleSubmit = () => {
    if (!title.trim()) return
    onCreate({
      level: levelForKind(kind),
      kind,
      title: title.trim(),
      description: description.trim(),
      createdBy,
      requestedFor,
    })
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Create new open item"
    >
      <div className="modal-card">
        <h2 className="modal-title">Create new open item</h2>

        <div className="modal-field">
          <label htmlFor="new-item-tag">Tag</label>
          <select id="new-item-tag" value={kind} onChange={(e) => setKind(e.target.value)}>
            {TAG_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.kinds.map((k) => (
                  <option key={k} value={k}>
                    {group.label} — {k}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label htmlFor="new-item-title">Header</label>
          <input
            id="new-item-title"
            type="text"
            value={title}
            placeholder="Short summary of the issue"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="modal-field">
          <label htmlFor="new-item-description">Description</label>
          <textarea
            id="new-item-description"
            rows={6}
            value={description}
            placeholder="What needs attention, and why?"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <RoleSelect id="new-item-by" label="Created by" value={createdBy} onChange={setCreatedBy} />
        <RoleSelect
          id="new-item-for"
          label="Who is this for"
          value={requestedFor}
          onChange={setRequestedFor}
        />

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!title.trim()}
            onClick={handleSubmit}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

interface RoleSelectProps {
  id: string
  label: string
  value: ItemSource
  onChange: (value: ItemSource) => void
}

const RoleSelect = ({ id, label, value, onChange }: RoleSelectProps) => (
  <div className="modal-field">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={(e) => onChange(toRole(e.target.value))}>
      {ROLE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

function toRole(value: string): ItemSource {
  return ROLE_OPTIONS.find((option) => option.value === value)?.value ?? 'designer'
}
