'use client'

import { Button } from '@/components/ui/button'
import { NotificationPreferencesComponent } from '@/components/notifications/notification-preferences'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotificationPreferencesPage() {
  return (
    <div className="container max-w-3xl py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link href="/notifications">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to notifications
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Notification Preferences</h1>
          <p className="text-muted-foreground mt-1">
            Manage which notifications you want to receive
          </p>
        </div>

        {/* Preferences */}
        <NotificationPreferencesComponent />
      </div>
    </div>
  )
}
