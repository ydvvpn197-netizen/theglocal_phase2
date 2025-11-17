'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { NotificationList } from '@/components/notifications/notification-list'
import { useNotifications } from '@/lib/context/notification-context'
import Link from 'next/link'
import { Settings, CheckCheck } from 'lucide-react'

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all')
  const { unreadCount, markAllAsRead } = useNotifications()

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">Stay updated with what's happening</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            <Link href="/notifications/preferences">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {unreadCount > 0 && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-brand-primary/50">
            <p className="text-sm">
              <span className="font-semibold">{unreadCount}</span> unread notification
              {unreadCount !== 1 ? 's' : ''}
            </p>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread' | 'read')}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-brand-primary text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <NotificationList filter="all" />
          </TabsContent>

          <TabsContent value="unread" className="mt-6">
            <NotificationList filter="unread" />
          </TabsContent>

          <TabsContent value="read" className="mt-6">
            <NotificationList filter="read" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
