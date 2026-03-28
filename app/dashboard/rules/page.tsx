'use client'
import { useState, useEffect } from 'react'
import { getAllCategories, getCategory } from '@/lib/categories'
import { fetchRules, deleteRule } from '@/lib/rules'
import type { Rule } from '@/lib/rules'
import type { CategoryDefinition } from '@/lib/types'

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [cats, setCats] = useState<CategoryDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setCats(getAllCategories())
    fetchRules().then(r => { setRules(r); setLoading(false) })
  }, [])

  const del = async (id: string) => {
    if (!confirm('Delete this rule?')) return
    await deleteRule(id)
    setRules(p => p.filter(r => r.id !== id))
  }

  const cardSt: React.CSSProperties = {
    background: 'var(--card)', border: '0.5px solid var(--bd)',
    borderRadius: 'var(--radius)', overflow: 'hidden',
  }

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Your rules</h1>
      <p style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 20 }}>
        Rules are saved automatically when you change a category. Next time you upload, matching transactions are categorised instantly without needing AI.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--hi)', fontSize: 13 }}>Loading…</div>
      ) : rules.length === 0 ? (
        <div style={{ ...cardSt, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 8 }}>No rules yet</div>
          <div style={{ fontSize: 12, color: 'var(--hi)' }}>
            Change a category on the <a href="/dashboard/transactions">Transactions</a> page and a rule will be saved automatically.
          </div>
        </div>
      ) : (
        <div style={cardSt}>
          <table>
            <thead>
              <tr>
                {['Keyword', 'Category', 'Applied', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 2 ? 'right' : 'left', padding: '8px 16px', fontSize: 11, color: 'var(--hi)', borderBottom: '0.5px solid var(--bd)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map(r => {
                const c = getCategory(r.category)
                return (
                  <tr key={r.id}>
                    <td style={{ padding: '10px 16px', fontSize: 13, borderBottom: '0.5px solid var(--bd)', fontWeight: 500 }}>
                      {r.keyword}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, borderBottom: '0.5px solid var(--bd)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${c.color}22`, color: c.color, padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
                        {c.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, borderBottom: '0.5px solid var(--bd)', textAlign: 'right', color: 'var(--hi)' }}>
                      {r.match_count} {r.match_count === 1 ? 'time' : 'times'}
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--bd)' }}>
                      <button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 12 }}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--hi)' }}>
        Rules match by checking if the transaction description <em>contains</em> the keyword. The keyword is extracted from the first few words of the description when you make a correction.
      </div>
    </div>
  )
}
