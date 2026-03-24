'use client'
import { useState, useEffect } from 'react'
import { formatAmount } from '@/lib/categories'
import type { GroupExpense } from '@/lib/types'

interface MemberDraft { name: string; share_amount: number }
interface ReimbDraft { from_name: string; amount: number; date: string }

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [total, setTotal] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [members, setMembers] = useState<MemberDraft[]>([{ name: '', share_amount: 0 }])
  const [reimbs, setReimbs] = useState<ReimbDraft[]>([])

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/groups')
    const data = await res.json()
    setGroups(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const splitEvenly = () => {
    const amt = parseFloat(total) || 0
    const perHead = amt / (members.length || 1)
    setMembers(p => p.map(m => ({ ...m, share_amount: parseFloat(perHead.toFixed(2)) })))
  }

  const submit = async () => {
    if (!name || !total) return
    setSaving(true)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, total_amount: parseFloat(total), currency, date,
        members: members.filter(m => m.name),
        reimbursements: reimbs.filter(r => r.from_name && r.amount > 0),
      }),
    })
    if (res.ok) {
      setCreating(false)
      setName(''); setTotal(''); setMembers([{ name: '', share_amount: 0 }]); setReimbs([])
      load()
    }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('Delete this group expense?')) return
    await fetch('/api/groups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const cardSt: React.CSSProperties = { background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 12 }
  const inpSt: React.CSSProperties = { width: '100%', background: 'var(--surf)', border: '0.5px solid var(--bd)', color: 'var(--tx)', padding: '7px 11px', borderRadius: 'var(--radius-sm)', fontSize: 13, outline: 'none' }
  const lblSt: React.CSSProperties = { display: 'block', fontSize: 11, color: 'var(--hi)', marginBottom: 5 }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500 }}>Group expenses</h1>
        {!creating && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New group expense</button>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 20 }}>Track shared costs and who owes what</p>

      {/* Create form */}
      {creating && (
        <div style={cardSt}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>New group expense</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lblSt}>Name / event</label>
              <input className="inp" placeholder="e.g. Dishoom dinner" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={lblSt}>Total amount</label>
              <input className="inp" type="number" placeholder="145.00" value={total} onChange={e => setTotal(e.target.value)} />
            </div>
            <div>
              <label style={lblSt}>Currency</label>
              <select className="sel" style={{ width: '100%' }} value={currency} onChange={e => setCurrency(e.target.value)}>
                {['GBP','EUR','USD','NZD','AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lblSt}>Date</label>
            <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inpSt, width: 180 }} />
          </div>

          {/* Members */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...lblSt, marginBottom: 0 }}>Members (incl. yourself)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={splitEvenly}>Split evenly</button>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setMembers(p => [...p, { name: '', share_amount: 0 }])}>+ Add member</button>
              </div>
            </div>
            {members.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                <input className="inp" placeholder="Name" value={m.name} onChange={e => setMembers(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input className="inp" type="number" placeholder="Share" style={{ width: 120 }} value={m.share_amount || ''} onChange={e => setMembers(p => p.map((x, j) => j === i ? { ...x, share_amount: parseFloat(e.target.value) || 0 } : x))} />
                {members.length > 1 && <button onClick={() => setMembers(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16, padding: '0 4px' }}>×</button>}
              </div>
            ))}
          </div>

          {/* Reimbursements already received */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...lblSt, marginBottom: 0 }}>Reimbursements already received</label>
              <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setReimbs(p => [...p, { from_name: '', amount: 0, date: '' }])}>+ Add</button>
            </div>
            {reimbs.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                <input className="inp" placeholder="From (name)" value={r.from_name} onChange={e => setReimbs(p => p.map((x, j) => j === i ? { ...x, from_name: e.target.value } : x))} />
                <input className="inp" type="number" placeholder="Amount" style={{ width: 120 }} value={r.amount || ''} onChange={e => setReimbs(p => p.map((x, j) => j === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))} />
                <button onClick={() => setReimbs(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16, padding: '0 4px' }}>×</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={submit} disabled={saving || !name || !total}>{saving ? 'Saving…' : 'Save group expense'}</button>
            <button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Groups list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--hi)', fontSize: 13 }}>Loading…</div>
      ) : groups.length === 0 && !creating ? (
        <div style={{ ...cardSt, textAlign: 'center', padding: 40, border: '0.5px dashed var(--bd)' }}>
          <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 8 }}>No group expenses yet</div>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>Create your first one</button>
        </div>
      ) : groups.map(g => {
        const reimbTotal = (g.reimbursements ?? []).reduce((s, r) => s + r.amount, 0)
        const net = g.total_amount - reimbTotal
        return (
          <div key={g.id} style={cardSt}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: 'var(--hi)' }}>
                  {g.date} · {(g.members ?? []).length} people · {formatAmount(g.total_amount, g.currency)} total
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--hi)' }}>Your net cost</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(net, g.currency)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 8 }}>Members</div>
                {(g.members ?? []).map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--bd)', fontSize: 12 }}>
                    <span style={{ color: 'var(--mu)' }}>{m.name}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmount(m.share_amount, g.currency)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 8 }}>Reimbursements received</div>
                {(g.reimbursements ?? []).length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--hi)', padding: '6px 0' }}>None yet</div>
                ) : (g.reimbursements ?? []).map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--bd)', fontSize: 12 }}>
                    <span style={{ color: 'var(--mu)' }}>{r.from_name}</span>
                    <span style={{ color: 'var(--grn)', fontVariantNumeric: 'tabular-nums' }}>+{formatAmount(r.amount, g.currency)}</span>
                  </div>
                ))}
                {(g.reimbursements ?? []).length > 0 && (
                  <div style={{ padding: '6px 0', fontSize: 11, color: 'var(--hi)' }}>
                    Total: <span style={{ color: 'var(--grn)', fontWeight: 500 }}>+{formatAmount(reimbTotal, g.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ fontSize: 11, color: 'var(--red)', border: '0.5px solid var(--bd)', background: 'transparent' }} onClick={() => del(g.id)}>
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
