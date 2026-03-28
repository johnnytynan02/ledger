import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
      messages: [{
        role: 'user',
        content: `Categorise these bank transactions. Return ONLY a raw JSON array with no markdown, no explanation. Format: [{"id":"x","category":"groceries","confidence":0.9}]
Valid categories: food_dining, groceries, transport, shopping, entertainment, health, bills, travel, subscriptions, income, transfer, group_expense, uncategorised
Transactions: ${JSON.stringify(
          transactions.map((t: { id: string; description: string; amount: number }) => ({
            id: t.id, desc: t.description, amount: t.amount,
          }))
        )}`
      }]
    })

    // Extract text from any content block that has text
    let raw = ''
    for (const block of msg.content) {
      if (block.type === 'text') { raw = block.text; break }
    }

    if (!raw) {
      return NextResponse.json({ error: 'empty_response' }, { status: 500 })
    }

    const start = raw.indexOf('[')
    const end = raw.lastIndexOf(']')
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: `no_array: ${raw.substring(0, 100)}` }, { status: 500 })
    }

    const results = JSON.parse(raw.slice(start, end + 1))
    if (!Array.isArray(results)) {
      return NextResponse.json({ error: 'not_array' }, { status: 500 })
    }
    return NextResponse.json(results)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
