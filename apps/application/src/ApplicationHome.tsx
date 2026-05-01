'use client'

import { useState, useEffect, useRef } from 'react'
import './glass.css'
import {
  APPLICATIONS,
  type Application,
  type Session,
  type SessionStatus,
  type Feature,
  type Environment,
  type EnvType,
} from './mockData'

// ─── Navigation state ─────────────────────────────────────────────────────────

type Tier = 'free' | 'pro'

type Screen =
  | { id: 'applications' }
  | { id: 'settings' }
  | { id: 'application'; appId: string; tab: AppTab }
  | { id: 'session'; appId: string; sessionId: string }
  | { id: 'running-session'; appId: string; envType: EnvType }

function sidebarActive(screen: Screen): 'applications' | 'settings' {
  if (screen.id === 'settings') return 'settings'
  return 'applications'
}

// ─── Reachability dot ─────────────────────────────────────────────────────────

const REACH_LABEL: Record<string, string> = {
  reachable:     'Reachable',
  auth_required: 'Auth required',
  unreachable:   'Unreachable',
}
const REACH_COLOR: Record<string, string> = {
  reachable:     'var(--ok)',
  auth_required: 'var(--warn)',
  unreachable:   'var(--alert)',
}

// ─── Application card (home list) ─────────────────────────────────────────────

type SignalLevel = 'v-alert' | 'v-warn' | 'v-ok' | 'v-muted'

interface CardSignal {
  label: string
  value: string
  level: SignalLevel
  sub: string
}

const APP_SIGNALS: Record<string, { signals: CardSignal[]; urgency: string }> = {
  ecommerce: {
    urgency: 'alert',
    signals: [
      { label: 'Last session', value: '12 days ago',      level: 'v-warn',  sub: 'local env' },
      { label: 'Drift',        value: '3 changes',        level: 'v-alert', sub: 'since last session' },
      { label: 'Risk',         value: '4 critical flows', level: 'v-alert', sub: 'flagged by Glass' },
    ],
  },
  admin: {
    urgency: 'warn',
    signals: [
      { label: 'Last session', value: 'Today, 09:41',     level: 'v-ok',    sub: 'staging env' },
      { label: 'Drift',        value: 'No changes',       level: 'v-muted', sub: 'since last session' },
      { label: 'Risk',         value: '2 critical flows', level: 'v-warn',  sub: 'flagged by Glass' },
    ],
  },
  mobile: {
    urgency: 'ok',
    signals: [
      { label: 'Last session', value: 'Yesterday',          level: 'v-ok',    sub: 'local env' },
      { label: 'Drift',        value: 'No changes',         level: 'v-muted', sub: 'since last session' },
      { label: 'Risk',         value: 'No critical flows',  level: 'v-ok',    sub: 'all standard' },
    ],
  },
}

const PRO_SCHEDULES: Record<string, string> = {
  ecommerce: 'Daily · 08:00',
  admin:     'Weekly · Mon 09:00',
  mobile:    'Daily · 07:00',
}

