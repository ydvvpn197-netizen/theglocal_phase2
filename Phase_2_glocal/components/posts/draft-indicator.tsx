'use client'

import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, Save, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DraftIndicatorProps {
  isSaving?: boolean
  lastSaved?: Date | null
  hasUnsavedChanges?: boolean
  error?: Error | null
  onClick?: () => void
  className?: string
  showIcon?: boolean
  variant?: 'compact' | 'full'
}

export function DraftIndicator({
  isSaving = false,
  lastSaved = null,
  hasUnsavedChanges = false,
  error = null,
  onClick,
  className,
  showIcon = true,
  variant = 'full',
}: DraftIndicatorProps) {
  // Determine status
  let status: 'saving' | 'saved' | 'unsaved' | 'error' = 'saved'
  let message = ''
  let icon: React.ReactNode = null

  if (error) {
    status = 'error'
    message = 'Save failed'
    icon = <AlertCircle className="h-3 w-3" />
  } else if (isSaving) {
    status = 'saving'
    message = 'Saving...'
    icon = <Loader2 className="h-3 w-3 animate-spin" />
  } else if (hasUnsavedChanges) {
    status = 'unsaved'
    message = 'Unsaved changes'
    icon = <AlertCircle className="h-3 w-3" />
  } else if (lastSaved) {
    status = 'saved'
    const timeAgo = formatDistanceToNow(lastSaved, { addSuffix: true })
    message = variant === 'full' ? `Saved ${timeAgo}` : timeAgo
    icon = <CheckCircle2 className="h-3 w-3" />
  } else {
    status = 'saved'
    message = 'Draft saved'
    icon = <Save className="h-3 w-3" />
  }

  // Variant styles
  const variantStyles = {
    compact: 'text-xs px-2 py-0.5',
    full: 'text-xs px-2.5 py-1',
  }

  // Status colors
  const statusStyles = {
    saving:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    saved:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
    unsaved:
      'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
    error:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 border transition-colors',
        variantStyles[variant],
        statusStyles[status],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : 'status'}
      aria-live="polite"
      aria-label={`Draft status: ${message}`}
    >
      {showIcon && icon}
      <span className="whitespace-nowrap">{message}</span>
      {variant === 'full' && lastSaved && !isSaving && !hasUnsavedChanges && (
        <Clock className="h-3 w-3 opacity-70" />
      )}
    </Badge>
  )
}

// Compact version for tight spaces
export function DraftIndicatorCompact(props: Omit<DraftIndicatorProps, 'variant'>) {
  return <DraftIndicator {...props} variant="compact" />
}

// Full version with more details
export function DraftIndicatorFull(props: Omit<DraftIndicatorProps, 'variant'>) {
  return <DraftIndicator {...props} variant="full" />
}
