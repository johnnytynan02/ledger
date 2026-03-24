// ── Database row types ───────────────────────────────────────

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  base_currency: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  date: string          // ISO date: '2025-03-22'
  description: string
  amount: number        // positive = credit, negative = debit
  currency: string
  account: string
  category: string
  confidence: number    // 0–1
  reviewed: boolean
  notes: string | null
  group_id: string | null
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  created_at: string
}

export interface GroupExpense {
  id: string
  user_id: string
  name: string
  total_amount: number
  currency: string
  date: string
  notes: string | null
  created_at: string
  members?: GroupMember[]
  reimbursements?: Reimbursement[]
}

export interface GroupMember {
  id: string
  group_id: string
  name: string
  share_amount: number
}

export interface Reimbursement {
  id: string
  group_id: string
  from_name: string
  amount: number
  date: string | null
  transaction_id: string | null
  created_at: string
}

// ── App-level types ───────────────────────────────────────────

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  currency: string
  account: string
  category: string
  confidence: number
  reviewed: boolean
}

export type BankId = 'revolut' | 'wise' | 'lloyds' | 'asb' | 'monzo'

export interface BankDefinition {
  id: BankId
  label: string
  hint: string
  currencies: string[]
}

export interface CategoryDefinition {
  id: string
  label: string
  color: string
  icon?: string
}

export interface FxRates {
  [currency: string]: number   // rate to convert FROM that currency TO base
}

export interface MonthlyStats {
  month: string     // 'YYYY-MM'
  income: number
  spend: number
  saved: number
}

export interface AICategorizationResult {
  id: string
  category: string
  confidence: number
}
