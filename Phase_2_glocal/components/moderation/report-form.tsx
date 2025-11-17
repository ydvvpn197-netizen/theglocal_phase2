'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createReportSchema } from '@/lib/utils/validation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'
import { REPORT_REASONS } from '@/lib/utils/constants'
import { Loader2, AlertTriangle } from 'lucide-react'

type ReportFormData = z.infer<typeof createReportSchema>

interface ReportFormProps {
  contentType: 'post' | 'comment' | 'poll' | 'message' | 'user'
  contentId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReportForm({ contentType, contentId, onSuccess, onCancel }: ReportFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      content_type: contentType,
      content_id: contentId,
    },
  })

  const onSubmit = async (data: ReportFormData) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to report content',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          reason: selectedReason,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit report')
      }

      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep our community safe. We will review this report.',
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit report',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Warning */}
      <div className="flex items-start gap-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-800">Report responsibly</p>
          <p className="text-yellow-700 mt-1">
            False reports may result in action against your account. Only report content that
            genuinely violates our guidelines.
          </p>
        </div>
      </div>

      {/* Hidden fields */}
      <input type="hidden" {...register('content_type')} value={contentType} />
      <input type="hidden" {...register('content_id')} value={contentId} />

      {/* Reason Selection */}
      <div>
        <label className="text-sm font-medium">Reason for reporting</label>
        <div className="mt-2 space-y-2">
          {REPORT_REASONS.map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedReason === reason
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="h-4 w-4 text-brand-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{reason}</div>
                <div className="text-xs text-muted-foreground">{getReasonDescription(reason)}</div>
              </div>
            </label>
          ))}
        </div>
        {!selectedReason && errors.reason && (
          <p className="mt-1 text-sm text-destructive">Please select a reason</p>
        )}
      </div>

      {/* Additional Context */}
      <div>
        <label className="text-sm font-medium">Additional context (optional)</label>
        <Textarea
          {...register('additional_context')}
          placeholder="Provide any additional details that might help moderators review this report..."
          rows={4}
          maxLength={200}
        />
        <p className="mt-1 text-sm text-muted-foreground">Maximum 200 characters</p>
        {errors.additional_context && (
          <p className="mt-1 text-sm text-destructive">{errors.additional_context.message}</p>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading || !selectedReason} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Report'
          )}
        </Button>

        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Your report will be reviewed by community moderators. You will not be notified of the
        outcome for privacy reasons.
      </p>
    </form>
  )
}

function getReasonDescription(reason: string): string {
  const descriptions: Record<string, string> = {
    Spam: 'Unwanted commercial content or repetitive posts',
    Harassment: 'Bullying, threats, or personal attacks',
    Misinformation: 'False or misleading information',
    Violence: 'Threats of violence or graphic content',
    NSFW: 'Adult or inappropriate content',
    Other: 'Violates community guidelines in another way',
  }
  return descriptions[reason] || ''
}
