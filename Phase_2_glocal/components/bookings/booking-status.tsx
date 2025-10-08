'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, XCircle, HelpCircle, Award } from 'lucide-react'

interface BookingStatusProps {
  status: string
  className?: string
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    variant: 'secondary' as const,
    label: 'Pending',
    description: 'Waiting for artist response',
  },
  accepted: {
    icon: CheckCircle,
    variant: 'default' as const,
    label: 'Accepted',
    description: 'Artist accepted your request',
  },
  declined: {
    icon: XCircle,
    variant: 'destructive' as const,
    label: 'Declined',
    description: 'Artist declined this request',
  },
  info_requested: {
    icon: HelpCircle,
    variant: 'outline' as const,
    label: 'Info Requested',
    description: 'Artist needs more information',
  },
  completed: {
    icon: Award,
    variant: 'default' as const,
    label: 'Completed',
    description: 'Event completed successfully',
  },
}

export function BookingStatus({ status, className }: BookingStatusProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}

export function BookingStatusDescription({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending

  return <p className="text-sm text-muted-foreground">{config.description}</p>
}

