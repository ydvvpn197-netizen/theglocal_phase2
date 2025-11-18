'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Share2, ArrowBigUp, MessageCircle } from 'lucide-react'
import { ShareDialog } from './share-dialog'

interface RedditItem {
  id: string
  type: 'reddit'
  title: string
  description?: string
  url?: string
  author?: string
  subreddit?: string
  upvotes?: number
  comments?: number
  publishedAt?: string
  imageUrl?: string
}

interface RedditCardProps {
  item: RedditItem
}

export function RedditCard({ item }: RedditCardProps) {
  const [isShareOpen, setIsShareOpen] = useState(false)

  const timeAgo = item.publishedAt ? getTimeAgo(item.publishedAt) : null

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-brand-secondary/10 text-brand-secondary">
                  Reddit
                </Badge>
                {item.subreddit && (
                  <span className="text-sm font-medium text-muted-foreground">
                    r/{item.subreddit}
                  </span>
                )}
                {item.author && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">u/{item.author}</span>
                  </>
                )}
                {timeAgo && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{timeAgo}</span>
                  </>
                )}
              </div>

              <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>

              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {item.description}
                </p>
              )}
            </div>

            {item.imageUrl && (
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
                <Image src={item.imageUrl} alt="" fill className="object-cover" />
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Reddit Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {item.upvotes !== undefined && (
              <div className="flex items-center gap-1">
                <ArrowBigUp className="h-4 w-4" />
                <span>{item.upvotes.toLocaleString()}</span>
              </div>
            )}
            {item.comments !== undefined && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{item.comments.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {item.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Reddit
                </a>
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={() => setIsShareOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share to Community
            </Button>
          </div>
        </CardContent>
      </Card>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        contentType="reddit"
        contentUrl={item.url || ''}
        prefilledTitle={item.title}
        prefilledDescription={item.description || ''}
      />
    </>
  )
}

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return then.toLocaleDateString()
}
