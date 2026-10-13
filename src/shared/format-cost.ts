export function formatCostUsd(usd: number): string {
  if (usd < 0.01) return 'less than 1¢'
  return `about $${usd.toFixed(2)}`
}
