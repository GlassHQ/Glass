'use client'

import { useCallback, useRef, useState } from 'react'
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

export function WaitlistPage() {
  const [theme, setTheme] = useState<WaitlistTheme>('dark')
  const [wordmarkKey, setWordmarkKey] = useState(0)
  const [emailMain, setEmailMain] = useState('')
  const [emailCard, setEmailCard] = useState('')
  const [mainSuccess, setMainSuccess] = useState(false)
  const [cardSuccess, setCardSuccess] = useState(false)
  const [waitCount, setWaitCount] = useState(142)
  const emailMainRef = useRef<HTMLInputElement>(null)
  const emailCardRef = useRef<HTMLInputElement>(null)

  const selectTheme = useCallback((next: WaitlistTheme) => {
    setTheme(next)
    setWordmarkKey((k) => k + 1)
  }, [])

  const submitMain = useCallback(() => {
    if (!validEmail(emailMain)) {
      emailMainRef.current?.focus()
      return
    }
    setMainSuccess(true)
    setEmailMain('')
    setWaitCount((c) => c + 1)
  }, [emailMain])

  const submitCard = useCallback(() => {
    if (!validEmail(emailCard)) {
      emailCardRef.current?.focus()
      return
    }
    setCardSuccess(true)
    setEmailCard('')
    setWaitCount((c) => c + 1)
  }, [emailCard])

  const sceneClass =
    theme === 'dark'
      ? 'scene theme-dark'
      : theme === 'light'
        ? 'scene theme-light'
        : theme === 'holo'
          ? 'scene theme-holo'
          : 'scene theme-foil'

  return (
    <>
      <div
        className="switcher"
        role="toolbar"
        aria-label="Theme"
      >
        {THEMES.map(({ id, swClass, label }) => (
          <button
            key={id}
            type="button"
            className={`sw-btn ${swClass}${theme === id ? ' active' : ''}`}
            data-label={label}
            aria-pressed={theme === id}
            aria-label={`${label} theme`}
            onClick={() => selectTheme(id)}
          />
        ))}
      </div>

      <div className={sceneClass}>
        <div className="bg-noise" aria-hidden />
        <div className="bg-glow" aria-hidden />

        <div className="content">
          <span key={wordmarkKey} className="wordmark">
            Glass
          </span>
          <span className="tagline">Test suite intelligence. Coming soon.</span>

          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault()
              submitMain()
            }}
          >
            <label htmlFor="email" className="visually-hidden">
              Email address
            </label>
            <input
              ref={emailMainRef}
              id="email"
              className="input"
              type="email"
              name="email"
              autoComplete="off"
              placeholder="your@email.com"
              value={emailMain}
              onChange={(e) => setEmailMain(e.target.value)}
            />
            {theme === 'dark' ? (
              <Button type="submit" variant="submit" className="btn">
                Join waitlist
              </Button>
            ) : theme === 'light' ? (
              <Button type="submit" variant="inverse" className="btn">
                Join waitlist
              </Button>
            ) : (
              <button type="submit" className="btn">
                Join waitlist
              </button>
            )}
          </form>

          <div
            id="success-main"
            className={`success${mainSuccess ? ' show' : ''}`}
            role="status"
            aria-live="polite"
          >
            {mainSuccess ? "You're on the list. We'll be in touch." : '\u00a0'}
          </div>
          <div className="count" aria-live="polite">
            <span className="count-num">{waitCount}</span> engineers already waiting
          </div>
          <a
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
                className="hc-row"
                onSubmit={(e) => {
                  e.preventDefault()
                  submitCard()
                }}
              >
                <label htmlFor="hc-email" className="visually-hidden">
                  Email address
                </label>
                <input
                  ref={emailCardRef}
                  id="hc-email"
                  className="hc-input"
                  type="email"
                  name="email"
                  autoComplete="off"
                  placeholder="your@email.com"
                  value={emailCard}
                  onChange={(e) => setEmailCard(e.target.value)}
                />
                <button type="submit" className="hc-btn">
                  Join waitlist
                </button>
              </form>
              <div
                id="success-card"
                className={`hc-success${cardSuccess ? ' show' : ''}`}
                role="status"
                aria-live="polite"
              >
                {cardSuccess
                  ? "You're on the list. We'll be in touch."
                  : '\u00a0'}
              </div>
              <div className="hc-count" aria-live="polite">
                <span className="count-num">{waitCount}</span> engineers already waiting
              </div>
              <a
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
