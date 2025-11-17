'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, Users, FileText, Music, Loader2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { highlightSearchTerms } from '@/lib/utils/search'
import { getAvatarUrl } from '@/lib/utils/message-helpers'

interface SearchResult {
  id: string
  type: 'artist' | 'event' | 'community' | 'post'
  relevanceScore?: number
  distance_km?: number
  [key: string]: unknown
}

interface SearchResultsProps {
  results: SearchResult[]
  query: string
  isLoading?: boolean
  className?: string
}

export function SearchResults({
  results,
  query,
  isLoading = false,
  className = '',
}: SearchResultsProps) {
  const searchTerms = useMemo(() => {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 0)
  }, [query])

  const highlightText = (text: string) => {
    if (!text) return null
    const segments = highlightSearchTerms(text, searchTerms)
    return (
      <span>
        {segments.map((segment, index) =>
          segment.highlighted ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 rounded px-0.5">
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        )}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No results found"
        description={`We couldn't find anything matching "${query}". Try different keywords or adjust your filters.`}
        className={className}
      />
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {results.map((result) => {
        if (result.type === 'artist') {
          return <ArtistResultCard key={result.id} result={result} highlightText={highlightText} />
        }
        if (result.type === 'event') {
          return <EventResultCard key={result.id} result={result} highlightText={highlightText} />
        }
        if (result.type === 'community') {
          return (
            <CommunityResultCard key={result.id} result={result} highlightText={highlightText} />
          )
        }
        if (result.type === 'post') {
          return <PostResultCard key={result.id} result={result} highlightText={highlightText} />
        }
        return null
      })}
    </div>
  )
}

function ArtistResultCard({
  result,
  highlightText,
}: {
  result: SearchResult
  highlightText: (text: string) => JSX.Element | null
}) {
  const stageName = String(result.stage_name || '')
  const description = String(result.description || '')
  const category = String(result.service_category || '')
  const city = String(result.location_city || '')
  const distance = result.distance_km as number | undefined

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              {highlightText(stageName) || stageName}
            </CardTitle>
            <CardDescription className="mt-1">
              {highlightText(description) || description}
            </CardDescription>
          </div>
          <Badge variant="secondary">{category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {city}
            </div>
            {distance !== undefined && (
              <div className="flex items-center gap-1">
                <span>{distance.toFixed(1)} km away</span>
              </div>
            )}
          </div>
          <Link href={`/artists/${result.id}`}>
            <Badge variant="outline" className="cursor-pointer">
              View Profile
            </Badge>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function EventResultCard({
  result,
  highlightText,
}: {
  result: SearchResult
  highlightText: (text: string) => JSX.Element | null
}) {
  const title = String(result.title || '')
  const description = String(result.description || '')
  const city = String(result.location_city || '')
  const eventDate = result.event_date ? new Date(String(result.event_date)) : null
  const distance = result.distance_km as number | undefined

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{highlightText(title) || title}</CardTitle>
            <CardDescription className="mt-1">
              {highlightText(description) || description}
            </CardDescription>
          </div>
          {eventDate && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {eventDate.toLocaleDateString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {city}
            </div>
            {distance !== undefined && (
              <div className="flex items-center gap-1">
                <span>{distance.toFixed(1)} km away</span>
              </div>
            )}
          </div>
          <Link href={`/events/${result.id}`}>
            <Badge variant="outline" className="cursor-pointer">
              View Event
            </Badge>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function CommunityResultCard({
  result,
  highlightText,
}: {
  result: SearchResult
  highlightText: (text: string) => JSX.Element | null
}) {
  const name = String(result.name || '')
  const description = String(result.description || '')
  const city = String(result.location_city || '')
  const memberCount = (result.member_count as number) || 0
  const distance = result.distance_km as number | undefined

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {highlightText(name) || name}
            </CardTitle>
            <CardDescription className="mt-1">
              {highlightText(description) || description}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {memberCount} members
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {city}
            </div>
            {distance !== undefined && (
              <div className="flex items-center gap-1">
                <span>{distance.toFixed(1)} km away</span>
              </div>
            )}
          </div>
          <Link href={`/communities/${result.slug || result.id}`}>
            <Badge variant="outline" className="cursor-pointer">
              View Community
            </Badge>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function PostResultCard({
  result,
  highlightText,
}: {
  result: SearchResult
  highlightText: (text: string) => JSX.Element | null
}) {
  const title = String(result.title || '')
  const body = String(result.body || '')
  const city = String(result.location_city || '')
  const author = result.author as { anonymous_handle?: string; avatar_seed?: string } | undefined
  const community = result.community as { name?: string; slug?: string } | undefined
  const createdAt = result.created_at ? new Date(String(result.created_at)) : null

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {highlightText(title) || title}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {highlightText(body) || body}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {author && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={getAvatarUrl(author.avatar_seed || '')} />
                  <AvatarFallback>
                    {author.anonymous_handle?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span>{author.anonymous_handle}</span>
              </div>
            )}
            {community && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {community.name}
              </div>
            )}
            {city && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {city}
              </div>
            )}
            {createdAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {createdAt.toLocaleDateString()}
              </div>
            )}
          </div>
          <Link href={`/posts/${result.id}`}>
            <Badge variant="outline" className="cursor-pointer">
              View Post
            </Badge>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
