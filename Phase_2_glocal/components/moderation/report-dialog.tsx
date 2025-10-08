'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ReportForm } from './report-form'

interface ReportDialogProps {
  contentType: 'post' | 'comment' | 'poll' | 'message' | 'user'
  contentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function ReportDialog({
  contentType,
  contentId,
  open,
  onOpenChange,
  children,
}: ReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report {contentType}</DialogTitle>
          <DialogDescription>
            Help keep our community safe by reporting content that violates our community
            guidelines. All reports are reviewed by moderators.
          </DialogDescription>
        </DialogHeader>
        <ReportForm
          contentType={contentType}
          contentId={contentId}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

