'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: username } },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/')
    router.refresh()
  }

  async function handleOAuth(provider: 'google' | 'discord') {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <rect x="2" y="2" width="44" height="44" rx="13" fill="currentColor" opacity=".9"/>
            <circle cx="24" cy="24" r="11.5" fill="none" stroke="#0c0c0f" strokeWidth="3.4"/>
            <circle cx="24" cy="24" r="4" fill="#0c0c0f"/>
          </svg>
          TRACK<span style={{ color: 'var(--text)' }}>ER</span>
        </div>
        <div className="auth-title">Create account</div>
        <div className="auth-sub">Start tracking your games</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: 12 }}>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="yourname"
              required
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-actions" style={{ marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </div>
        </form>

        <div className="auth-divider">or</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="oauth-btn oauth-google" onClick={() => handleOAuth('google')}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C36.9 40.1 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
            Continue with Google
          </button>
          <button className="oauth-btn oauth-discord" onClick={() => handleOAuth('discord')}>
            <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/>
            </svg>
            Continue with Discord
          </button>
        </div>

        <div className="auth-link">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
