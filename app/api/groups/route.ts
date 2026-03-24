import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('group_expenses')
    .select(`*, members:group_members(*), reimbursements(*)`)
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, total_amount, currency, date, notes, members, reimbursements } = await req.json()

  const { data: group, error: gErr } = await supabase
    .from('group_expenses')
    .insert({ user_id: user.id, name, total_amount, currency: currency ?? 'GBP', date, notes })
    .select()
    .single()

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 })

  if (members?.length) {
    await supabase.from('group_members').insert(
      members.map((m: { name: string; share_amount: number }) => ({ group_id: group.id, ...m }))
    )
  }
  if (reimbursements?.length) {
    await supabase.from('reimbursements').insert(
      reimbursements.map((r: { from_name: string; amount: number; date?: string }) => ({ group_id: group.id, ...r }))
    )
  }

  return NextResponse.json(group)
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabase
    .from('group_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
