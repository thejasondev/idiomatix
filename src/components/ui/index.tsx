/* ──────────────────────────────────────────────────────────────
   Idiomatix — UI Primitives
   Button · Badge · Card · Modal · Toast · ProgressBar · Spinner
   Skeleton · ErrorBoundary
   Todos accesibles, theme-aware, sin dependencias externas.
────────────────────────────────────────────────────────────── */

import { Component, useEffect, useRef, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { X, AlertTriangle } from 'lucide-react'

// ─── Button ───────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <>
      <button
        className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${className}`}
        disabled={isDisabled}
        aria-busy={loading}
        {...rest}
      >
        {loading ? <Spinner size={14} /> : null}
        {children}
      </button>

      <style>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-weight: 500;
          cursor: pointer;
          transition: background 150ms ease, opacity 150ms ease, transform 100ms ease;
          white-space: nowrap;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          text-decoration: none;
        }
        .btn:active:not(:disabled) { transform: scale(0.97); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn--sm  { font-size: 12px; padding: 6px 14px; }
        .btn--md  { font-size: 14px; padding: 9px 20px; }
        .btn--lg  { font-size: 15px; padding: 12px 28px; border-radius: var(--radius-lg); }
        .btn--full { width: 100%; }

        .btn--primary {
          background: var(--btn-primary-bg);
          color: var(--btn-primary-text);
        }
        .btn--primary:hover:not(:disabled) { background: var(--btn-primary-hover); }

        .btn--ghost {
          background: transparent;
          color: var(--text-primary);
          border: 0.5px solid var(--border-strong);
        }
        .btn--ghost:hover:not(:disabled) { background: var(--bg-elevated); }

        .btn--danger {
          background: transparent;
          color: var(--crimson-500);
          border: 0.5px solid rgba(248,113,113,0.3);
        }
        .btn--danger:hover:not(:disabled) { background: rgba(248,113,113,0.08); }

        .btn--subtle {
          background: var(--bg-elevated);
          color: var(--text-secondary);
          border: 0.5px solid var(--border-default);
        }
        .btn--subtle:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-strong); }
      `}</style>
    </>
  )
}

// ─── Badge ────────────────────────────────────────────────────

type BadgeVariant = 'ru' | 'de' | 'en' | 'success' | 'warning' | 'danger' | 'neutral' | 'level'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <>
      <span className={`badge badge--${variant} ${className}`}>{children}</span>
      <style>{`
        .badge {
          display: inline-flex;
          align-items: center;
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 500;
          padding: 3px 9px;
          border-radius: var(--radius-full);
          white-space: nowrap;
          line-height: 1.4;
        }
        .badge--ru      { background: var(--lang-ru-bg); color: var(--lang-ru); border: 0.5px solid var(--lang-ru-border); }
        .badge--de      { background: var(--lang-de-bg); color: var(--lang-de); border: 0.5px solid var(--lang-de-border); }
        .badge--en      { background: var(--lang-en-bg); color: var(--lang-en); border: 0.5px solid var(--lang-en-border); }
        .badge--success { background: rgba(45,212,191,0.10); color: var(--verdant-400); border: 0.5px solid rgba(45,212,191,0.2); }
        .badge--warning { background: rgba(251,191,36,0.10); color: var(--gold-400); border: 0.5px solid rgba(251,191,36,0.2); }
        .badge--danger  { background: rgba(248,113,113,0.10); color: var(--crimson-400); border: 0.5px solid rgba(248,113,113,0.2); }
        .badge--neutral { background: var(--bg-elevated); color: var(--text-secondary); border: 0.5px solid var(--border-default); }
        .badge--level   { background: var(--bg-elevated); color: var(--text-muted); border: 0.5px solid var(--border-subtle); font-family: var(--font-mono); font-size: 10px; }
      `}</style>
    </>
  )
}

