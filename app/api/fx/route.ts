import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const base = req.nextUrl.searchParams.get('base') ?? 'GBP'
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`)
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' }
    })
  } catch {
    return NextResponse.json({ error: 'FX fetch failed' }, { status: 502 })
  }
}
