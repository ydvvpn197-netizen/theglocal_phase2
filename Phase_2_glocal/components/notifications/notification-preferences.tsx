'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/lib/hooks/use-toast'
import { NotificationPreferences, EmailDigestFrequency } from '@/lib/types/notifications'
import {
  MessageSquare,
  ThumbsUp,
  Calendar,
  Users,
  Music,
  Bell,
  MessageCircle,
  AtSign,
  Shield,
  Mail,
  Moon,
  type LucideIcon,
} from 'lucide-react'
import { PreferenceToggle } from './preference-toggle'

interface PreferenceItem {
  key: keyof Omit<
    NotificationPreferences,
    | 'user_id'
    | 'created_at'
    | 'updated_at'
    | 'email_digest_enabled'
    | 'email_digest_frequency'
    | 'quiet_hours_enabled'
    | 'quiet_hours_start'
    | 'quiet_hours_end'
    | 'quiet_hours_timezone'
  >
  label: string
  description: string
  icon: LucideIcon
  category: 'social' | 'bookings' | 'system'
}

const preferenceItems: PreferenceItem[] = [
  // Social notifications
  {
    key: 'comments_on_post',
    label: 'Comments on my posts',
    description: 'Get notified when someone comments on your post',
    icon: MessageSquare,
    category: 'social',
  },
  {
    key: 'comment_replies',
    label: 'Replies to my comments',
    description: 'Get notified when someone replies to your comment',
    icon: MessageSquare,
    category: 'social',
  },
  {
    key: 'mentions',
    label: 'Mentions',
    description: 'Get notified when someone mentions you (@username)',
    icon: AtSign,
    category: 'social',
  },
  {
    key: 'post_votes',
    label: 'Post upvotes',
    description: 'Get notified when someone upvotes your post',
    icon: ThumbsUp,
    category: 'social',
  },
  {
    key: 'poll_votes',
    label: 'Poll upvotes',
    description: 'Get notified when someone upvotes your poll',
    icon: ThumbsUp,
    category: 'social',
  },
  {
    key: 'comment_votes',
    label: 'Comment upvotes',
    description: 'Get notified when someone upvotes your comment',
    icon: ThumbsUp,
    category: 'social',
  },
  {
    key: 'direct_messages',
    label: 'Direct messages',
    description: 'Get notified when you receive direct messages from other users',
    icon: MessageCircle,
    category: 'social',
  },
  {
    key: 'community_invites',
    label: 'Community invitations',
    description: 'Get notified when invited to join a community',
    icon: Users,
    category: 'social',
  },
  // Booking notifications
  {
    key: 'booking_requests',
    label: 'Booking requests',
    description: 'Get notified when someone requests a booking with you',
    icon: Calendar,
    category: 'bookings',
  },
  {
    key: 'bookings',
    label: 'Booking updates',
    description: 'Get notified about your booking status changes',
    icon: Calendar,
    category: 'bookings',
  },
  {
    key: 'artist_responses',
    label: 'Freelancer/Creator responses',
    description: 'Get notified when freelancers/creators respond to your bookings',
    icon: Music,
    category: 'bookings',
  },
  {
    key: 'booking_messages',
    label: 'Booking messages',
    description: 'Get notified when artists or customers message you about bookings',
    icon: MessageCircle,
    category: 'bookings',
  },
  // System notifications
  {
    key: 'event_reminders',
    label: 'Event reminders',
    description: 'Get notified about upcoming events',
    icon: Bell,
    category: 'system',
  },
  {
    key: 'moderation_actions',
    label: 'Moderation actions',
    description: 'Get notified about moderation actions on your content',
    icon: Shield,
    category: 'system',
  },
]

const categoryLabels = {
  social: 'Social',
  bookings: 'Bookings',
  system: 'System',
}

