'use client'
import { useState, useEffect, useCallback } from 'react'
import MonthPicker from '@/components/MonthPicker'
import CategoryBadge from '@/components/CategoryBadge'
import ConfidenceBar from '@/components/ConfidenceBar'
import { CATEGORIES, formatAmount, CURRENCY_SYMBOLS } from '@/lib/categories'
import type { Transaction } from '@/lib/types'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function TransactionsPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const month = searchParams.month ?? currentMonth()
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Transaction>>({})
  const [filter, setFilter] = useState<string>('all')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/transactions?month=${month}`)
    const data = await res.json()
    setTxns(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!editId || !draft) return
    setSaving(true)
    const res = await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, ...draft }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTxns(p => p.map(t => t.id === editId ? updated : t))
      setEditId(null); setDraft({})
    }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    await fetch('/api/transactions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTxns(p => p.filter(t => t.id !== id))
  }

  const filtered = txns.filter(t => {
    if (filter === 'review') return !t.reviewed && t.category !== 'transfer'
    if (filter === 'income') return t.category === 'income'
    if (filter === 'transfer') return t.category === 'transfer'
    return true
  })

  const needsReview = txns.filter(t => !t.reviewed && t.category !== 'transfer')

  const thSt: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--hi)', borderBottom: '0.5px solid var(--bd)', whiteSpace: 'nowrap', fontWeight: 500 }
  const tdSt: React.CSSProperties = { padding: '10px 12px', fontSize: 12, borderBottom: '0.5px solid var(--bd)', verticalAlign: 'middle' }

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Transactions</h1>
      <p style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 16 }}>
        {txns.length} transactions · {needsReview.length} need review
      </p>

      <MonthPicker selected={month} />

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'review', label: `Review (${needsReview.length})` },
          { id: 'income', label: 'Income' },
          { id: 'transfer', label: 'Transfers' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
              border: `0.5px solid ${filter === f.id ? 'var(--acc)' : 'var(--bd)'}`,
              background: filter === f.id ? 'var(--acc-l)' : 'transparent',
              color: filter === f.id ? 'var(--acc)' : 'var(--mu)', fontWeight: filter === f.id ? 500 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--hi)', fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--hi)', fontSize: 13 }}>
            No transactions for this period. <a href="/dashboard/upload">Upload a CSV →</a>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={thSt}>Date</th>
                  <th style={thSt}>Description</th>
                  <th style={thSt}>Account</th>
                  <th style={thSt}>Category</th>
                  <th style={thSt}>Confidence</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>Amount</th>
                  <th style={thSt}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  editId === t.id ? (
                    <tr key={t.id} style={{ background: 'var(--surf)' }}>
                      <td style={{ ...tdSt, color: 'var(--hi)', fontSize: 11 }}>{t.date}</td>
                      <td style={{ ...tdSt, padding: '6px 12px' }}>
                        <input
                          className="inp"
                          style={{ fontSize: 12 }}
                          value={draft.description ?? ''}
                          onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
                        />
                      </td>
                      <td style={{ ...tdSt, color: 'var(--hi)', fontSize: 11 }}>{t.account}</td>
                      <td style={{ ...tdSt, padding: '6px 12px' }} colSpan={2}>
                        <select
                          className="sel"
                          style={{ width: '100%', fontSize: 12 }}
                          value={draft.category ?? 'uncategorised'}
                          onChange={e => setDraft(p => ({ ...p, category: e.target.value }))}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...tdSt, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: t.amount > 0 ? 'var(--grn)' : 'var(--tx)' }}>
                          {t.amount > 0 ? '+' : ''}{formatAmount(Math.abs(t.amount), t.currency)}
                        </span>
                        {t.currency !== 'GBP' && <div style={{ fontSize: 10, color: 'var(--hi)' }}>{t.currency}</div>}
                      </td>
                      <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>
                        <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={save} disabled={saving}>
                          {saving ? '…' : 'Save'}
                        </button>
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', marginLeft: 6 }} onClick={() => { setEditId(null); setDraft({}) }}>
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={t.id} style={{ opacity: t.category === 'transfer' ? 0.45 : 1 }}>
                      <td style={{ ...tdSt, color: 'var(--hi)', fontSize: 11 }}>{t.date}</td>
                      <td style={tdSt}>{t.description}</td>
                      <td style={{ ...tdSt, color: 'var(--hi)', fontSize: 11 }}>{t.account}</td>
                      <td style={tdSt}><CategoryBadge category={t.category} /></td>
                      <td style={tdSt}><ConfidenceBar confidence={t.confidence} reviewed={t.reviewed} /></td>
                      <td style={{ ...tdSt, textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: t.amount > 0 ? 'var(--grn)' : 'var(--tx)' }}>
                          {t.amount > 0 ? '+' : ''}{formatAmount(Math.abs(t.amount), t.currency)}
                        </span>
                        {t.currency !== 'GBP' && <div style={{ fontSize: 10, color: 'var(--hi)' }}>{t.currency}</div>}
                      </td>
                      <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => { setEditId(t.id); setDraft({ description: t.description, category: t.category }) }}>
                          Edit
                        </button>
                        <button className="btn" style={{ fontSize: 11, padding: '4px 9px', marginLeft: 4, color: 'var(--red)', background: 'transparent', border: '0.5px solid var(--bd)' }} onClick={() => del(t.id)}>
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
