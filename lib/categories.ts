import type { CategoryDefinition, BankDefinition } from './types'

export const CATEGORIES: CategoryDefinition[] = [
  { id: 'food_dining',    label: 'Food & dining',       color: '#BA7517' },
  { id: 'groceries',      label: 'Groceries',           color: '#3B6D11' },
  { id: 'transport',      label: 'Transport',           color: '#185FA5' },
  { id: 'shopping',       label: 'Shopping',            color: '#534AB7' },
  { id: 'entertainment',  label: 'Entertainment',       color: '#993556' },
  { id: 'health',         label: 'Health & fitness',    color: '#0F6E56' },
  { id: 'bills',          label: 'Bills & utilities',   color: '#A32D2D' },
  { id: 'travel',         label: 'Travel',              color: '#0C5F80' },
  { id: 'subscriptions',  label: 'Subscriptions',       color: '#6B4AB7' },
  { id: 'income',         label: 'Income',              color: '#27500A' },
  { id: 'transfer',       label: 'Transfer (ignored)',  color: '#888780' },
  { id: 'group_expense',  label: 'Group expense',       color: '#854F0B' },
  { id: 'misc',           label: 'Misc',                color: '#7B6F72' },
  { id: 'uncategorised',  label: 'Uncategorised',       color: '#5F5E5A' },
]

const CUSTOM_KEY = 'ledger_custom_categories'

export function getCustomCategories(): CategoryDefinition[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]') }
  catch { return [] }
}

export function saveCustomCategory(cat: CategoryDefinition) {
  if (typeof window === 'undefined') return
  const existing = getCustomCategories()
  const updated = [...existing.filter(c => c.id !== cat.id), cat]
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated))
}

export function deleteCustomCategory(id: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(getCustomCategories().filter(c => c.id !== id)))
}

export function getAllCategories(): CategoryDefinition[] {
  return [...CATEGORIES, ...getCustomCategories()]
}

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<string, CategoryDefinition>

export const getCategory = (id: string): CategoryDefinition => {
  if (typeof window !== 'undefined') {
    const custom = getCustomCategories().find(c => c.id === id)
    if (custom) return custom
  }
  return CATEGORY_MAP[id] ?? CATEGORY_MAP['uncategorised']
}

export const BANKS: BankDefinition[] = [
  { id: 'revolut',  label: 'Revolut',        hint: 'Account > Statements > CSV',   currencies: ['GBP','EUR','USD','NZD'] },
  { id: 'wise',     label: 'Wise',           hint: 'Statements > Download CSV',    currencies: ['GBP','EUR','USD','NZD'] },
  { id: 'lloyds',   label: 'Lloyds Bank',    hint: 'Transactions > Export',        currencies: ['GBP'] },
  { id: 'asb',      label: 'ASB Bank (NZD)', hint: 'My accounts > Export',         currencies: ['NZD'] },
  { id: 'monzo',    label: 'Monzo',          hint: 'Transaction history > Export', currencies: ['GBP'] },
  { id: 'starling', label: 'Starling Bank',  hint: 'Spaces > Download CSV',        currencies: ['GBP'] },
  { id: 'other',    label: 'Other bank',     hint: 'Map your own CSV columns',     currencies: ['GBP','EUR','USD','NZD','AUD'] },
]

export const CURRENCIES = ['GBP', 'USD', 'EUR', 'NZD', 'AUD']

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', NZD: 'NZ$', AUD: 'A$',
}

export const formatAmount = (amount: number, currency = 'GBP'): string => {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + ' '
  return `${sym}${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export const DEFAULT_BUDGETS: Record<string, number> = {
  food_dining: 200, groceries: 300, transport: 100, shopping: 200,
  entertainment: 80, health: 60, bills: 200, travel: 300, subscriptions: 50,
}

export const CATEGORY_COLORS = [
  '#BA7517','#3B6D11','#185FA5','#534AB7','#993556',
  '#0F6E56','#A32D2D','#0C5F80','#6B4AB7','#854F0B',
  '#2E7D8C','#7B3F00','#1B5E20','#4A148C','#B71C1C',
]
