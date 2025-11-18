'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { LucideIcon } from 'lucide-react'

interface PreferenceToggleProps {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  icon?: LucideIcon
  disabled?: boolean
}

export function PreferenceToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  icon: Icon,
  disabled = false,
}: PreferenceToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3 flex-1">
        {Icon && (
          <div className="text-muted-foreground mt-1">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor={id} className="cursor-pointer font-medium">
            {label}
          </Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
