'use client'
import { useState, useEffect, useCallback } from 'react'
import MonthPicker from '@/components/MonthPicker'
import { getAllCategories, formatAmount } from '@/lib/categories'
import { extractKeyword, saveRule } from '@/lib/rules'
import type { Transaction, CategoryDefinition } from '@/lib/types'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface SplitDraft {
  txnId: string
  name: string
  members: { name: string; amount: string }[]
}

export default function TransactionsPage({ searchParams }: { searchParams: { month?: string } }) {
  const month = searchParams.month ?? currentMonth()
  const [txns, setTxns] = useState<Transaction[]>([])
  const [allMonths, setAllMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [cats, setCats] = useState<CategoryDefinition[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [saving, setSaving] = useState<string | null>(null)
  const [split, setSplit] = useState<SplitDraft | null>(null)
  const [savingSplit, setSavingSplit] = useState(false)
  const [ruleSaved, setRuleSaved] = useState<string | null>(null)

  useEffect(() => { setCats(getAllCategories()) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [monthRes, allRes] = await Promise.all([
      fetch(`/api/transactions?month=${month}`),
      fetch(`/api/transactions?limit=2000`),
    ])
    const [monthData, allData] = await Promise.all([monthRes.json(), allRes.json()])
    setTxns(Array.isArray(monthData) ? monthData : [])
    if (Array.isArray(allData)) {
      const months = [...new Set(allData.map((t: Transaction) => t.date.substring(0, 7)))]
        .sort((a, b) => b.localeCompare(a))
      setAllMonths(months)
    }
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  const updateCategory = async (id: string, category: string, description: string) => {
    setSaving(id)
    const res = await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, category }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTxns(p => p.map(t => t.id === id ? updated : t))
      // Save rule automatically
      const keyword = extractKeyword(description)
      if (keyword.length > 2) {
        await saveRule(keyword, category)
        setRuleSaved(keyword)
        setTimeout(() => setRuleSaved(null), 3000)
      }
    }
    setSaving(null)
  }

  const approve = async (id: string, category: string) => {
    setSaving(id)
    const res = await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, category, reviewed: true }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTxns(p => p.map(t => t.id === id ? updated : t))
    }
    setSaving(null)
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

  const saveSplit = async () => {
    if (!split) return
    setSavingSplit(true)
    const txn = txns.find(t => t.id === split.txnId)
    if (!txn) { setSavingSplit(false); return }
    const members = split.members.filter(m => m.name.trim())
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: split.name || txn.description,
        total_amount: Math.abs(txn.amount),
        currency: txn.currency,
        date: txn.date,
        members: members.map(m => ({ name: m.name, share_amount: parseFloat(m.amount) || 0 })),
        reimbursements: [],
      }),
    })
    await approve(split.txnId, txn.category)
    setSplit(null)
    setSavingSplit(false)
  }

  const startSplit = (t: Transaction) => {
    const perHead = (Math.abs(t.amount) / 2).toFixed(2)
    setSplit({ txnId: t.id, name: t.description, members: [{ name: '', amount: perHead }, { name: '', amount: perHead }] })
  }

  const splitEvenly = () => {
    if (!split) return
    const txn = txns.find(t => t.id === split.txnId)
    if (!txn) return
    const each = (Math.abs(txn.amount) / split.members.length).toFixed(2)
    setSplit(p => p ? { ...p, members: p.members.map(m => ({ ...m, amount: each })) } : p)
  }

  const needsReview = txns.filter(t => !t.reviewed && t.category !== 'transfer')
  const filtered = txns.filter(t => {
    if (filter === 'review') return !t.reviewed && t.category !== 'transfer'
    if (filter === 'income') return t.category === 'income'
    if (filter === 'transfer') return t.category === 'transfer'
    return true
  })

  const thSt: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--hi)', borderBottom: '0.5px solid var(--bd)', whiteSpace: 'nowrap', fontWeight: 500 }
  const tdSt: React.CSSProperties = { padding: '8px 12px', fontSize: 12, borderBottom: '0.5px solid var(--bd)', verticalAlign: 'middle' }

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Transactions</h1>
      <p style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 16 }}>{txns.length} transactions · {needsReview.length} need review</p>

      <MonthPicker selected={month} available={allMonths} />

      {/* Rule saved toast */}
      {ruleSaved && (
        <div style={{ background: 'var(--grn-l)', border: '0.5px solid rgba(59,109,17,.3)', borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 12, fontSize: 12, color: 'var(--grn)' }}>
          ✓ Rule saved — &quot;{ruleSaved}&quot; will be auto-categorised next time
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[{ id: 'all', label: 'All' }, { id: 'review', label: `Needs review (${needsReview.length})` }, { id: 'income', label: 'Income' }, { id: 'transfer', label: 'Transfers' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: `0.5px solid ${filter === f.id ? 'var(--acc)' : 'var(--bd)'}`, background: filter === f.id ? 'var(--acc-l)' : 'transparent', color: filter === f.id ? 'var(--acc)' : 'var(--mu)', fontWeight: filter === f.id ? 500 : 400 }}>{f.label}</button>
        ))}
        <a href="/dashboard/rules" style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, border: '0.5px solid var(--bd)', color: 'var(--mu)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          View rules →
        </a>
      </div>

      {split && (() => {
        const txn = txns.find(t => t.id === split.txnId)
        if (!txn) return null
        return (
          <div style={{ background: 'var(--card)', border: '0.5px solid var(--acc)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: 'var(--acc)' }}>Split — {formatAmount(Math.abs(txn.amount), txn.currency)}</div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--hi)', display: 'block', marginBottom: 5 }}>Event name</label>
              <input className="inp" value={split.name} onChange={e => setSplit(p => p ? { ...p, name: e.target.value } : p)} style={{ maxWidth: 320 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--hi)' }}>Who owes you?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={splitEvenly}>Split evenly</button>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setSplit(p => p ? { ...p, members: [...p.members, { name: '', amount: '' }] } : p)}>+ Add person</button>
              </div>
            </div>
            {split.members.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                <input className="inp" placeholder="Name" value={m.name} onChange={e => setSplit(p => p ? { ...p, members: p.members.map((x, j) => j === i ? { ...x, name: e.target.value } : x) } : p)} />
                <input className="inp" type="number" placeholder="They owe" style={{ maxWidth: 140 }} value={m.amount} onChange={e => setSplit(p => p ? { ...p, members: p.members.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) } : p)} />
                {split.members.length > 1 && <button onClick={() => setSplit(p => p ? { ...p, members: p.members.filter((_, j) => j !== i) } : p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16 }}>×</button>}
              </div>
            ))}
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={saveSplit} disabled={savingSplit}>{savingSplit ? 'Saving…' : 'Save split'}</button>
              <button className="btn btn-ghost" onClick={() => setSplit(null)}>Cancel</button>
            </div>
          </div>
        )
      })()}

      <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--hi)', fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--hi)', fontSize: 13 }}>No transactions for this period. <a href="/dashboard/upload">Upload a CSV →</a></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={thSt}>Date</th>
                  <th style={thSt}>Description</th>
                  <th style={thSt}>Account</th>
                  <th style={thSt}>Category</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>Amount</th>
                  <th style={thSt}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const isWorking = saving === t.id
                  const needsReview = !t.reviewed && t.category !== 'transfer'
                  return (
                    <tr key={t.id} style={{ opacity: t.category === 'transfer' ? 0.4 : 1, background: needsReview ? 'rgba(186,117,23,0.04)' : 'transparent' }}>
                      <td style={{ ...tdSt, color: 'var(--hi)', fontSize: 11, whiteSpace: 'nowrap' }}>{t.date}</td>
                      <td style={{ ...tdSt, maxWidth: 200 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                        {t.group_id && <div style={{ fontSize: 10, color: 'var(--acc)', marginTop: 1 }}>↔ split expense</div>}
                      </td>
                      <td style={{ ...tdSt, color: 'var(--hi)', fontSize: 11 }}>{t.account}</td>
                      <td style={{ ...tdSt, minWidth: 170 }}>
                        <select className="sel" style={{ fontSize: 11, padding: '3px 7px', width: '100%' }} value={t.category}
                          onChange={e => updateCategory(t.id, e.target.value, t.description)}>
                          {cats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </td>
                      <td style={{ ...tdSt, textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        <span style={{ color: t.amount > 0 ? 'var(--grn)' : 'var(--tx)' }}>{t.amount > 0 ? '+' : ''}{formatAmount(Math.abs(t.amount), t.currency)}</span>
                        {t.currency !== 'GBP' && <div style={{ fontSize: 10, color: 'var(--hi)' }}>{t.currency}</div>}
                      </td>
                      <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {needsReview && (
                            <button onClick={() => approve(t.id, t.category)} disabled={isWorking} title="Approve" style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--grn)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--grn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isWorking ? '…' : '✓'}
                            </button>
                          )}
                          {t.amount < 0 && t.category !== 'transfer' && !t.group_id && (
                            <button onClick={() => startSplit(t)} title="Split with friends" style={{ padding: '3px 8px', borderRadius: 6, border: '0.5px solid var(--bd)', background: 'transparent', cursor: 'pointer', fontSize: 10, color: 'var(--mu)' }}>Split</button>
                          )}
                          <button onClick={() => del(t.id)} style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--bd)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
