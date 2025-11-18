import { Card, CardContent } from '@/components/ui/card'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <WifiOff className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">You&apos;re Offline</h1>
          <p className="text-muted-foreground mb-6">
            It looks like you&apos;ve lost your internet connection. Some features may not be
            available.
          </p>
          <p className="text-sm text-muted-foreground">
            You can still view cached content. Connect to the internet to access all features.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = {
  title: 'Offline - Theglocal',
  description: 'You are currently offline',
}