function AppCard({
  app,
  tier,
  meta,
  onOpen,
  onViewLastSession,
  onRunSession,
}: {
  app: Application
  tier: Tier
  meta: { signals: CardSignal[]; urgency: string }
  onOpen: () => void
  onViewLastSession: () => void
  onRunSession: () => void
}) {
  const isPro = tier === 'pro'
  const scheduleLabel = isPro ? (PRO_SCHEDULES[app.id] ?? 'Daily · 09:00') : 'Manual run'
  const urlList = app.environments.map(e => e.url).join(' · ')
  const cardClass = ['app-card', meta.urgency === 'ok' ? '' : meta.urgency].filter(Boolean).join(' ')

  return (
    <div className={cardClass} onClick={onOpen}>
      <div className="card-top">
        <div className="card-icon">{app.initials}</div>
        <div className="card-info">
          <div className="card-name">{app.name}</div>
          <div className="card-url">{urlList}</div>
          <div className="card-envs">
            {app.environments.map(e => (
              <span key={e.type} className={`env-chip ${e.type}`}>{e.type}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="card-signals">
        {meta.signals.map(s => (
          <div key={s.label} className="signal">
            <div className="signal-label">{s.label}</div>
            <div className={`signal-value ${s.level}`}>{s.value}</div>
            <div className="signal-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card-footer">
        <div className="schedule-info">
          <div className={`sched-dot ${isPro ? 'on' : 'off'}`} />
          <span>{scheduleLabel}</span>
          {!isPro && <span className="pro-lock">Pro</span>}
        </div>
        <div className="footer-actions">
          <button
            className="btn-xs"
            disabled={app.sessions.length === 0}
            onClick={e => { e.stopPropagation(); onViewLastSession() }}
          >
            View last session
          </button>
          <button
            className="btn-xs btn-xs-primary"
            onClick={e => { e.stopPropagation(); onRunSession() }}
          >
            Run now
          </button>
        </div>
      </div>
    </div>
  )
}

type AppTab = 'environments' | 'sessions' | 'settings'

// ─── Application settings tab ─────────────────────────────────────────────────

function AppSettingsTab({
  app,
  onSave,
  onDelete,
}: {
  app: Application
  onSave: (updated: Application) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(app.name)
  const [localUrl, setLocalUrl] = useState(app.environments.find(e => e.type === 'local')?.url ?? '')
  const [stagingUrl, setStagingUrl] = useState(app.environments.find(e => e.type === 'staging')?.url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saved, setSaved] = useState(false)
  const initials = name.trim() ? deriveInitials(name) : '??'

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Application name is required.'); return }
    if (!localUrl.trim() && !stagingUrl.trim()) { setError('At least one environment URL is required.'); return }

    const envs: Environment[] = []
    if (localUrl.trim()) {
      const ex = app.environments.find(e => e.type === 'local')
      envs.push({ type: 'local', url: localUrl.trim(), reachability: ex?.reachability ?? 'reachable', lastSessionId: ex?.lastSessionId ?? null })
    }
    if (stagingUrl.trim()) {
      const ex = app.environments.find(e => e.type === 'staging')
      envs.push({ type: 'staging', url: stagingUrl.trim(), reachability: ex?.reachability ?? 'reachable', lastSessionId: ex?.lastSessionId ?? null })
    }
    onSave({ ...app, name: name.trim(), initials: deriveInitials(name), environments: envs })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form className="app-settings" onSubmit={handleSave}>
      <div className="settings-section">
        <div className="settings-section-title">Application</div>
        <div className="settings-row">
          <div className="settings-row-label">Name</div>
          <div className="settings-name-field">
            <div className="settings-initials-preview">{initials}</div>
            <input
              className="settings-input"
              value={name}
              onChange={e => { setName(e.target.value); setError(null); setSaved(false) }}
            />
          </div>
        </div>
        <div className="settings-section-divider">Environments</div>
        <div className="settings-row">
          <div className="settings-row-label">Local URL</div>
          <input
            className="settings-input mono"
            placeholder="localhost:3000"
            value={localUrl}
            onChange={e => { setLocalUrl(e.target.value); setError(null); setSaved(false) }}
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-label">Staging URL</div>
          <input
            className="settings-input mono"
            placeholder="staging.myapp.com"
            value={stagingUrl}
            onChange={e => { setStagingUrl(e.target.value); setError(null); setSaved(false) }}
          />
        </div>
        {error && <div className="settings-row settings-error-row"><div className="settings-error">{error}</div></div>}
        <div className="settings-row settings-save-row">
          <button type="submit" className={`btn ${saved ? 'btn-saved' : 'btn-primary'}`}>
            {saved ? 'Saved ✓' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="settings-section settings-danger-zone">
        <div className="settings-section-title danger">Danger zone</div>
        {confirmDelete ? (
          <div className="settings-row settings-delete-confirm">
            <span className="settings-delete-confirm-text">This will permanently remove the application.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-xs" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button type="button" className="btn-xs btn-danger" onClick={onDelete}>Confirm delete</button>
            </div>
          </div>
        ) : (
          <div className="settings-row">
            <div className="settings-row-label">Delete application</div>
            <button type="button" className="btn-xs btn-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </form>
  )
}

// ─── Application view ─────────────────────────────────────────────────────────

function ApplicationView({
  app,
  tab,
  onTabChange,
  onSessionClick,
  onRunSession,
  onSave,
  onDelete,
  onBack,
}: {
  app: Application
  tab: AppTab
  onTabChange: (t: AppTab) => void
  onSessionClick: (sessionId: string) => void
  onRunSession: (envType: EnvType) => void
  onSave: (updated: Application) => void
  onDelete: () => void
  onBack: () => void
}) {
  return (
    <>
      <div className="topbar">
        <button className="btn-back" onClick={onBack}>← Applications</button>
        <div className="topbar-app">
          <span className="topbar-icon">{app.initials}</span>
          <span className="topbar-title">{app.name}</span>
        </div>
      </div>

      <div className="tab-bar">
        {(['environments', 'sessions', 'settings'] as const).map(t => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => onTabChange(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="content">
        {tab === 'environments' && (
          <div className="env-grid">
            {app.environments.map(env => {
              const lastSession = env.lastSessionId
                ? app.sessions.find(s => s.id === env.lastSessionId)
                : null
              return (
                <div key={env.type} className="env-card">
                  <div className="env-card-header">
                    <span className={`env-chip ${env.type}`}>{env.type}</span>
                  </div>
                  <div className="env-card-url">{env.url}</div>
                  <div className="env-card-reach">
                    <span
                      className="reach-dot"
                      style={{ background: REACH_COLOR[env.reachability] }}
                    />
                    <span className="env-card-reach-label">{REACH_LABEL[env.reachability]}</span>
                  </div>
                  <div className="env-card-meta">
                    Last session: {lastSession ? lastSession.startedAt : '—'}
                  </div>
                  <div className="env-card-actions">
                    <button
                      className="btn-xs btn-xs-primary"
                      onClick={() => onRunSession(env.type)}
                    >
                      Run session
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'sessions' && (
          <div className="sessions-table">
            {app.sessions.length > 0
              ? app.sessions.map(session => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onClick={() => onSessionClick(session.id)}
                  />
                ))
              : <div className="empty-state"><div className="empty-state-title">No sessions yet</div><div className="empty-state-sub">Run Glass against this application to see sessions here.</div></div>
            }
          </div>
        )}

        {tab === 'settings' && (
          <AppSettingsTab app={app} onSave={onSave} onDelete={onDelete} />
        )}
      </div>
    </>
  )
}

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({
  session,
  appName,
  onClick,
}: {
  session: Session
  appName?: string
  onClick: () => void
}) {
  const criticalCount = session.features.flatMap(f => f.flows).filter(f => f.risk === 'critical').length

  return (
    <div className="session-row" onClick={onClick}>
      <span className={`env-chip ${session.envType}`}>{session.envType}</span>
      {appName && <span className="session-app-name">{appName}</span>}
      <span className="session-date">{session.startedAt}</span>
      <div className="session-stats">
        <span>{session.featureCount} features</span>
        <span>{session.pageCount} pages</span>
        {criticalCount > 0 && (
          <span className="session-stat-alert">{criticalCount} critical</span>
        )}
      </div>
      <span className="session-tokens">{session.tokenCount.toLocaleString()} tok</span>
      <span className={`session-status ${session.status}`}>{session.status}</span>
      <span className="session-chevron">›</span>
    </div>
  )
}

// ─── Session result view ──────────────────────────────────────────────────────

function SessionResultView({
  session,
  appName,
  onBack,
}: {
  session: Session
  appName: string
  onBack: () => void
}) {
  const [openFeatures, setOpenFeatures] = useState<Set<number>>(new Set([0]))

  function toggleFeature(i: number) {
    setOpenFeatures(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const envLabel = session.envType.charAt(0).toUpperCase() + session.envType.slice(1)
  const criticalCount = session.features.flatMap(f => f.flows).filter(f => f.risk === 'critical').length

  return (
    <>
      <div className="topbar">
        <button className="btn-back" onClick={onBack}>← {appName}</button>
        <div className="topbar-session-meta">
          <span className={`env-chip ${session.envType}`}>{envLabel}</span>
          <span className="topbar-date">{session.startedAt}</span>
          <span className="token-pill">{session.tokenCount.toLocaleString()} tokens</span>
        </div>
      </div>

      <div className="content">
        <div className="narrative-card">
          <div className="narrative-label">Summary</div>
          <p className="narrative-text">{session.narrative}</p>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{session.featureCount}</div>
            <div className="stat-label">Features</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{session.pageCount}</div>
            <div className="stat-label">Pages</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: criticalCount > 0 ? 'var(--alert)' : 'var(--ok)' }}>
              {criticalCount}
            </div>
            <div className="stat-label">Critical flows</div>
          </div>
          <div className="stat-card">
            <div className="stat-value mono">{session.tokenCount.toLocaleString()}</div>
            <div className="stat-label">Tokens</div>
          </div>
        </div>

        <div className="feature-map">
          {session.features.map((feature, i) => {
            const isOpen = openFeatures.has(i)
            const criticals = feature.flows.filter(f => f.risk === 'critical').length
            return (
              <div key={i} className="feature-section">
                <button
                  className="feature-header"
                  onClick={() => toggleFeature(i)}
                >
                  <span className="feature-name">{feature.name}</span>
                  <div className="feature-header-right">
                    {criticals > 0 && (
                      <span className="feature-critical-badge">{criticals} critical</span>
                    )}
                    <span className="feature-flow-count">{feature.flows.length} flows</span>
                    <span className={`feature-chevron${isOpen ? ' open' : ''}`}>›</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="feature-flows">
                    {feature.flows.map((flow, j) => (
                      <div key={j} className="flow-row">
                        <span className="flow-description">{flow.description}</span>
                        <span className={`risk-badge ${flow.risk}`}>{flow.risk}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─── Settings view ────────────────────────────────────────────────────────────

function SettingsView({
  workspaceName,
  onSaveWorkspaceName,
}: {
  workspaceName: string
  onSaveWorkspaceName: (name: string) => void
}) {
  const [name, setName] = useState(workspaceName)
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSaveWorkspaceName(trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Settings</span>
      </div>
      <div className="content">
        <form className="app-settings" onSubmit={handleSave}>
          <div className="settings-section">
            <div className="settings-section-title">Workspace</div>
            <div className="settings-row">
              <div className="settings-row-label">Workspace name</div>
              <input
                className="settings-input"
                value={name}
                onChange={e => { setName(e.target.value); setSaved(false) }}
              />
            </div>
            <div className="settings-save-row">
              <button type="submit" className={`btn ${saved ? 'btn-saved' : 'btn-primary'}`}>
                {saved ? 'Saved ✓' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
        <div className="settings-section">
          <div className="settings-section-title">Account</div>
          <div className="settings-row">
            <div className="settings-row-label">Email</div>
            <div className="settings-row-value">user@example.com</div>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">Plan</div>
            <div className="settings-row-value">Free</div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Local storage hook ───────────────────────────────────────────────────────

function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) setValue(JSON.parse(stored) as T)
    } catch {}
  }, [key])

  const set = (next: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      try { window.localStorage.setItem(key, JSON.stringify(resolved)) } catch {}
      return resolved
    })
  }

  return [value, set] as const
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveInitials(name: string): string {
  const words = name.trim().split(/[\s\-_]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  if (words[0]?.length >= 2) return words[0].slice(0, 2).toUpperCase()
  return (name.slice(0, 2) || '??').toUpperCase()
}

const EMPTY_SIGNALS: { signals: CardSignal[]; urgency: string } = {
  urgency: 'ok',
  signals: [
    { label: 'Last session', value: 'Never',   level: 'v-muted', sub: '—' },
    { label: 'Drift',        value: '—',        level: 'v-muted', sub: 'no baseline' },
    { label: 'Risk',         value: 'No data',  level: 'v-muted', sub: 'run a session first' },
  ],
}

// ─── Run session helpers ──────────────────────────────────────────────────────

function formatDisplayDate(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

interface RunPlan {
  features: Feature[]
  willFail: boolean
  failAtIdx: number
  failReason: string
  totalTokens: number
  totalPages: number
}

const FAIL_REASONS = [
  'Agent encountered an authentication wall it could not navigate past',
  'Element interaction failed — the target element was not reachable via the accessibility tree',
  'Network timeout occurred while waiting for the page to load after form submission',
  'An unexpected dialog blocked further page navigation',
  'A JavaScript exception prevented the page from completing its render cycle',
]

function buildRunPlan(app: Application, _envType: EnvType): RunPlan {
  const source = app.sessions[0]
  const allFeatures: Feature[] = source?.features ?? []

  if (allFeatures.length === 0) {
    return { features: [], willFail: false, failAtIdx: 0, failReason: '', totalTokens: 0, totalPages: 0 }
  }

  const count = Math.max(2, Math.round(allFeatures.length * (0.6 + Math.random() * 0.4)))
  const features = [...allFeatures].sort(() => Math.random() - 0.5).slice(0, count)

  const willFail = Math.random() < 0.3
  const failAtIdx = willFail ? 1 + Math.floor(Math.random() * Math.max(1, features.length - 1)) : features.length
  const failReason = FAIL_REASONS[Math.floor(Math.random() * FAIL_REASONS.length)]
  const covered = willFail ? failAtIdx : features.length
  const totalTokens = Math.floor(covered * (1300 + Math.random() * 1100))
  const totalPages = Math.floor(covered * (1.2 + Math.random() * 0.8))

  return { features, willFail, failAtIdx, failReason, totalTokens, totalPages }
}

function generateNarrative(
  appName: string,
  features: Feature[],
  phase: 'done' | 'failed' | 'stopped',
  plan: RunPlan,
): string {
  const flowCount = features.flatMap(f => f.flows).length
  const criticalCount = features.flatMap(f => f.flows).filter(f => f.risk === 'critical').length
  const criticalFeatures = features.filter(f => f.flows.some(fl => fl.risk === 'critical')).map(f => f.name)
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

  if (phase === 'failed') {
    const remaining = plan.features.length - features.length
    return `Session terminated after ${plural(features.length, 'feature area')} were explored. ${plan.failReason}. The features mapped prior to the failure completed without issues. Resolve the blocking condition and re-run to cover the remaining ${plural(remaining, 'feature area')}.`
  }

  if (phase === 'stopped') {
    return `Session was manually stopped after exploring ${plural(features.length, 'feature area')} and ${plural(flowCount, 'flow')}. ${criticalCount > 0 ? `${plural(criticalCount, 'critical flow')} ${criticalCount === 1 ? 'was' : 'were'} identified in ${criticalFeatures.slice(0, 2).join(' and ')} before the session ended. ` : 'No critical flows were identified in the explored areas. '}Re-run the session to complete coverage of all feature areas.`
  }

  const variants = [
    `Glass completed a full sweep of ${appName} across ${plural(features.length, 'feature area')} and ${plural(flowCount, 'flow')} over ${plan.totalPages} pages. ${criticalCount > 0 ? `${plural(criticalCount, 'critical flow')} were identified — ${criticalFeatures.slice(0, 2).join(' and ')} warrant attention before the next deployment. ` : 'All flows mapped at standard risk — no critical paths detected. '}The application navigated end-to-end without blocking errors.`,

    `${appName} was explored across ${plural(features.length, 'feature area')} in this session. Glass visited ${plan.totalPages} pages and mapped ${plural(flowCount, 'flow')}. ${criticalCount > 0 ? `The ${plural(criticalCount, 'critical flow')} in ${criticalFeatures[0]} should be reviewed against the latest test coverage. ` : 'Risk profile is clean — no critical flows in this run. '}No navigation failures or unexpected states were observed.`,

    `Session completed successfully across all ${plural(features.length, 'targeted feature')}. Glass mapped ${plan.totalPages} pages and ${plural(flowCount, 'flow')} without encountering any blocking conditions. ${criticalCount > 0 ? `${plural(criticalCount, 'flow')} carrying critical risk ${criticalCount === 1 ? 'was' : 'were'} identified — recommend review before the next release. ` : 'No critical flows were flagged in this session. '}The application appears stable relative to the previous session.`,
  ]

  return variants[Math.floor(Math.random() * variants.length)]
}

// ─── Run session view ─────────────────────────────────────────────────────────

type RunPhase = 'connecting' | 'discovering' | 'exploring' | 'done' | 'failed' | 'stopped'

function getFeatureState(
  i: number,
  phase: RunPhase,
  featureIdx: number,
  plan: RunPlan,
): 'done' | 'active' | 'failed' | 'skipped' | 'upcoming' {
  if (phase === 'done') return 'done'
  if (phase === 'failed') {
    if (i < plan.failAtIdx) return 'done'
    if (i === plan.failAtIdx) return 'failed'
    return 'skipped'
  }
  if (phase === 'stopped') {
    return i < featureIdx ? 'done' : 'skipped'
  }
  if (i < featureIdx) return 'done'
  if (i === featureIdx) return 'active'
  return 'upcoming'
}

function RunningSessionView({
  app,
  envType,
  onComplete,
  onBack,
}: {
  app: Application
  envType: EnvType
  onComplete: (session: Session) => void
  onBack: () => void
}) {
  const [plan] = useState<RunPlan>(() => buildRunPlan(app, envType))
  const [phase, setPhase] = useState<RunPhase>('connecting')
  const [featureIdx, setFeatureIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [completedSession, setCompletedSession] = useState<Session | null>(null)
  const startTimeRef = useRef(new Date())

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (phase === 'done' || phase === 'failed' || phase === 'stopped') return

    const delay =
      phase === 'connecting' ? 1000 :
      phase === 'discovering' ? 800 :
      1400 + Math.random() * 600

    const t = setTimeout(() => {
      if (phase === 'connecting') {
        setPhase('discovering')
      } else if (phase === 'discovering') {
        setPhase('exploring')
        setFeatureIdx(0)
      } else {
        if (plan.willFail && featureIdx === plan.failAtIdx) {
          setPhase('failed')
        } else if (featureIdx + 1 >= plan.features.length) {
          setPhase('done')
        } else {
          setFeatureIdx(i => i + 1)
        }
      }
    }, delay)

    return () => clearTimeout(t)
  }, [phase, featureIdx, plan])

  useEffect(() => {
    if (phase !== 'done' && phase !== 'failed' && phase !== 'stopped') return

    const now = new Date()
    const coveredFeatures =
      phase === 'done' ? plan.features :
      phase === 'failed' ? plan.features.slice(0, plan.failAtIdx) :
      plan.features.slice(0, featureIdx)

    const ratio = plan.features.length > 0 ? coveredFeatures.length / plan.features.length : 0
    const status: SessionStatus = phase === 'done' ? 'completed' : phase === 'failed' ? 'failed' : 'stopped'

    setCompletedSession({
      id: `s-${app.id}-${Date.now()}`,
      appId: app.id,
      envType,
      status,
      startedAt: formatDisplayDate(startTimeRef.current),
      completedAt: formatDisplayDate(now),
      isoDate: startTimeRef.current.toISOString(),
      tokenCount: Math.max(0, Math.round(plan.totalTokens * ratio)),
      featureCount: coveredFeatures.length,
      pageCount: Math.max(0, Math.round(plan.totalPages * ratio)),
      narrative: generateNarrative(app.name, coveredFeatures, phase as 'done' | 'failed' | 'stopped', plan),
      features: coveredFeatures,
    })
  }, [phase, featureIdx, app, envType, plan])

  const envUrl = app.environments.find(e => e.type === envType)?.url ?? envType
  const isRunning = phase === 'connecting' || phase === 'discovering' || phase === 'exploring'
  const showFeatureList = phase !== 'connecting' && phase !== 'discovering'

  const headerTitle =
    phase === 'connecting' ? `Connecting to ${envUrl}…` :
    phase === 'discovering' ? 'Mapping application structure…' :
    phase === 'exploring' ? `Exploring ${plan.features[featureIdx]?.name ?? ''}…` :
    phase === 'done' ? 'Session complete' :
    phase === 'failed' ? 'Session failed' :
    'Session stopped'

  return (
    <>
      <div className="topbar">
        <button className="btn-back" onClick={onBack}>← {app.name}</button>
        <div className="topbar-session-meta">
          <span className={`env-chip ${envType}`}>{envType}</span>
          {isRunning && <span className="run-status-badge">running</span>}
          {!isRunning && <span className={`session-status ${phase === 'done' ? 'completed' : phase}`}>{phase === 'done' ? 'completed' : phase}</span>}
        </div>
      </div>

      <div className="content">
        <div className="run-progress-card">
          <div className="run-progress-header">
            <span className="run-progress-title">{headerTitle}</span>
            <span className="run-elapsed">{formatElapsed(elapsed)}</span>
          </div>

          {!showFeatureList && (
            <div className="run-init-row">
              <span className="run-spinner" />
              <span className="run-init-label">
                {phase === 'connecting' ? `Reaching ${envUrl}` : 'Scanning routes and entry points'}
              </span>
            </div>
          )}

          {showFeatureList && plan.features.length > 0 && (
            <div className="run-feature-list">
              {plan.features.map((feature, i) => {
                const state = getFeatureState(i, phase, featureIdx, plan)
                const criticals = feature.flows.filter(f => f.risk === 'critical').length
                return (
                  <div key={i} className={`run-feature ${state}`}>
                    {state === 'active'
                      ? <span className="run-feature-spin" />
                      : <span className="run-feature-icon">
                          {state === 'done' ? '✓' : state === 'failed' ? '✗' : '○'}
                        </span>
                    }
                    <span className="run-feature-name">{feature.name}</span>
                    <span className="run-feature-right">
                      {state === 'done' && (
                        <>
                          {criticals > 0 && <span className="run-feature-critical">{criticals} critical</span>}
                          <span className="run-feature-count">{feature.flows.length} flows</span>
                        </>
                      )}
                      {state === 'active' && <span className="run-feature-exploring">exploring…</span>}
                      {state === 'failed' && <span className="run-feature-error">failed</span>}
                      {state === 'skipped' && <span className="run-feature-skipped">skipped</span>}
                      {state === 'upcoming' && <span className="run-feature-queued">{feature.flows.length} flows</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {phase === 'failed' && (
            <div className="run-error-note">
              <span className="run-error-icon">!</span>
              <span>{plan.failReason}</span>
            </div>
          )}
        </div>

        <div className="run-actions">
          {isRunning && (
            <button className="btn" onClick={() => setPhase('stopped')}>Stop session</button>
          )}
          {completedSession && (
            <button className="btn btn-primary" onClick={() => onComplete(completedSession)}>
              View results →
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Add application modal ────────────────────────────────────────────────────

function AddApplicationModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (app: Application) => void
}) {
  const [name, setName] = useState('')
  const [localUrl, setLocalUrl] = useState('')
  const [stagingUrl, setStagingUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const initials = name.trim() ? deriveInitials(name) : '??'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Application name is required.'); return }
    if (!localUrl.trim() && !stagingUrl.trim()) { setError('Add at least one environment URL.'); return }

    const id = name.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
    const envs: Environment[] = []
    if (localUrl.trim())   envs.push({ type: 'local',   url: localUrl.trim(),   reachability: 'reachable', lastSessionId: null })
    if (stagingUrl.trim()) envs.push({ type: 'staging', url: stagingUrl.trim(), reachability: 'reachable', lastSessionId: null })

    onAdd({
      id,
      initials: deriveInitials(name),
      name: name.trim(),
      environments: envs,
      sessions: [],
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add application</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="modal-field">
            <label className="modal-label">Application name</label>
            <div className="modal-name-row">
              <div className="modal-initials-preview">{initials}</div>
              <input
                className="modal-input"
                placeholder="my-app"
                value={name}
                onChange={e => { setName(e.target.value); setError(null) }}
                autoFocus
              />
            </div>
          </div>

          <div className="modal-section-title">Environments</div>

          <div className="modal-field">
            <label className="modal-label">Local URL</label>
            <input
              className="modal-input mono"
              placeholder="localhost:3000"
              value={localUrl}
              onChange={e => { setLocalUrl(e.target.value); setError(null) }}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Staging URL</label>
            <input
              className="modal-input mono"
              placeholder="staging.myapp.com"
              value={stagingUrl}
              onChange={e => { setStagingUrl(e.target.value); setError(null) }}
            />
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add application</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit application modal ───────────────────────────────────────────────────

// ─── Shell ────────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: 'applications' | 'settings'; label: string }[] = [
  { id: 'applications', label: 'Applications' },
  { id: 'settings',     label: 'Settings' },
]

export default function ApplicationHome() {
  const [tier, setTier] = useState<Tier>('free')
  const [screen, setScreen] = useState<Screen>({ id: 'applications' })
  const [apps, setApps] = useLocalStorage<Application[]>('glass:apps', APPLICATIONS)
  const [signalsMap, setSignalsMap] = useLocalStorage<Record<string, { signals: CardSignal[]; urgency: string }>>('glass:signals', APP_SIGNALS)
  const [workspaceName, setWorkspaceName] = useLocalStorage('glass:workspace-name', 'My workspace')
  const [showAddModal, setShowAddModal] = useState(false)
  const isPro = tier === 'pro'
  const activeNav = sidebarActive(screen)

  function findApp(id: string) { return apps.find(a => a.id === id) }

  function goToApp(appId: string, tab: 'environments' | 'sessions' = 'environments') {
    setScreen({ id: 'application', appId, tab })
  }

  function goToSession(appId: string, sessionId: string) {
    setScreen({ id: 'session', appId, sessionId })
  }

  function goBack() {
    if (screen.id === 'session') {
      setScreen({ id: 'application', appId: screen.appId, tab: 'sessions' })
    } else if (screen.id === 'running-session') {
      setScreen({ id: 'application', appId: screen.appId, tab: 'environments' })
    } else if (screen.id === 'application') {
      setScreen({ id: 'applications' })
    }
  }

  function handleAddApp(newApp: Application) {
    setApps(prev => [...prev, newApp])
    setSignalsMap(prev => ({ ...prev, [newApp.id]: EMPTY_SIGNALS }))
    setShowAddModal(false)
  }

  function handleSaveApp(updated: Application) {
    setApps(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  function handleDeleteApp(appId: string) {
    setApps(prev => prev.filter(a => a.id !== appId))
    setSignalsMap(prev => { const next = { ...prev }; delete next[appId]; return next })
    setScreen({ id: 'applications' })
  }

  function goToRunSession(appId: string, envType: EnvType) {
    setScreen({ id: 'running-session', appId, envType })
  }

  function handleRunComplete(session: Session) {
    setApps(prev => prev.map(a => {
      if (a.id !== session.appId) return a
      const environments = a.environments.map(e =>
        e.type === session.envType ? { ...e, lastSessionId: session.id } : e
      )
      return { ...a, environments, sessions: [session, ...a.sessions] }
    }))
    goToSession(session.appId, session.id)
  }

  return (
    <div className="glass-app">
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="logo">{workspaceName}</span>
          <button
            className={`tier-pill${isPro ? ' pro' : ''}`}
            onClick={() => setTier(isPro ? 'free' : 'pro')}
          >
            {isPro ? 'Pro' : 'Free'}
          </button>
        </div>

        <div className="nav-section">Workspace</div>
        {NAV_ITEMS.map(({ id, label }) => (
          <div
            key={id}
            className={`nav-item${activeNav === id ? ' active' : ''}`}
            onClick={() => setScreen({ id })}
          >
            <div className="nav-dot" />
            {label}
          </div>
        ))}

        <div className="sidebar-bottom">
          {!isPro && (
            <div className="upgrade-box">
              <div className="upgrade-title">Upgrade to Pro</div>
              <div className="upgrade-text">Auto-run schedules so Glass always stays current.</div>
              <button className="upgrade-btn">See Pro plans</button>
            </div>
          )}
        </div>
      </aside>

      <div className="glass-main">
        {screen.id === 'applications' && (
          <>
            <div className="topbar">
              <span className="topbar-title">Applications</span>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add application</button>
            </div>
            <div className="content">
              {apps.map(app => {
                const lastSession = app.sessions[0]
                const meta = signalsMap[app.id] ?? EMPTY_SIGNALS
                return (
                  <AppCard
                    key={app.id}
                    app={app}
                    tier={tier}
                    meta={meta}
                    onOpen={() => goToApp(app.id)}
                    onViewLastSession={() =>
                      lastSession
                        ? goToSession(app.id, lastSession.id)
                        : goToApp(app.id, 'sessions')
                    }
                    onRunSession={() => {
                      const env = app.environments.find(e => e.type === 'local') ?? app.environments[0]
                      if (env) goToRunSession(app.id, env.type)
                    }}
                  />
                )
              })}
            </div>
          </>
        )}

        {screen.id === 'application' && (() => {
          const app = findApp(screen.appId)
          if (!app) return null
          return (
            <ApplicationView
              app={app}
              tab={screen.tab}
              onTabChange={tab => setScreen({ ...screen, tab })}
              onSessionClick={sid => goToSession(app.id, sid)}
              onRunSession={envType => goToRunSession(app.id, envType)}
              onSave={handleSaveApp}
              onDelete={() => handleDeleteApp(app.id)}
              onBack={goBack}
            />
          )
        })()}

        {screen.id === 'session' && (() => {
          const app = findApp(screen.appId)
          const session = app?.sessions.find(s => s.id === screen.sessionId)
          if (!session || !app) return null
          return (
            <SessionResultView
              session={session}
              appName={app.name}
              onBack={goBack}
            />
          )
        })()}

        {screen.id === 'running-session' && (() => {
          const app = findApp(screen.appId)
          if (!app) return null
          return (
            <RunningSessionView
              app={app}
              envType={screen.envType}
              onComplete={handleRunComplete}
              onBack={goBack}
            />
          )
        })()}

        {screen.id === 'settings' && (
          <SettingsView
            workspaceName={workspaceName}
            onSaveWorkspaceName={setWorkspaceName}
          />
        )}
      </div>

      {showAddModal && (
        <AddApplicationModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddApp}
        />
      )}
    </div>
  )
}
