'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string
  booking_id: string
  sender_id: string
  message: string
  is_from_artist: boolean
  created_at: string
}

interface BookingMessagesProps {
  bookingId: string
  isArtist: boolean
}

export function BookingMessages({ bookingId, isArtist }: BookingMessagesProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch messages')
      }

      setMessages(result.data || [])
    } catch (error) {
      logger.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setIsSending(true)

    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message')
      }

      setNewMessage('')
      // Refresh messages
      fetchMessages()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages Thread */}
        <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/20">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start the conversation by sending a message below</p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isOwnMessage = message.is_from_artist === isArtist

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isOwnMessage
                          ? 'bg-brand-primary text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {message.is_from_artist ? 'Artist' : 'Client'}
                        </span>
                        <span
                          className={`text-xs ${isOwnMessage ? 'text-white/70' : 'text-muted-foreground'}`}
                        >
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            rows={2}
            maxLength={500}
            className="flex-1"
            disabled={isSending}
          />
          <Button type="submit" disabled={isSending || !newMessage.trim()} className="self-end">
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Maximum {500} characters. Messages are visible to both you and the{' '}
          {isArtist ? 'client' : 'artist'}.
        </p>
      </CardContent>
    </Card>
  )
}
