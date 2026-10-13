import thinking from '../assets/gizmo-thinking.png?inline'
import happy from '../assets/gizmo-happy.png?inline'
import alert from '../assets/gizmo-alert.png?inline'
import sleeping from '../assets/gizmo-sleeping.png?inline'
import type { GizmoMood } from '../lib/gizmo'

interface GizmoPoseProps {
  mood: GizmoMood
  size?: number
  className?: string
}

export const GizmoPose = ({ mood, size = 88, className }: GizmoPoseProps) => (
  <img
    className={className ? `gizmo-pose ${className}` : 'gizmo-pose'}
    src={POSE_IMAGE[mood]}
    width={size}
    height={size}
    alt={POSE_ALT[mood]}
  />
)

const POSE_IMAGE: Record<GizmoMood, string> = { thinking, happy, alert, sleeping }

const POSE_ALT: Record<GizmoMood, string> = {
  thinking: 'Gizmo the dragon, thinking',
  happy: 'Gizmo the dragon, happy',
  alert: 'Gizmo the dragon, pointing at something important',
  sleeping: 'Gizmo the dragon, asleep',
}