// ─── Card ─────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
  as?: 'div' | 'section' | 'article'
  onClick?: () => void
  interactive?: boolean
}

export function Card({
  children,
  className = '',
  elevated = false,
  as: Tag = 'div',
  onClick,
  interactive = false,
}: CardProps) {
  return (
    <>
      <Tag
        className={`uicard ${elevated ? 'uicard--elevated' : ''} ${interactive || onClick ? 'uicard--interactive' : ''} ${className}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {children}
      </Tag>
      <style>{`
        .uicard {
          background: var(--bg-card);
          border: 0.5px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }
        .uicard--elevated {
          background: var(--bg-elevated);
          border-color: var(--border-strong);
        }
        .uicard--interactive {
          cursor: pointer;
          transition: border-color 150ms, background 150ms, transform 120ms;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .uicard--interactive:hover { border-color: var(--border-strong); background: var(--bg-elevated); }
        .uicard--interactive:active { transform: scale(0.99); }
      `}</style>
    </>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────

interface ProgressBarProps {
  value: number       // 0–100
  max?: number
  lang?: 'ru' | 'de' | 'en'
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md'
}

const LANG_GRADIENTS = {
  ru: 'linear-gradient(90deg, #C2410C, #FB923C)',
  de: 'linear-gradient(90deg, #B45309, #FBBF24)',
  en: 'linear-gradient(90deg, #4338CA, #818CF8)',
  default: 'linear-gradient(90deg, var(--verdant-700), var(--verdant-400))',
}

export function ProgressBar({
  value,
  max = 100,
  lang,
  label,
  showValue = false,
  size = 'md',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const gradient = lang ? LANG_GRADIENTS[lang] : LANG_GRADIENTS.default

  return (
    <>
      <div className="pb-wrapper">
        {(label || showValue) && (
          <div className="pb-meta">
            {label && <span className="pb-label">{label}</span>}
            {showValue && (
              <span className="pb-value">
                {value} / {max}
              </span>
            )}
          </div>
        )}
        <div
          className={`pb-track pb-track--${size}`}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
        >
          <div className="pb-fill" style={{ width: `${pct}%`, background: gradient }} />
        </div>
      </div>
      <style>{`
        .pb-wrapper { display: flex; flex-direction: column; gap: 5px; }
        .pb-meta { display: flex; justify-content: space-between; align-items: baseline; }
        .pb-label { font-size: 12px; color: var(--text-secondary); }
        .pb-value { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
        .pb-track {
          background: var(--bg-elevated);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .pb-track--sm { height: 4px; }
        .pb-track--md { height: 6px; }
        .pb-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 400ms ease;
        }
      `}</style>
    </>
  )
}

// ─── Spinner ──────────────────────────────────────────────────

interface SpinnerProps {
  size?: number
  color?: string
}

export function Spinner({ size = 18, color = 'currentColor' }: SpinnerProps) {
  return (
    <>
      <svg
        className="spinner"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-label="Cargando"
        role="status"
      >
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <style>{`
        .spinner { animation: spin 700ms linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

// ─── Modal ────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="modal-overlay"
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={`modal-box modal-box--${size}`}>
          {title && (
            <div className="modal-header">
              <h2 className="modal-title">{title}</h2>
              <button className="modal-close" onClick={onClose} aria-label="Cerrar">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          )}
          <div className="modal-body">{children}</div>
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          display: flex; align-items: flex-end; justify-content: center;
          z-index: var(--z-modal, 200);
          padding: 0 0 env(safe-area-inset-bottom, 0);
          animation: overlayIn 200ms ease;
        }
        @media (min-width: 520px) {
          .modal-overlay { align-items: center; padding: 1rem; }
        }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-box {
          background: var(--bg-surface);
          border: 0.5px solid var(--border-default);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          width: 100%;
          max-height: 92dvh;
          overflow-y: auto;
          animation: sheetUp 280ms cubic-bezier(0.32, 0.72, 0, 1);
        }
        @media (min-width: 520px) {
          .modal-box {
            border-radius: var(--radius-xl);
            max-width: 420px;
          }
          .modal-box--sm { max-width: 340px; }
          .modal-box--md { max-width: 420px; }
        }
        @keyframes sheetUp { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.25rem 0;
        }
        .modal-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
        .modal-close {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px;
          border-radius: var(--radius-md);
          border: none; background: var(--bg-elevated);
          color: var(--text-muted); cursor: pointer;
          transition: color 150ms, background 150ms;
        }
        .modal-close:hover { color: var(--text-primary); background: var(--border-strong); }
        .modal-body { padding: 1.25rem; }
      `}</style>
    </>
  )
}

// ─── Toast ────────────────────────────────────────────────────

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose?: () => void
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' }
  const colors = {
    success: 'rgba(45,212,191,0.15)',
    error:   'rgba(248,113,113,0.15)',
    info:    'rgba(129,140,248,0.15)',
  }
  const textColors = {
    success: 'var(--verdant-400)',
    error:   'var(--crimson-400)',
    info:    'var(--lucid-400)',
  }

  return (
    <>
      <div
        className="toast"
        role="alert"
        aria-live="polite"
        style={{ background: colors[type], borderColor: colors[type] }}
      >
        <span className="toast__icon" style={{ color: textColors[type] }}>{icons[type]}</span>
        <span className="toast__msg">{message}</span>
        {onClose && (
          <button className="toast__close" onClick={onClose} aria-label="Cerrar">
            <X size={12} />
          </button>
        )}
      </div>
      <style>{`
        .toast {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius-lg);
          border: 0.5px solid;
          font-size: 13px;
          animation: toastIn 250ms ease;
        }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .toast__icon { font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .toast__msg { flex: 1; color: var(--text-primary); line-height: 1.4; }
        .toast__close {
          display: flex; align-items: center;
          border: none; background: transparent;
          color: var(--text-muted); cursor: pointer; padding: 2px;
        }
      `}</style>
    </>
  )
}

// ─── ToastContainer ───────────────────────────────────────────

export function ToastContainer() {
  const { toast, clearToast } = (() => {
    // Dynamic import to avoid circular dep issues in SSR contexts
    try {
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@/stores').useUIStore()
    } catch {
      return { toast: null, clearToast: () => {} }
    }
  })()

  if (!toast) return null

  return (
    <>
      <div className="toast-container">
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      </div>
      <style>{`
        .toast-container {
          position: fixed;
          bottom: calc(72px + env(safe-area-inset-bottom, 0px));
          left: 50%; transform: translateX(-50%);
          z-index: var(--z-toast, 300);
          width: calc(100% - 2.5rem);
          max-width: 400px;
          pointer-events: none;
        }
        .toast-container > * { pointer-events: auto; }
      `}</style>
    </>
  )
}

// ─── EmptyState ───────────────────────────────────────────────

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <>
      <div className="empty-state">
        {icon && <div className="empty-state__icon">{icon}</div>}
        <h3 className="empty-state__title">{title}</h3>
        {description && <p className="empty-state__desc">{description}</p>}
        {action && <div className="empty-state__action">{action}</div>}
      </div>
      <style>{`
        .empty-state {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 10px; padding: 3rem 1.5rem;
        }
        .empty-state__icon { color: var(--text-muted); margin-bottom: 4px; }
        .empty-state__title { font-size: 15px; font-weight: 500; color: var(--text-primary); }
        .empty-state__desc { font-size: 13px; color: var(--text-muted); max-width: 260px; line-height: 1.5; }
        .empty-state__action { margin-top: 6px; }
      `}</style>
    </>
  )
}

// ─── SectionHeader ────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  action?: ReactNode
  description?: string
}

export function SectionHeader({ title, action, description }: SectionHeaderProps) {
  return (
    <>
      <div className="sh-wrapper">
        <div className="sh-top">
          <h2 className="sh-title">{title}</h2>
          {action && <div className="sh-action">{action}</div>}
        </div>
        {description && <p className="sh-desc">{description}</p>}
      </div>
      <style>{`
        .sh-wrapper { display: flex; flex-direction: column; gap: 3px; }
        .sh-top { display: flex; align-items: center; justify-content: space-between; }
        .sh-title { font-size: 20px; font-weight: 600; color: var(--text-primary); }
        .sh-desc { font-size: 13px; color: var(--text-muted); }
        .sh-action { flex-shrink: 0; }
      `}</style>
    </>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: string
  lines?: number
  gap?: string
  className?: string
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  radius = 'var(--radius-md)',
  lines,
  gap = '8px',
  className = '',
}: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <>
        <div className={`skel-group ${className}`} style={{ gap }}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="skel-line"
              style={{
                width: i === lines - 1 ? '60%' : '100%',
                height: typeof height === 'number' ? `${height}px` : height,
                borderRadius: radius,
              }}
            />
          ))}
        </div>
        <style>{SKEL_STYLES}</style>
      </>
    )
  }

  return (
    <>
      <div
        className={`skel-line ${className}`}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          borderRadius: radius,
        }}
      />
      <style>{SKEL_STYLES}</style>
    </>
  )
}

export function PageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '0.5rem' }}>
      <Skeleton width="45%" height="24px" />
      <Skeleton width="70%" height="14px" />
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton height="80px" radius="var(--radius-lg)" />
        <Skeleton height="80px" radius="var(--radius-lg)" />
        <Skeleton height="80px" radius="var(--radius-lg)" />
      </div>
    </div>
  )
}

const SKEL_STYLES = `
  .skel-group { display: flex; flex-direction: column; }
  .skel-line {
    background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-card) 50%, var(--bg-elevated) 75%);
    background-size: 200% 100%;
    animation: skelShimmer 1.5s ease-in-out infinite;
  }
  @keyframes skelShimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`

// ─── ErrorBoundary ────────────────────────────────────────────

interface EBProps { children: ReactNode; moduleName?: string }
interface EBState { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[Idiomatix] Error in ${this.props.moduleName ?? 'component'}:`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <div className="eb-container">
            <div className="eb-card">
              <AlertTriangle size={28} strokeWidth={1.5} />
              <h3 className="eb-title">Algo salió mal</h3>
              <p className="eb-msg">
                {this.props.moduleName
                  ? `El módulo "${this.props.moduleName}" encontró un error.`
                  : 'Se produjo un error inesperado.'}
              </p>
              {this.state.error && (
                <code className="eb-detail">{this.state.error.message}</code>
              )}
              <button
                className="eb-retry"
                onClick={() => this.setState({ hasError: false, error: null })}
                type="button"
              >
                Reintentar
              </button>
            </div>
          </div>
          <style>{`
            .eb-container { display:flex; align-items:center; justify-content:center; min-height:200px; padding:2rem; }
            .eb-card { display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; padding:2rem; background:var(--bg-card); border:0.5px solid var(--border-default); border-radius:var(--radius-lg); max-width:360px; }
            .eb-icon { color:var(--ember-400); }
            .eb-title { font-size:1.1rem; font-weight:600; color:var(--text-primary); }
            .eb-msg { font-size:13px; color:var(--text-secondary); line-height:1.5; }
            .eb-detail { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); background:var(--bg-elevated); padding:6px 12px; border-radius:var(--radius-sm); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .eb-retry { margin-top:6px; padding:8px 20px; background:var(--verdant-600); color:white; border:none; border-radius:var(--radius-md); font-family:var(--font-body); font-size:13px; font-weight:500; cursor:pointer; transition:background 150ms; }
            .eb-retry:hover { background:var(--verdant-500); }
          `}</style>
        </>
      )
    }
    return this.props.children
  }
}
