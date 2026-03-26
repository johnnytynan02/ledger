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

const base = (account: string) => ({ account, category: 'uncategorised', confidence: 0, reviewed: false })

export function parseRevolut(rows: string[][]): ParsedTransaction[] {
  return rows.slice(1).filter(r => r.length > 5 && r[8]?.toLowerCase() === 'completed').map(r => ({
    ...base('revolut'), date: isoDate(r[3] || r[2]), description: r[4] ?? '', amount: safeFloat(r[5]), currency: r[7] ?? 'GBP',
  })).filter(t => t.date && t.description)
}

export function parseWise(rows: string[][]): ParsedTransaction[] {
  return rows.slice(1).filter(r => r.length > 3).map(r => ({
    ...base('wise'), date: isoDate(r[1]), description: r[4] || r[10] || r[11] || '', amount: safeFloat(r[2]), currency: r[3] ?? 'GBP',
  })).filter(t => t.date && t.description)
}

export function parseLloyds(rows: string[][]): ParsedTransaction[] {
  return rows.slice(1).filter(r => r.length > 5).map(r => {
    const debit = safeFloat(r[5]), credit = safeFloat(r[6])
    return { ...base('lloyds'), date: isoDate(r[0]), description: r[4] ?? '', amount: credit > 0 ? credit : -debit, currency: 'GBP' }
  }).filter(t => t.date && t.description)
}

export function parseASB(rows: string[][]): ParsedTransaction[] {
  return rows.slice(1).filter(r => r.length > 5).map(r => ({
    ...base('asb'), date: isoDate(r[0]), description: r[4] || r[5] || '', amount: safeFloat(r[6]), currency: 'NZD',
  })).filter(t => t.date && t.description)
}

export function parseMonzo(rows: string[][]): ParsedTransaction[] {
  return rows.slice(1).filter(r => r.length > 7).map(r => ({
    ...base('monzo'), date: isoDate(r[1]), description: r[4] || r[14] || '', amount: safeFloat(r[7]) / 100, currency: r[8] ?? 'GBP',
  })).filter(t => t.date && t.description)
}

export function parseStarling(rows: string[][]): ParsedTransaction[] {
  return rows.slice(1).filter(r => r.length > 4).map(r => ({
    ...base('starling'), date: isoDate(r[0]), description: [r[1], r[2]].filter(Boolean).join(' – '), amount: safeFloat(r[4]), currency: 'GBP',
  })).filter(t => t.date && t.description)
}

// Generic parser — uses column mapping provided by user
export function parseGeneric(rows: string[][], mapping: { date: number; description: number; amount: number; currency: number; creditCol?: number; bankName?: string }): ParsedTransaction[] {
  const accountName = mapping.bankName || 'other'
  return rows.slice(1).filter(r => r.length > 1).map(r => {
    let amount = safeFloat(r[mapping.amount])
    // If separate credit column, subtract debit and add credit
    if (mapping.creditCol !== undefined) {
      const credit = safeFloat(r[mapping.creditCol])
      const debit = safeFloat(r[mapping.amount])
      amount = credit > 0 ? credit : -debit
    }
    return {
      ...base(accountName),
      date: isoDate(r[mapping.date]),
      description: r[mapping.description] ?? '',
      amount,
      currency: mapping.currency >= 0 ? (r[mapping.currency] || 'GBP') : 'GBP',
    }
  }).filter(t => t.date && t.description)
}

export const PARSERS: Record<string, (rows: string[][]) => ParsedTransaction[]> = {
  revolut: parseRevolut,
  wise: parseWise,
  lloyds: parseLloyds,
  asb: parseASB,
  monzo: parseMonzo,
  starling: parseStarling,
}

export function parseBank(bankId: string, rows: string[][], genericMapping?: Parameters<typeof parseGeneric>[1]): ParsedTransaction[] {
  if (bankId === 'other' && genericMapping) return parseGeneric(rows, genericMapping)
  const parser = PARSERS[bankId]
  if (!parser) throw new Error(`No parser for bank: ${bankId}`)
  return parser(rows)
}

export function getHeaders(rows: string[][]): string[] {
  return rows[0] ?? []
}
