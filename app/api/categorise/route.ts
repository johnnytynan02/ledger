import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a bank transaction categoriser. Return ONLY a JSON array like this example:
[{"id":"abc","category":"groceries","confidence":0.95},{"id":"def","category":"transport","confidence":0.9}]

No markdown code fences, no explanation, no wrapper object. Just the raw JSON array starting with [ and ending with ].

Valid categories: food_dining, groceries, transport, shopping, entertainment, health, bills, travel, subscriptions, income, transfer, group_expense, uncategorised`

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const transactions = body.transactions
  if (!transactions?.length) return NextResponse.json([])

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Return a JSON array categorising these transactions: ${JSON.stringify(
          transactions.map((t: { id: string; description: string; amount: number }) => ({
            id: t.id,
            desc: t.description,
            amount: t.amount,
          }))
        )}`
      }]
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const cleaned = raw.replace(/^```(?:json)?/, '').replace(/```$/, '').trim()
    const start = cleaned.indexOf('[')
    const end = cleaned.lastIndexOf(']')
    if (start === -1 || end === -1) {
      console.error('No array in response:', raw.substring(0, 200))
      return NextResponse.json({ error: 'no_array', preview: raw.substring(0, 200) }, { status: 500 })
    }

    const results = JSON.parse(cleaned.slice(start, end + 1))
    if (!Array.isArray(results)) {
      return NextResponse.json({ error: 'not_array' }, { status: 500 })
    }

    return NextResponse.json(results)

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('AI categorise error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}