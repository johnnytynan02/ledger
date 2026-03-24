import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ledger – Personal Finance Tracker',
  description: 'Multi-bank spend tracking, AI categorisation, group expenses & forecasting',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
