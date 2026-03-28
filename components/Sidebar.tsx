'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

const NAV = [
  { href: '/dashboard',              label: 'Dashboard'       },
  { href: '/dashboard/transactions', label: 'Transactions'    },
  { href: '/dashboard/upload',       label: 'Upload CSV'      },
  { href: '/dashboard/budgets',      label: 'Budgets'         },
  { href: '/dashboard/groups',       label: 'Group expenses'  },
  { href: '/dashboard/insights',     label: 'Insights'        },
  { href: '/dashboard/rules',        label: 'Your rules'      },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside style={{ width: 200, background: 'var(--surf)', borderRight: '0.5px solid var(--bd)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '20px 18px 16px', borderBottom: '0.5px solid var(--bd)' }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--acc)', letterSpacing: '-.3px' }}>Ledger</div>
        <div style={{ fontSize: 11, color: 'var(--hi)', marginTop: 2 }}>{profile?.full_name ?? profile?.email ?? 'Personal finance'}</div>
      </div>
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {NAV.map(({ href, label }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <a key={href} href={href} style={{ display: 'block', padding: '9px 18px', fontSize: 13, fontWeight: active ? 500 : 400, color: active ? 'var(--acc)' : 'var(--mu)', background: active ? 'var(--acc-l)' : 'transparent', borderLeft: `2px solid ${active ? 'var(--acc)' : 'transparent'}`, transition: 'all .12s', textDecoration: 'none' }}>
              {label}
            </a>
          )
        })}
      </nav>
      <div style={{ padding: '12px 18px', borderTop: '0.5px solid var(--bd)' }}>
        <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.email}</div>
        <button onClick={signOut} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', fontSize: 12, color: 'var(--mu)', cursor: 'pointer', padding: '4px 0' }}>Sign out →</button>
      </div>
    </aside>
  )
}
