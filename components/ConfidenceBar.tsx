export default function ConfidenceBar({ confidence, reviewed }: { confidence: number; reviewed: boolean }) {
  const pct = Math.round((confidence ?? 0) * 100)
  const color = confidence > 0.85 ? 'var(--grn)' : confidence > 0.6 ? 'var(--acc)' : 'var(--red)'
  return (
    <div>
      <div style={{ width: 52, height: 3, background: 'var(--bd)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: color }} />
      </div>
      {!reviewed && (
        <div style={{ fontSize: 10, color: 'var(--acc)', marginTop: 2 }}>Review needed</div>
      )}
    </div>
  )
}
