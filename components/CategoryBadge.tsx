import { getCategory } from '@/lib/categories'

export default function CategoryBadge({ category }: { category: string }) {
  const c = getCategory(category)
  return (
    <span
      className="badge"
      style={{
        background: `${c.color}22`,
        color: c.color,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0, display: 'inline-block' }} />
      {c.label}
    </span>
  )
}
