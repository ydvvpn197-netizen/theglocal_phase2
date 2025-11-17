'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  title: string
  isExternal?: boolean
}

export function EventModal({ isOpen, onClose, url, title, isExternal = false }: EventModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [iframeError, setIframeError] = useState(false)

  // Reset loading state when modal opens/closes or URL changes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setIframeError(false)
    }
  }, [isOpen, url])

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setIframeError(true)
  }

  const openInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            {isExternal && (
              <Button variant="ghost" size="sm" onClick={openInNewTab} className="ml-auto mr-8">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="relative flex-1 w-full overflow-hidden">
          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Iframe Error Message */}
          {iframeError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background p-8">
              <div className="text-center space-y-4 max-w-md">
                <p className="text-muted-foreground">
                  This content cannot be displayed in a popup.
                </p>
                <Button onClick={openInNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              src={url}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={title}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
