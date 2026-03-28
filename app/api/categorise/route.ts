import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function categoriseBatch(batch: { id: string; desc: string; amount: number }[]) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Categorise these bank transactions. Return ONLY a raw JSON array, no markdown.
Format: [{"id":"x","category":"groceries","confidence":0.9}]
Categories: food_dining, groceries, transport, shopping, entertainment, health, bills, travel, subscriptions, income, transfer, group_expense, uncategorised
Transactions: ${JSON.stringify(batch)}`
    }]
  })

  let raw = ''
  for (const block of msg.content) {
    if (block.type === 'text') { raw = block.text; break }
  }

  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error(`No array in response: ${raw.substring(0, 80)}`)
  return JSON.parse(raw.slice(start, end + 1))
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const transactions = body.transactions
  if (!transactions?.length) return NextResponse.json([])

  try {
    const mapped = transactions.map((t: { id: string; description: string; amount: number }) => ({
      id: t.id, desc: t.description, amount: t.amount,
    }))

    // Process in batches of 20 to avoid token limits
    const BATCH = 20
    const results: unknown[] = []
    for (let i = 0; i < mapped.length; i += BATCH) {
      const batch = mapped.slice(i, i + BATCH)
      const batchResults = await categoriseBatch(batch)
      results.push(...batchResults)
    }

    return NextResponse.json(results)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
