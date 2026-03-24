import { createClient } from '@/lib/supabase/server'
import { fetchFxRates } from '@/lib/fx'
import DashboardClient from './DashboardClient'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const month = searchParams.month ?? currentMonth()
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  const base = profile?.base_currency ?? 'GBP'

  // Fetch current month + previous 5 for trend
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
    />
  )
}
