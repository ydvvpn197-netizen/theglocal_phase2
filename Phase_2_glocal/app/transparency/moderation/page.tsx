import { Card, CardContent } from '@/components/ui/card'
import { ModerationLogTable } from '@/components/moderation/moderation-log-table'
import { Shield, Info } from 'lucide-react'

export default function GlobalModerationLogPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-brand-primary" />
            <h1 className="text-3xl font-bold">Global Moderation Log</h1>
          </div>
          <p className="text-muted-foreground">
            Platform-wide transparency log of all moderation actions
          </p>
        </div>

        {/* Transparency Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-start gap-3 pt-6">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-800">Our Commitment to Transparency</p>
              <p className="text-sm text-blue-700">
                We believe in transparent moderation. This public log shows all moderation actions
                taken across the platform. To protect privacy:
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>Moderator identities are anonymized</li>
                <li>Content author identities are not shown</li>
                <li>Only action type, reason, and timestamp are displayed</li>
                <li>Logs are permanent and cannot be deleted</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Global Moderation Log */}
        <ModerationLogTable />
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Global Moderation Log - Theglocal',
  description: 'Transparent log of all moderation actions across the platform',
}
