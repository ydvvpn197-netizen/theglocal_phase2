'use client'

import { useState, useEffect, useCallback } from 'react'
import { User, Conversation } from '@/lib/types/messages.types'
import { getAvatarUrl } from '@/lib/utils/message-helpers'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, MessageCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useMessages } from '@/lib/context/messages-context'

interface UserSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserSelect: (conversation: Conversation) => void
}

export function UserSearchDialog({ open, onOpenChange, onUserSelect }: UserSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { toast } = useToast()
  const { createConversation } = useMessages()

  // Debounced search
  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setUsers([])
      setHasSearched(false)
      return
    }

    try {
      setIsLoading(true)
      setHasSearched(true)

      const response = await fetch(`/api/messages/search?q=${encodeURIComponent(searchQuery)}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to search users')
      }

      setUsers(result.data || [])
    } catch (error) {
      console.error('Error searching users:', error)
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'Failed to search users',
        variant: 'destructive'
      })
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, searchUsers])

  const handleUserSelect = async (user: User) => {
    try {
      const conversation = await createConversation(user.id)
      onUserSelect(conversation)
      onOpenChange(false)
      setQuery('')
      setUsers([])
      setHasSearched(false)
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      })
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setQuery('')
    setUsers([])
    setHasSearched(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search results */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : hasSearched && users.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 mx-auto">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No users found for "{query}"
                </p>
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getAvatarUrl(user.avatar_seed)} />
                      <AvatarFallback>
                        {user.anonymous_handle.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{user.anonymous_handle}</h3>
                        {user.location_city && (
                          <Badge variant="secondary" className="text-xs">
                            {user.location_city}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(user.join_date).toLocaleDateString()}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleUserSelect(user)}
                      className="flex-shrink-0"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 mx-auto">
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Search for users to start a conversation
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
