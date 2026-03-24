'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div className="card" style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Check your email</div>
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</div>
        <div style={{ marginTop: 18 }}><Link href="/auth/login">Back to sign in</Link></div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--acc)', marginBottom: 6 }}>Ledger</div>
          <div style={{ fontSize: 13, color: 'var(--mu)' }}>Create your account</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 20 }}>Sign up</div>
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--hi)', marginBottom: 5 }}>Full name</label>
              <input className="inp" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--hi)', marginBottom: 5 }}>Email</label>
              <input className="inp" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--hi)', marginBottom: 5 }}>Password <span style={{ color: 'var(--hi)', fontWeight: 400 }}>(min 8 chars)</span></label>
              <input className="inp" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, padding: '8px 10px', background: 'var(--red-l)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
            <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--mu)' }}>
            Already have one? <Link href="/auth/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
