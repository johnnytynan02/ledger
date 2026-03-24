import type { FxRates } from './types'

const FALLBACK: FxRates = { GBP: 1, USD: 0.79, EUR: 0.85, NZD: 0.495, AUD: 0.50 }

export async function fetchFxRates(base = 'GBP'): Promise<FxRates> {
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${base}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return FALLBACK
    const data = await res.json()
    // data.rates gives amount of each currency per 1 GBP
    // We want: how many GBP = 1 foreign unit → invert
    const rates: FxRates = { [base]: 1 }
    for (const [ccy, rate] of Object.entries(data.rates as Record<string, number>)) {
      rates[ccy] = 1 / rate
    }
    return rates
  } catch {
    return FALLBACK
  }
}

export function makeConverter(rates: FxRates, base: string) {
  return function convert(amount: number, currency: string): number {
    if (currency === base) return amount
    return amount * (rates[currency] ?? 1)
  }
}
