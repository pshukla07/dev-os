interface Props {
  score: number
}

export default function ConfidenceBadge({ score }: Props) {
  const pct = Math.round(score * 100)

  if (score >= 0.8) {
    return <span className="badge-confidence-high">● {pct}%</span>
  }
  if (score >= 0.5) {
    return <span className="badge-confidence-medium">● {pct}%</span>
  }
  return <span className="badge-confidence-low">⚠ {pct}%</span>
}
