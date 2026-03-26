'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MONTHS } from '@/lib/categories'

interface Props {
  selected: string
  available?: string[]  // 'YYYY-MM' list — if empty falls back to last 12
}

function last12(): string[] {
  const months: string[] = []
  const d = new Date()
  for (let i = 0; i < 12; i++) {
    months.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() - 1)
  }
  return months
}

export default function MonthPicker({ selected, available }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const months = available && available.length > 0 ? available : last12()

  const pick = (m: string) => {
    const p = new URLSearchParams(params.toString())
    p.set('month', m)
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
      {months.map(m => {
        const [y, mo] = m.split('-')
        const label = `${MONTHS[parseInt(mo) - 1]} ${y}`
        const active = m === selected
        return (
          <button key={m} onClick={() => pick(m)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: `0.5px solid ${active ? 'var(--acc)' : 'var(--bd)'}`,
            background: active ? 'var(--acc)' : 'transparent',
            color: active ? '#fff' : 'var(--mu)',
            fontWeight: active ? 500 : 400,
            transition: 'all .12s',
          }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}
