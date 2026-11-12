// Composants d'interface de base, style shadcn/ui, sans dépendance externe.
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes,
  type LabelHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 shadow-sm',
  secondary: 'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 shadow-sm',
  ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading, size = 'md', className, children, disabled, ...props }, ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-9 px-4 text-sm',
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

const fieldBase =
  'w-full rounded-md border border-stone-200 bg-white px-3 text-sm placeholder:text-stone-400 ' +
  'focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 disabled:bg-stone-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, 'h-9', className)} {...props} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, 'min-h-20 py-2 leading-relaxed', className)} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(fieldBase, 'h-9', className)} {...props} />
  },
)

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-stone-700', className)} {...props} />
}

export function Field({ label, htmlFor, error, hint, children }: {
  label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-stone-200 bg-white', className)} {...props} />
}

export function CardHeader({ title, description, action }: {
  title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

type BadgeTone = 'neutral' | 'accent' | 'warning' | 'danger' | 'success'
const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  accent: 'bg-accent-50 text-accent-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-red-50 text-red-700',
  success: 'bg-emerald-50 text-emerald-700',
}

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', badgeTones[tone], className)}
      {...props}
    />
  )
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-stone-100 p-3 text-stone-500">{icon}</div>
      <p className="text-sm font-medium text-stone-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  )
}

export function ErrorMessage({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message
    : typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' ? error.message
    : 'Une erreur est survenue.'
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      {message}
    </div>
  )
}
