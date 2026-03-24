'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--acc)', marginBottom: 6 }}>Ledger</div>
          <div style={{ fontSize: 13, color: 'var(--mu)' }}>Multi-bank personal finance tracker</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 20 }}>Sign in</div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--hi)', marginBottom: 5 }}>Email</label>
              <input className="inp" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--hi)', marginBottom: 5 }}>Password</label>
              <input className="inp" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, padding: '8px 10px', background: 'var(--red-l)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
            <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--mu)' }}>
            No account? <Link href="/auth/signup">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
