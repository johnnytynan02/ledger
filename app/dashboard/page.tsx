import { createClient } from '@/lib/supabase/server'
import { fetchFxRates } from '@/lib/fx'
import DashboardClient from './DashboardClient'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  const base = profile?.base_currency ?? 'GBP'

  const { data: allTxns } = await supabase
    .from('transactions')
    .select('date')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  const availableMonths = allTxns && allTxns.length > 0
    ? [...new Set(allTxns.map(t => t.date.substring(0, 7)))].sort((a, b) => b.localeCompare(a))
    : []

  const defaultMonth = availableMonths[0] ?? (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  const month = searchParams.month ?? defaultMonth
  const [y, m] = month.split('-').map(Number)
  const trendStart = new Date(y, m - 6, 1).toISOString().split('T')[0]
  const monthEnd = new Date(y, m, 0).toISOString().split('T')[0]

  const [{ data: txns }, { data: budgets }, rates] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user!.id)
      .gte('date', trendStart).lte('date', monthEnd).order('date', { ascending: false }),
    supabase.from('budgets').select('*').eq('user_id', user!.id),
    fetchFxRates(base),
  ])

  const needsReview = (txns ?? []).filter(t => !t.reviewed && t.category !== 'transfer')

  return (
    <DashboardClient
      transactions={txns ?? []}
      budgets={budgets ?? []}
      rates={rates}
      base={base}
      selectedMonth={month}
      needsReviewCount={needsReview.length}
      availableMonths={availableMonths}
    />
  )
}
