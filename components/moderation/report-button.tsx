'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Flag } from 'lucide-react'
import { ReportDialog } from './report-dialog'

interface ReportButtonProps {
  contentType: 'post' | 'comment' | 'poll' | 'message' | 'user'
  contentId: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
}

export function ReportButton({
  contentType,
  contentId,
  variant = 'ghost',
  size = 'sm',
  showLabel = true,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <ReportDialog
      contentType={contentType}
      contentId={contentId}
      open={open}
      onOpenChange={setOpen}
    >
      <Button variant={variant} size={size}>
        <Flag className={showLabel ? 'mr-2 h-4 w-4' : 'h-4 w-4'} />
        {showLabel && 'Report'}
      </Button>
    </ReportDialog>
  )
}
