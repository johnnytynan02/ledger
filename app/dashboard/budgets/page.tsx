'use client'
import { useState, useEffect, useCallback } from 'react'
import MonthPicker from '@/components/MonthPicker'
import { CATEGORIES, DEFAULT_BUDGETS, formatAmount } from '@/lib/categories'
import type { Transaction, Budget, FxRates } from '@/lib/types'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const EXPENSE_CATS = CATEGORIES.filter(c => !['income', 'transfer', 'group_expense', 'uncategorised'].includes(c.id))

export default function BudgetsPage({ searchParams }: { searchParams: { month?: string } }) {
  const month = searchParams.month ?? currentMonth()
  const [txns, setTxns] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS)
  const [rates, setRates] = useState<FxRates>({ GBP: 1 })
  const [base, setBase] = useState('GBP')
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [txnRes, budRes, fxRes] = await Promise.all([
      fetch(`/api/transactions?month=${month}`),
      fetch('/api/budgets'),
      fetch('/api/fx?base=GBP'),
    ])
    const [txnData, budData, fxData] = await Promise.all([txnRes.json(), budRes.json(), fxRes.json()])
    setTxns(Array.isArray(txnData) ? txnData : [])
    if (Array.isArray(budData) && budData.length > 0) {
      const m: Record<string, number> = { ...DEFAULT_BUDGETS }
      budData.forEach((b: Budget) => { m[b.category] = b.amount })
      setBudgets(m)
    }
    if (fxData.rates) {
      const r: FxRates = { GBP: 1 }
      Object.entries(fxData.rates as Record<string, number>).forEach(([k, v]) => { r[k] = 1 / v })
      setRates(r)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  const cv = (amount: number, ccy: string) => ccy === base ? amount : amount * (rates[ccy] ?? 1)

  const saveBudget = async (category: string, amount: number) => {
    setSaving(category)
    await fetch('/api/budgets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, amount }),
    })
    setSaving(null)
  }

  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0)
  const totalSpend = EXPENSE_CATS.reduce((s, c) => {
    return s + txns.filter(t => t.category === c.id && cv(t.amount, t.currency) < 0).reduce((ss, t) => ss + Math.abs(cv(t.amount, t.currency)), 0)
  }, 0)

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Budgets</h1>
      <p style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 16 }}>Monthly targets · click a number to edit</p>

      <MonthPicker selected={month} />

      {/* Overall */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total budget', value: formatAmount(totalBudget, base), color: 'var(--acc)' },
          { label: 'Total spent', value: formatAmount(totalSpend, base), color: totalSpend > totalBudget ? 'var(--red)' : 'var(--tx)' },
          { label: 'Remaining', value: formatAmount(totalBudget - totalSpend, base), color: totalBudget - totalSpend >= 0 ? 'var(--grn)' : 'var(--red)' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {EXPENSE_CATS.map(cat => {
          const budget = budgets[cat.id] ?? 0
          const spent = txns
            .filter(t => t.category === cat.id && cv(t.amount, t.currency) < 0)
            .reduce((s, t) => s + Math.abs(cv(t.amount, t.currency)), 0)
          const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
          const over = spent > budget && budget > 0
          const barColor = over ? 'var(--red)' : pct > 80 ? 'var(--acc)' : cat.color

          return (
            <div key={cat.id} style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 1, background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{cat.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--hi)' }}>
                    {formatAmount(spent, base)} of {formatAmount(budget, base)}
                  </div>
                </div>
                <span style={{
                  background: over ? 'var(--red-l)' : `${cat.color}15`,
                  color: over ? 'var(--red)' : cat.color,
                  padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500,
                }}>
                  {over ? 'Over budget' : budget > 0 ? `${(100 - pct).toFixed(0)}% left` : 'No budget'}
                </span>
              </div>

              <div style={{ height: 3, background: 'var(--bd)', borderRadius: 2, marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: barColor, transition: 'width .4s' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  className="inp"
                  value={budget}
                  min={0}
                  step={10}
                  style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}
                  onChange={e => setBudgets(p => ({ ...p, [cat.id]: parseFloat(e.target.value) || 0 }))}
                  onBlur={e => saveBudget(cat.id, parseFloat(e.target.value) || 0)}
                />
                {saving === cat.id && <span style={{ fontSize: 10, color: 'var(--hi)' }}>Saved</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
