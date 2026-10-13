interface GizmoIconProps {
  size?: number
}

export const GizmoIcon = ({ size = 16 }: GizmoIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    {PIXELS.map(({ x, y }) => (
      <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
    ))}
  </svg>
)

const HEAD = [
  '.....#...#......',
  '.....#...#......',
  '....##...##.....',
  '.#.#########....',
  '.###########....',
  '.######..###....',
  '..#####..######.',
  '...###########.#',
  '...#############',
  '...############.',
  '....########....',
  '....######......',
  '....######......',
  '...#######......',
  '...########.....',
  '...########.....',
]

const PIXELS = HEAD.flatMap((row, y) =>
  [...row].flatMap((cell, x) => (cell === '#' ? [{ x, y }] : [])),
)