export function NotificationPreferencesComponent() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      }
    } catch (error) {
      logger.error('Error loading preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const handleToggle = (
    key: keyof Omit<
      NotificationPreferences,
      'user_id' | 'created_at' | 'updated_at' | 'email_digest_frequency' | 'quiet_hours_timezone'
    >
  ) => {
    if (!preferences) return
    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    })
  }

  const handleStringChange = (key: string, value: string) => {
    if (!preferences) return
    setPreferences({
      ...preferences,
      [key]: value,
    })
  }

  const handleSave = async () => {
    if (!preferences) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      if (response.ok) {
        toast({
          title: 'Saved',
          description: 'Your notification preferences have been updated',
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save preferences')
      }
    } catch (error) {
      logger.error('Error saving preferences:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save preferences',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading preferences...</p>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Failed to load preferences</p>
      </div>
    )
  }

  // Group preferences by category
  const groupedPreferences = preferenceItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category]?.push(item)
      return acc
    },
    {} as Record<string, PreferenceItem[]>
  )

  return (
    <div className="space-y-6">
      {/* Notification Type Preferences */}
      {Object.entries(groupedPreferences).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </CardTitle>
            <CardDescription>
              Control which {categoryLabels[category as keyof typeof categoryLabels].toLowerCase()}{' '}
              notifications you receive
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <PreferenceToggle
                    key={item.key}
                    id={item.key}
                    label={item.label}
                    description={item.description}
                    checked={preferences[item.key] as boolean}
                    onCheckedChange={() => handleToggle(item.key)}
                    icon={Icon}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Email Digest Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Digest
          </CardTitle>
          <CardDescription>Receive a summary of your notifications via email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3 flex-1">
              <div className="text-muted-foreground mt-1">
                <Mail className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email_digest_enabled" className="cursor-pointer font-medium">
                  Enable email digest
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive periodic email summaries of your notifications
                </p>
              </div>
            </div>
            <Switch
              id="email_digest_enabled"
              checked={preferences.email_digest_enabled}
              onCheckedChange={() => handleToggle('email_digest_enabled')}
            />
          </div>

          {preferences.email_digest_enabled && (
            <div className="space-y-2 pl-8">
              <Label htmlFor="email_digest_frequency">Digest frequency</Label>
              <Select
                value={preferences.email_digest_frequency}
                onValueChange={(value) =>
                  handleStringChange('email_digest_frequency', value as EmailDigestFrequency)
                }
              >
                <SelectTrigger id="email_digest_frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                How often you want to receive email digests
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiet Hours Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause notifications during specific hours (except critical notifications)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3 flex-1">
              <div className="text-muted-foreground mt-1">
                <Moon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quiet_hours_enabled" className="cursor-pointer font-medium">
                  Enable quiet hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily pause notifications during specific hours
                </p>
              </div>
            </div>
            <Switch
              id="quiet_hours_enabled"
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={() => handleToggle('quiet_hours_enabled')}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="space-y-4 pl-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet_hours_start">Start time</Label>
                  <Input
                    id="quiet_hours_start"
                    type="time"
                    value={
                      preferences.quiet_hours_start
                        ? preferences.quiet_hours_start.substring(0, 5)
                        : '22:00'
                    }
                    onChange={(e) =>
                      handleStringChange('quiet_hours_start', e.target.value + ':00')
                    }
                  />
                  <p className="text-sm text-muted-foreground">When quiet hours begin</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet_hours_end">End time</Label>
                  <Input
                    id="quiet_hours_end"
                    type="time"
                    value={
                      preferences.quiet_hours_end
                        ? preferences.quiet_hours_end.substring(0, 5)
                        : '08:00'
                    }
                    onChange={(e) => handleStringChange('quiet_hours_end', e.target.value + ':00')}
                  />
                  <p className="text-sm text-muted-foreground">When quiet hours end</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet_hours_timezone">Timezone</Label>
                <Input
                  id="quiet_hours_timezone"
                  type="text"
                  placeholder="UTC"
                  value={preferences.quiet_hours_timezone || 'UTC'}
                  onChange={(e) => handleStringChange('quiet_hours_timezone', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Your timezone (e.g., UTC, America/New_York, Europe/London)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save preferences'}
        </Button>
      </div>
    </div>
  )
}
