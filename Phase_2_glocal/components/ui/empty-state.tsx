import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost'
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 'h-8 w-8',
      title: 'text-base',
      description: 'text-xs',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-base',
    },
  }

  const styles = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        styles.container,
        className
      )}
    >
      {Icon && <Icon className={cn('text-muted-foreground mb-4', styles.icon)} />}

      <h3 className={cn('font-semibold text-foreground mb-2', styles.title)}>{title}</h3>

      {description && (
        <p className={cn('text-muted-foreground max-w-md', styles.description)}>{description}</p>
      )}

      {action && (
        <Button onClick={action.onClick} variant={action.variant || 'default'} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Pre-configured variants for common scenarios
export const EmptyStateVariants = {
  NoResults: (props: Omit<EmptyStateProps, 'title' | 'icon'>) => (
    <EmptyState
      title="No results found"
      description="Try adjusting your search or filters"
      {...props}
    />
  ),

  NoData: (props: Omit<EmptyStateProps, 'title' | 'icon'>) => (
    <EmptyState
      title="Nothing here yet"
      description="Get started by creating your first item"
      {...props}
    />
  ),

  AccessDenied: (props: Omit<EmptyStateProps, 'title' | 'icon'>) => (
    <EmptyState
      title="Access Denied"
      description="You don't have permission to view this content"
      {...props}
    />
  ),

  Error: (props: Omit<EmptyStateProps, 'title' | 'icon'>) => (
    <EmptyState
      title="Something went wrong"
      description="We encountered an error loading this content"
      {...props}
    />
  ),

  Offline: (props: Omit<EmptyStateProps, 'title' | 'icon'>) => (
    <EmptyState
      title="You're offline"
      description="Check your internet connection and try again"
      {...props}
    />
  ),
}
