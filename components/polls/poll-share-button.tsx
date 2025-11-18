'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Link, Check } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'

interface PollShareButtonProps {
  pollId: string
  question: string
  className?: string
}

export function PollShareButton({ pollId, question, className }: PollShareButtonProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/polls/${pollId}`
  const shareText = `Check out this poll: ${question}`

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink()
      return
    }

    setIsSharing(true)
    try {
      await navigator.share({
        title: question,
        text: shareText,
        url: shareUrl,
      })
    } catch (error) {
      // User cancelled or error occurred, fallback to copy
      if (error instanceof Error && !error.message.includes('AbortError')) {
        handleCopyLink()
      }
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: 'Link copied!',
        description: 'Poll link copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy link to clipboard',
        variant: 'destructive',
      })
    }
  }

  const supportsNativeShare = typeof navigator !== 'undefined' && navigator.share

  return (
    <div className="flex items-center gap-1">
      {supportsNativeShare ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNativeShare}
          disabled={isSharing}
          className={cn(
            'h-8 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors',
            className
          )}
        >
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyLink}
          disabled={copied}
          className={cn(
            'h-8 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors',
            copied && 'text-green-600',
            className
          )}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Link className="h-4 w-4 mr-1" />
              Copy Link
            </>
          )}
        </Button>
      )}
    </div>
  )
}
