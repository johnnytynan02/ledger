import type { ParsedTransaction, BankId } from '@/lib/types'

function safeFloat(s: string | undefined): number {
  const n = parseFloat((s ?? '').replace(/[,\s]/g, ''))
  return isNaN(n) ? 0 : n
}

function isoDate(raw: string | undefined): string {
  if (!raw) return ''
  const ddmm = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2,'0')}-${ddmm[1].padStart(2,'0')}`
  return raw.split('T')[0].split(' ')[0]
}

const base = (account: BankId) => (): Omit<ParsedTransaction,'date'|'description'|'amount'|'currency'> => ({
  account, category: 'uncategorised', confidence: 0, reviewed: false,
})

export function parseRevolut(rows: string[][]): ParsedTransaction[] {
  const b = base('revolut')()
  return rows.slice(1).filter(r => r.length > 5 && r[8]?.toLowerCase() === 'completed').map(r => ({
    ...b,
    date: isoDate(r[3] || r[2]),
    description: r[4] ?? '',
    amount: safeFloat(r[5]),
    currency: r[7] ?? 'GBP',
  })).filter(t => t.date && t.description)
}

export function parseWise(rows: string[][]): ParsedTransaction[] {
  const b = base('wise')()
  return rows.slice(1).filter(r => r.length > 3).map(r => ({
    ...b,
    date: isoDate(r[1]),
    description: r[4] || r[10] || r[11] || '',
    amount: safeFloat(r[2]),
    currency: r[3] ?? 'GBP',
  })).filter(t => t.date && t.description)
}

export function parseLloyds(rows: string[][]): ParsedTransaction[] {
  const b = base('lloyds')()
  return rows.slice(1).filter(r => r.length > 5).map(r => {
    const debit = safeFloat(r[5])
    const credit = safeFloat(r[6])
    return { ...b, date: isoDate(r[0]), description: r[4] ?? '', amount: credit > 0 ? credit : -debit, currency: 'GBP' }
  }).filter(t => t.date && t.description)
}

export function parseASB(rows: string[][]): ParsedTransaction[] {
  const b = base('asb')()
  return rows.slice(1).filter(r => r.length > 5).map(r => ({
    ...b, date: isoDate(r[0]), description: r[4] || r[5] || '', amount: safeFloat(r[6]), currency: 'NZD',
  })).filter(t => t.date && t.description)
}

export function parseMonzo(rows: string[][]): ParsedTransaction[] {
  const b = base('monzo')()
  return rows.slice(1).filter(r => r.length > 7).map(r => ({
    ...b, date: isoDate(r[1]), description: r[4] || r[14] || '', amount: safeFloat(r[7]) / 100, currency: r[8] ?? 'GBP',
  })).filter(t => t.date && t.description)
}

// Starling: Date, Counter Party, Reference, Type, Amount (GBP), Balance (GBP), Spending Category, Notes
export function parseStarling(rows: string[][]): ParsedTransaction[] {
  const b = base('starling')()
  return rows.slice(1).filter(r => r.length > 4).map(r => ({
    ...b,
    date: isoDate(r[0]),
    description: [r[1], r[2]].filter(Boolean).join(' – '),
    amount: safeFloat(r[4]),
    currency: 'GBP',
  })).filter(t => t.date && t.description)
}

export const PARSERS: Record<string, (rows: string[][]) => ParsedTransaction[]> = {
  revolut:  parseRevolut,
  wise:     parseWise,
  lloyds:   parseLloyds,
  asb:      parseASB,
  monzo:    parseMonzo,
  starling: parseStarling,
}

export function parseBank(bankId: string, rows: string[][]): ParsedTransaction[] {
  const parser = PARSERS[bankId]
  if (!parser) throw new Error(`No parser for bank: ${bankId}`)
  return parser(rows)
}
