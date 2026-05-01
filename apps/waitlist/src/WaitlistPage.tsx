'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { XLogo } from '@phosphor-icons/react'
import { Button } from '@glass/ui'
import './waitlist-page.css'

export type WaitlistTheme = 'dark' | 'light' | 'holo' | 'foil'

const THEMES: { id: WaitlistTheme; swClass: string; label: string }[] = [
  { id: 'dark', swClass: 'sw-dark', label: 'Dark' },
  { id: 'light', swClass: 'sw-light', label: 'Light' },
  { id: 'holo', swClass: 'sw-holo', label: 'Holo' },
  { id: 'foil', swClass: 'sw-foil', label: 'Foil' },
]

function validEmail(v: string) {
  const t = v.trim()
  return t.length > 0 && t.includes('@')
}

type PostJson = {
  ok?: boolean
  alreadyRegistered?: boolean
  count?: number
  error?: string
}

export function WaitlistPage() {
  const [theme, setTheme] = useState<WaitlistTheme>('dark')
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [duplicate, setDuplicate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [countValue, setCountValue] = useState<number | 'error' | null>(null)
  const emailMainRef = useRef<HTMLInputElement>(null)
  const emailCardRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/waitlist')
      .then(async (r) => {
        if (!r.ok) throw new Error('count')
        return r.json() as Promise<{ count: number }>
      })
      .then(({ count }) => {
        if (!cancelled) setCountValue(count)
      })
      .catch(() => {
        if (!cancelled) setCountValue('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const submit = useCallback(
    async (focusRef: { current: HTMLInputElement | null }) => {
      if (!validEmail(email)) {
        focusRef.current?.focus()
        return
      }
      setError(null)
      setSuccess(false)
      setPending(true)
      try {
        const res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = (await res.json()) as PostJson
        if (res.status === 429) {
          setError('Too many attempts from this network. Please try again in a little while.')
          return
        }
        if (!res.ok) {
          setError('Something went wrong. Please try again.')
          return
        }
        if (typeof data.count === 'number') setCountValue(data.count)
        setDuplicate(!!data.alreadyRegistered)
        setSuccess(true)
        setEmail('')
      } catch {
        setError('Something went wrong. Please try again.')
      } finally {
        setPending(false)
      }
    },
    [email],
  )

  const sceneClass = `scene theme-${theme}`
  const countDisplay = countValue === null ? ' ' : countValue === 'error' ? '-' : countValue
  const successMsg = success
    ? duplicate
      ? "You're already on the list."
      : "You're on the list! We'll be in touch."
    : ' '

  return (
    <>
      <div
        data-testid="waitlist-theme-switcher"
        className="switcher"
        role="toolbar"
        aria-label="Theme"
      >
        {THEMES.map(({ id, swClass, label }) => (
          <button
            data-testid={`waitlist-theme-btn-${id}`}
            key={id}
            type="button"
            className={`sw-btn ${swClass}${theme === id ? ' active' : ''}`}
            data-label={label}
            aria-pressed={theme === id}
            aria-label={`${label} theme`}
            onClick={() => setTheme(id)}
          />
        ))}
      </div>

      <div className={sceneClass}>
        <div className="bg-noise" aria-hidden />
        <div className="bg-glow" aria-hidden />

        <div className="content">
          <span className="wordmark">Glass</span>
          <span className="tagline">Test suite intelligence. Coming soon.</span>

          <form
            data-testid="waitlist-main-form"
            className="form"
            onSubmit={(e) => {
              e.preventDefault()
              void submit(emailMainRef)
            }}
          >
            <label htmlFor="email" className="visually-hidden">
              Email address
            </label>
            <input
              data-testid="waitlist-main-email-input"
              ref={emailMainRef}
              id="email"
              className="input"
              type="email"
              name="email"
              autoComplete="off"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
            {theme === 'dark' ? (
              <Button data-testid="waitlist-main-submit-btn" type="submit" variant="submit" className="btn" disabled={pending}>
                Join waitlist
              </Button>
            ) : theme === 'light' ? (
              <Button data-testid="waitlist-main-submit-btn" type="submit" variant="inverse" className="btn" disabled={pending}>
                Join waitlist
              </Button>
            ) : (
              <button data-testid="waitlist-main-submit-btn" type="submit" className="btn" disabled={pending}>
                Join waitlist
              </button>
            )}
          </form>

          <div
            data-testid="waitlist-main-success-msg"
            id="success-main"
            className={`success${success ? ' show' : ''}`}
            role="status"
            aria-live="polite"
          >
            {successMsg}
          </div>
          {error ? (
            <div data-testid="waitlist-main-error-msg" className="waitlist-error" role="alert">
              {error}
            </div>
          ) : null}
          <div data-testid="waitlist-main-count" className="count" aria-live="polite">
            <span className="count-num">{countDisplay}</span> engineers already waiting
          </div>
          <a
            data-testid="waitlist-main-twitter-link"
            href="https://x.com/glass_qa"
            className={`social-x social-x--${theme}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Glass on X (opens in a new tab)"
          >
            <XLogo size={24} weight="regular" aria-hidden className="social-x-icon" />
          </a>
        </div>

        <div className="holo-card-wrap">
          <div className="holo-card">
            <div className="hc-bg" />
            <div className="hc-stars" />
            <div className="hc-particles" />
            <div className="hc-holo" />
            <div className="hc-shimmer" />
            <div className="hc-scan" />
            <div className="hc-frame" />
            <div className="hc-type">Ultra Rare</div>
            <div className="hc-hp">∞ HP</div>
            <div className="hc-wordmark">Glass</div>
            <div className="hc-serial">001 / 001</div>
            <div className="hc-form-area">
              <div className="hc-tagline">
                Test suite intelligence · Coming soon
              </div>
              <form
                data-testid="waitlist-card-form"
                className="hc-row"
                onSubmit={(e) => {
                  e.preventDefault()
                  void submit(emailCardRef)
                }}
              >
                <label htmlFor="hc-email" className="visually-hidden">
                  Email address
                </label>
                <input
                  data-testid="waitlist-card-email-input"
                  ref={emailCardRef}
                  id="hc-email"
                  className="hc-input"
                  type="email"
                  name="email"
                  autoComplete="off"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                />
                <button data-testid="waitlist-card-submit-btn" type="submit" className="hc-btn" disabled={pending}>
                  Join waitlist
                </button>
              </form>
              <div
                data-testid="waitlist-card-success-msg"
                id="success-card"
                className={`hc-success${success ? ' show' : ''}`}
                role="status"
                aria-live="polite"
              >
                {successMsg}
              </div>
              {error ? (
                <div data-testid="waitlist-card-error-msg" className="hc-inline-error" role="alert">
                  {error}
                </div>
              ) : null}
              <div data-testid="waitlist-card-count" className="hc-count" aria-live="polite">
                <span className="count-num">{countDisplay}</span> engineers already waiting
              </div>
              <a
                data-testid="waitlist-card-twitter-link"
                href="https://x.com/glass_qa"
                className={`social-x social-x--card social-x--${theme}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Glass on X (opens in a new tab)"
              >
                <XLogo size={22} weight="regular" aria-hidden className="social-x-icon" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
