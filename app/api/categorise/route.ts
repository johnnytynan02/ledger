import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a bank transaction categoriser. Return ONLY a JSON array like: [{"id":"1","category":"groceries","confidence":0.95}]. No markdown, no explanation.

Valid categories: food_dining, groceries, transport, shopping, entertainment, health, bills, travel, subscriptions, income, transfer, group_expense, uncategorised`

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { transactions } = await req.json()
  if (!transactions?.length) return NextResponse.json([])

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Categorise these and return a JSON array only: ${JSON.stringify(
          transactions.map((t: { id: string; description: string; amount: number; currency: string }) => ({
            id: t.id, desc: t.description, amount: t.amount,
          }))
        )}`
      }]
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    console.log('AI raw response:', text.substring(0, 200))

    const arrayMatch = text.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/)
    if (!arrayMatch) {
      console.log('No array found in response')
      return NextResponse.json({ error: 'no_array', raw: text.substring(0, 200) }, { status: 500 })
    }

    const results = JSON.parse(arrayMatch[0])
    if (!Array.isArray(results)) return NextResponse.json({ error: 'not_array' }, { status: 500 })
    return NextResponse.json(results)

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('AI error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
