'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FeedItemData {
  id: string
  type: string
  title: string
  description?: string
  url?: string
  source?: string
}

interface FeedItemProps {
  item: FeedItemData
}

export function FeedItem({ item }: FeedItemProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{item.type}</Badge>
          {item.source && <span className="text-sm text-muted-foreground">{item.source}</span>}
        </div>
      </CardHeader>

      <CardContent>
        <h3 className="text-lg font-semibold">{item.title}</h3>
        {item.description && (
          <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
        )}
      </CardContent>
    </Card>
  )
}
