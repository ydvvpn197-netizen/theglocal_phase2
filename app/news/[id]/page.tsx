'use client'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, Share2, Calendar, Globe } from 'lucide-react'
import { ShareDialog } from '@/components/feed/share-dialog'
import { useState, useEffect } from 'react'
import { sanitizeUserContent } from '@/lib/security/sanitize'
import { logger } from '@/lib/utils/logger'

interface NewsDetailPageProps {
  params: Promise<{ id: string }>
}

interface NewsArticle {
  id: string
  title: string
  description?: string
  url?: string
  source?: string
  publishedAt?: string
  imageUrl?: string
  content?: string
}

export default function NewsDetailPage({ params }: NewsDetailPageProps) {
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [articleId, setArticleId] = useState<string | null>(null)

  useEffect(() => {
    async function getParams() {
      const { id } = await params
      setArticleId(id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    async function fetchArticle() {
      if (!articleId) return

      try {
        setIsLoading(true)
        const response = await fetch(`/api/discover/news/${articleId}`)

        if (response.ok) {
          const result = await response.json()
          setArticle(result.data)
        } else {
          setError('Article not found')
        }
      } catch (error) {
        logger.error('Error fetching news article', error instanceof Error ? error : undefined, {
          articleId,
        })
        setError('Failed to load article')
      } finally {
        setIsLoading(false)
      }
    }

    fetchArticle()
  }, [articleId])

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return notFound()
  }

  const publishedDate = article.publishedAt ? new Date(article.publishedAt) : null
  const formattedDate = publishedDate?.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = publishedDate?.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link href="/discover">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discover
          </Link>
        </Button>

        {/* Article Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-brand-primary/10 text-brand-primary">
              News
            </Badge>
            {article.source && (
              <Badge variant="outline" className="capitalize">
                {article.source}
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold leading-tight">{article.title}</h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {article.source && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span>{article.source}</span>
              </div>
            )}
            {publishedDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {formattedDate} at {formattedTime}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Article Image */}
        {article.imageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority
              quality={90}
            />
          </div>
        )}

        {/* Article Content */}
        <Card>
          <CardContent className="p-6">
            {article.description && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Summary</h2>
                <p className="text-muted-foreground leading-relaxed">{article.description}</p>
              </div>
            )}

            {article.content && (
              <div className="mt-6 space-y-4">
                <h2 className="text-xl font-semibold">Article Content</h2>
                <ArticleContent content={article.content} />
              </div>
            )}

            {!article.content && (
              <div className="mt-6 rounded-lg border border-dashed border-muted-foreground/20 p-8 text-center">
                <p className="text-muted-foreground">
                  Article content preview not available. Click below to read the full article.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  Read the complete article on {article.source || 'the source website'}
                </div>
              </div>

              <div className="flex gap-2">
                {article.url && (
                  <Button asChild>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Read Full Article
                    </a>
                  </Button>
                )}

                <NewsShareButton article={article} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ArticleContent({ content }: { content: string }) {
  const [sanitizedContent, setSanitizedContent] = useState<string>('')

  useEffect(() => {
    // Sanitize HTML on client side after mount
    const sanitized = sanitizeUserContent(content)
    setSanitizedContent(sanitized)
  }, [content])

  if (!sanitizedContent) {
    return null
  }

  return (
    <div
      className="prose prose-sm max-w-none text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}

function NewsShareButton({ article }: { article: NewsArticle }) {
  const [isShareOpen, setIsShareOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setIsShareOpen(true)}>
        <Share2 className="mr-2 h-4 w-4" />
        Share to Community
      </Button>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        contentType="news"
        contentUrl={article.url || ''}
        prefilledTitle={article.title}
        prefilledDescription={article.description || ''}
      />
    </>
  )
}

// Note: generateMetadata removed because this is a client component
// Metadata will be handled by the parent layout or through dynamic updates
