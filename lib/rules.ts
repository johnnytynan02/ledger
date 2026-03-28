export interface Rule {
  id: string
  user_id: string
  keyword: string
  category: string
  match_count: number
  created_at: string
}

export function extractKeyword(description: string): string {
  return description
    .replace(/[0-9*#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ')
    .substring(0, 40)
    .trim()
}

export function matchesRule(description: string, keyword: string): boolean {
  return description.toLowerCase().includes(keyword.toLowerCase())
}

export function applyRules<T extends { _id: string; description: string; category: string; confidence: number; reviewed: boolean }>(
  transactions: T[],
  rules: Rule[]
): { matched: T[]; unmatched: T[] } {
  const matched: T[] = []
  const unmatched: T[] = []

  for (const txn of transactions) {
    const rule = rules.find(r => matchesRule(txn.description, r.keyword))
    if (rule) {
      matched.push({ ...txn, category: rule.category, confidence: 1, reviewed: true })
    } else {
      unmatched.push(txn)
    }
  }

  return { matched, unmatched }
}

export async function fetchRules(): Promise<Rule[]> {
  try {
    const res = await fetch('/api/rules')
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function saveRule(keyword: string, category: string): Promise<void> {
  try {
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, category }),
    })
  } catch { /* silently fail */ }
}

export async function deleteRule(id: string): Promise<void> {
  await fetch('/api/rules', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}
