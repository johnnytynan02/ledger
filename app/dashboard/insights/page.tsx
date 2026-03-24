'use client'
import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import MonthPicker from '@/components/MonthPicker'
import { getCategory, CATEGORIES, formatAmount, MONTHS, CURRENCY_SYMBOLS } from '@/lib/categories'
import type { Transaction, FxRates } from '@/lib/types'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const ttStyle = { background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 8, fontSize: 12, color: 'var(--tx)' }

const SPEND_CATS = CATEGORIES.filter(c => !['income', 'transfer', 'uncategorised'].includes(c.id))

export default function InsightsPage({ searchParams }: { searchParams: { month?: string } }) {
  const month = searchParams.month ?? currentMonth()
  const [txns, setTxns] = useState<Transaction[]>([])
  const [rates, setRates] = useState<FxRates>({ GBP: 1 })
  const [base] = useState('GBP')
  const sym = CURRENCY_SYMBOLS[base] ?? ''

  const load = useCallback(async () => {
    const [txnRes, fxRes] = await Promise.all([
      // Load last 6 months
      fetch(`/api/transactions?limit=2000`),
      fetch('/api/fx?base=GBP'),
    ])
    const [txnData, fxData] = await Promise.all([txnRes.json(), fxRes.json()])
    setTxns(Array.isArray(txnData) ? txnData : [])
    if (fxData.rates) {
      const r: FxRates = { GBP: 1 }
      Object.entries(fxData.rates as Record<string, number>).forEach(([k, v]) => { r[k] = 1 / v })
      setRates(r)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const cv = (amount: number, ccy: string) => ccy === base ? amount : amount * (rates[ccy] ?? 1)
  const fmt = (n: number) => formatAmount(n, base)

  const [y, m] = month.split('-').map(Number)

  // Build monthly stats for last 6 months
  const months6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const monthlyStats = months6.map(mo => {
    const [my, mm] = mo.split('-').map(Number)
    const mTxns = txns.filter(t => { const [ty, tm] = t.date.split('-').map(Number); return ty === my && tm === mm })
    const income = mTxns.filter(t => t.category === 'income').reduce((s, t) => s + cv(t.amount, t.currency), 0)
    const spend = mTxns.filter(t => t.category !== 'income' && t.category !== 'transfer' && cv(t.amount, t.currency) < 0)
      .reduce((s, t) => s + Math.abs(cv(t.amount, t.currency)), 0)
    return { month: MONTHS[mm - 1], income: parseFloat(income.toFixed(0)), spend: parseFloat(spend.toFixed(0)), saved: parseFloat((income - spend).toFixed(0)) }
  })

  // Category breakdown per month
  const catBreakdown = months6.map(mo => {
    const [my, mm] = mo.split('-').map(Number)
    const mTxns = txns.filter(t => {
      const [ty, tm] = t.date.split('-').map(Number)
      return ty === my && tm === mm && t.category !== 'income' && t.category !== 'transfer' && cv(t.amount, t.currency) < 0
    })
    const row: Record<string, number | string> = { month: MONTHS[mm - 1] }
    SPEND_CATS.forEach(c => {
      row[c.id] = parseFloat(mTxns.filter(t => t.category === c.id).reduce((s, t) => s + Math.abs(cv(t.amount, t.currency)), 0).toFixed(0))
    })
    return row
  })

  // Current month stats for forecast
  const curMonthTxns = txns.filter(t => { const [ty, tm] = t.date.split('-').map(Number); return ty === y && tm === m })
  const curIncome = curMonthTxns.filter(t => t.category === 'income').reduce((s, t) => s + cv(t.amount, t.currency), 0)
  const curSpend = curMonthTxns.filter(t => t.category !== 'income' && t.category !== 'transfer' && cv(t.amount, t.currency) < 0).reduce((s, t) => s + Math.abs(cv(t.amount, t.currency)), 0)
  const curSavings = curIncome - curSpend
  const savingsRate = curIncome > 0 ? ((curSavings / curIncome) * 100).toFixed(1) : '0'

  // Savings opportunities — compare to simple averages
  const catAvg: Record<string, number> = {}
  SPEND_CATS.forEach(c => {
    const vals = months6.map(mo => {
      const [my, mm] = mo.split('-').map(Number)
      return txns.filter(t => { const [ty, tm] = t.date.split('-').map(Number); return ty === my && tm === mm && t.category === c.id && cv(t.amount, t.currency) < 0 }).reduce((s, t) => s + Math.abs(cv(t.amount, t.currency)), 0)
    }).filter(v => v > 0)
    catAvg[c.id] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
  })

  const opportunities = [
    { id: 'food_dining', tip: 'Consider cooking more at home — food delivery apps add up quickly.' },
    { id: 'subscriptions', tip: 'Review recurring subscriptions and cancel unused ones.' },
    { id: 'shopping', tip: 'Try a 48-hour rule before non-essential purchases.' },
    { id: 'entertainment', tip: 'Look for free or discounted activities in your city.' },
  ].map(o => ({
    ...o,
    avg: catAvg[o.id] ?? 0,
    label: getCategory(o.id).label,
    color: getCategory(o.id).color,
    saving: Math.round((catAvg[o.id] ?? 0) * 0.25 * 12),
  })).filter(o => o.avg > 20)

  const cardSt: React.CSSProperties = { background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '16px 20px' }

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Insights</h1>
      <p style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 16 }}>Financial analysis & savings forecasting based on your transaction history</p>

      <MonthPicker selected={month} />

      {/* Forecast + opportunities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={cardSt}>
          <div style={{ fontSize: 12, color: 'var(--hi)', marginBottom: 14 }}>12-month forecast</div>
          <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 12 }}>Based on {MONTHS[m - 1]} patterns</div>
          {[
            { label: 'Projected annual income', val: curIncome * 12, color: 'var(--grn)' },
            { label: 'Projected annual spend',  val: curSpend * 12,  color: 'var(--red)' },
            { label: 'Projected savings',        val: curSavings * 12, color: curSavings >= 0 ? 'var(--grn)' : 'var(--red)' },
          ].map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid var(--bd)' }}>
              <div style={{ fontSize: 12, color: 'var(--mu)' }}>{it.label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: it.color, fontVariantNumeric: 'tabular-nums' }}>{fmt(it.val)}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0' }}>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Savings rate</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--acc)', fontVariantNumeric: 'tabular-nums' }}>{savingsRate}%</div>
          </div>
        </div>

        <div style={cardSt}>
          <div style={{ fontSize: 12, color: 'var(--hi)', marginBottom: 14 }}>Savings opportunities</div>
          {opportunities.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--mu)', padding: '20px 0' }}>Upload more transactions to see personalised insights.</div>
          ) : opportunities.map((o, i) => (
            <div key={i} style={{ padding: '9px 0', borderBottom: i < opportunities.length - 1 ? '0.5px solid var(--bd)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{o.label}</span>
                {o.saving > 0 && (
                  <span style={{ background: 'var(--grn-l)', color: 'var(--grn)', padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>
                    Save {fmt(o.saving)}/yr
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--hi)' }}>{o.tip}</div>
              <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>Avg spend: {fmt(o.avg)}/mo · 25% reduction = {fmt(o.saving / 12)}/mo</div>
            </div>
          ))}
        </div>
      </div>

      {/* Income vs spend trend */}
      <div style={{ ...cardSt, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--hi)', marginBottom: 14 }}>Income vs spend — last 6 months</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--hi)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--hi)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} />
            <Tooltip formatter={(v: number, n: string) => [fmt(v), n.charAt(0).toUpperCase() + n.slice(1)]} contentStyle={ttStyle} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="income" stroke="var(--grn)" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="spend"  stroke="var(--red)"  strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="saved"  stroke="var(--acc)"  strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      <div style={cardSt}>
        <div style={{ fontSize: 12, color: 'var(--hi)', marginBottom: 14 }}>Category breakdown — last 6 months</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={catBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--hi)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--hi)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} />
            <Tooltip formatter={(v: number, n: string) => [fmt(v), getCategory(n)?.label ?? n]} contentStyle={ttStyle} />
            {SPEND_CATS.slice(0, 8).map(c => (
              <Bar key={c.id} dataKey={c.id} stackId="a" fill={c.color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
