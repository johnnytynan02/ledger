'use client'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from 'recharts'
import MonthPicker from '@/components/MonthPicker'
import CategoryBadge from '@/components/CategoryBadge'
import { getCategory, MONTHS, formatAmount, CURRENCY_SYMBOLS } from '@/lib/categories'
import type { Transaction, Budget, FxRates } from '@/lib/types'

interface Props {
  transactions: Transaction[]
  budgets: Budget[]
  rates: FxRates
  base: string
  selectedMonth: string
  needsReviewCount: number
}

const ttStyle = {
  background: 'var(--card)', border: '0.5px solid var(--bd)',
  borderRadius: 8, fontSize: 12, color: 'var(--tx)',
}

export default function DashboardClient({ transactions, budgets, rates, base, selectedMonth, needsReviewCount }: Props) {
  const sym = CURRENCY_SYMBOLS[base] ?? ''
  const cv = (amount: number, ccy: string) => ccy === base ? amount : amount * (rates[ccy] ?? 1)
  const fmt = (n: number) => formatAmount(n, base)

  const [y, m] = selectedMonth.split('-').map(Number)
  const inMonth = (t: Transaction) => {
    const [ty, tm] = t.date.split('-').map(Number)
    return ty === y && tm === m
  }

  const mTxns = transactions.filter(t => inMonth(t) && t.category !== 'transfer')
  const expenses = mTxns.filter(t => t.category !== 'income' && cv(t.amount, t.currency) < 0)
  const income = mTxns.filter(t => t.category === 'income')
  const totalInc = income.reduce((s, t) => s + cv(t.amount, t.currency), 0)
  const totalSpend = expenses.reduce((s, t) => s + Math.abs(cv(t.amount, t.currency)), 0)
  const saved = totalInc - totalSpend
  const rate = totalInc > 0 ? ((saved / totalInc) * 100).toFixed(0) : '0'

  // Category spend for pie
  const catMap: Record<string, number> = {}
  expenses.forEach(t => {
    catMap[t.category] = (catMap[t.category] ?? 0) + Math.abs(cv(t.amount, t.currency))
  })
  const catData = Object.entries(catMap)
    .map(([id, value]) => ({ ...getCategory(id), value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)

  // Trend — last 6 months
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1)
    const ty = d.getFullYear(), tm = d.getMonth() + 1
    const spend = transactions
      .filter(t => {
        const [ry, rm] = t.date.split('-').map(Number)
        return ry === ty && rm === tm && t.category !== 'transfer' && t.category !== 'income' && cv(t.amount, t.currency) < 0
      })
      .reduce((s, t) => s + Math.abs(cv(t.amount, t.currency)), 0)
    return { month: MONTHS[tm - 1], spend: parseFloat(spend.toFixed(0)) }
  })

  const needsReview = transactions.filter(t => inMonth(t) && !t.reviewed && t.category !== 'transfer')

  const cardSt: React.CSSProperties = {
    background: 'var(--card)', border: '0.5px solid var(--bd)',
    borderRadius: 'var(--radius)', padding: '16px 20px',
  }

  const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div style={{ ...cardSt, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>
        {value}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500 }}>Dashboard</h1>
        <p style={{ fontSize: 12, color: 'var(--mu)', marginTop: 3 }}>
          {MONTHS[m - 1]} {y} · live FX · base {base}
        </p>
      </div>

      <div style={{ margin: '16px 0' }}>
        <MonthPicker selected={selectedMonth} />
      </div>

      {needsReviewCount > 0 && (
        <div style={{
          background: 'var(--acc-l)', border: '0.5px solid rgba(186,117,23,.3)',
          borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--acc)' }}>
            {needsReviewCount} transaction{needsReviewCount > 1 ? 's' : ''} need review
          </span>
          <a href="/dashboard/transactions" style={{ fontSize: 12, fontWeight: 500, color: 'var(--acc)' }}>
            Review →
          </a>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <StatCard label="Income" value={fmt(totalInc)} color="var(--grn)" />
        <StatCard label="Spend" value={fmt(totalSpend)} color="var(--red)" />
        <StatCard label="Saved" value={fmt(saved)} color={saved >= 0 ? 'var(--grn)' : 'var(--red)'} />
        <StatCard label="Savings rate" value={`${rate}%`} color="var(--acc)" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Pie */}
        <div style={{ ...cardSt, flex: 1, minWidth: 300 }}>
          <div style={{ fontSize: 12, color: 'var(--hi)', marginBottom: 12 }}>Spend by category</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={38} outerRadius={68} dataKey="value" paddingAngle={2}>
                  {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={ttStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {catData.slice(0, 7).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '0.5px solid var(--bd)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 1, background: c.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--mu)' }}>{c.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend */}
        <div style={{ ...cardSt, flex: 1.3, minWidth: 320 }}>
          <div style={{ fontSize: 12, color: 'var(--hi)', marginBottom: 12 }}>6-month spend trend</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--acc)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--acc)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--hi)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--hi)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} />
              <Tooltip formatter={(v: number) => [fmt(v), 'Spend']} contentStyle={ttStyle} />
              <Area type="monotone" dataKey="spend" stroke="var(--acc)" strokeWidth={1.5} fill="url(#sg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent needs-review */}
      {needsReview.length > 0 && (
        <div style={cardSt}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--acc)' }}>Needs review ({needsReview.length})</div>
            <a href="/dashboard/transactions" style={{ fontSize: 12, color: 'var(--acc)' }}>Review all →</a>
          </div>
          {needsReview.slice(0, 5).map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--bd)' }}>
              <div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>{t.description}</div>
                <div style={{ fontSize: 11, color: 'var(--hi)' }}>{t.date} · {t.account}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <CategoryBadge category={t.category} />
                <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: t.amount > 0 ? 'var(--grn)' : 'var(--tx)' }}>
                  {t.amount > 0 ? '+' : ''}{fmt(Math.abs(cv(t.amount, t.currency)))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
