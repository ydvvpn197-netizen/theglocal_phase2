'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState } from 'react'
import Picker from '@emoji-mart/react'
import type { EmojiMartData } from '@emoji-mart/data'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Smile } from 'lucide-react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** If true, renders only the picker content without Popover wrapper (for embedded use) */
  embedded?: boolean
  /** Callback when picker should close (for embedded mode) */
  onClose?: () => void
}

export function EmojiPicker({
  onEmojiSelect,
  variant = 'ghost',
  size = 'sm',
  embedded = false,
  onClose,
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pickerData, setPickerData] = useState<EmojiMartData | null>(null)

  // Load emoji data asynchronously
  useEffect(() => {
    setMounted(true)

    // Dynamically import the data to ensure it loads properly
    const loadEmojiData = async () => {
      try {
        const emojiData = await import('@emoji-mart/data')
        // Handle both default export and named export
        const data = emojiData.default || emojiData
        if (data) {
          setPickerData(data as EmojiMartData)
        }
      } catch (error) {
        logger.error('Failed to load emoji data:', error)
      }
    }

    loadEmojiData()
  }, [])

  interface EmojiData {
    native: string
    [key: string]: unknown
  }

  const handleEmojiSelect = (emoji: EmojiData) => {
    onEmojiSelect(emoji.native)
    setOpen(false)
    onClose?.()
  }

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Embedded mode: just render the picker content
  if (embedded) {
    if (!mounted || !pickerData) {
      return (
        <div className="w-[352px] h-[435px] flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading emojis...</div>
        </div>
      )
    }

    return (
      <div className="w-[352px] h-[435px]">
        <Picker
          data={pickerData}
          onEmojiSelect={handleEmojiSelect}
          theme="light"
          previewPosition="none"
          skinTonePosition="search"
          emojiSize={20}
          emojiButtonSize={36}
          perLine={9}
          locale="en"
          maxFrequentRows={0}
        />
      </div>
    )
  }

  // Standalone mode: render with Popover wrapper
  if (!mounted || !pickerData) {
    return (
      <Button type="button" variant={variant} size={size} disabled>
        <Smile className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div
      className="relative z-[100]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={variant}
            size={size}
            onClick={handleTriggerClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border shadow-lg bg-background"
          align="start"
          side="top"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="w-[352px] h-[435px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Picker
              data={pickerData}
              onEmojiSelect={handleEmojiSelect}
              theme="light"
              previewPosition="none"
              skinTonePosition="search"
              emojiSize={20}
              emojiButtonSize={36}
              perLine={9}
              locale="en"
              maxFrequentRows={0}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
