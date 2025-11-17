'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Clock, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SearchSuggestion {
  text: string
  type: 'artist' | 'event' | 'community' | 'post' | 'popular' | 'recent'
  count?: number
}

interface SearchBarProps {
  onSearch?: (query: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

const RECENT_SEARCHES_KEY = 'recent_searches'
const MAX_RECENT_SEARCHES = 5

export function SearchBar({
  onSearch,
  placeholder = 'Search artists, events, communities, posts...',
  className = '',
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }, [])

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/v2/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=10`
      )
      const result = await response.json()

      if (result.success && result.data) {
        setSuggestions(result.data)
      } else {
        setSuggestions([])
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (query.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(query)
      }, 300)
    } else {
      setSuggestions([])
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, fetchSuggestions])

  // Save to recent searches
  const saveToRecentSearches = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    try {
      const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(
        0,
        MAX_RECENT_SEARCHES
      )
      setRecentSearches(updated)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  // Handle search
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    saveToRecentSearches(searchQuery)
    setShowSuggestions(false)
    setQuery('')

    if (onSearch) {
      onSearch(searchQuery)
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value)
    setSelectedIndex(-1)
    setShowSuggestions(true)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allSuggestions = [
      ...(query.trim().length < 2
        ? recentSearches.map((s) => ({ text: s, type: 'recent' as const }))
        : []),
      ...suggestions,
    ]

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < allSuggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && allSuggestions[selectedIndex]) {
        handleSearch(allSuggestions[selectedIndex]!.text)
      } else if (query.trim()) {
        handleSearch(query)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  // Highlight matching text in suggestions
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    )
  }

  // Get suggestion icon
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'artist':
        return '🎤'
      case 'event':
        return '📅'
      case 'community':
        return '👥'
      case 'post':
        return '📝'
      case 'popular':
        return '🔥'
      case 'recent':
        return '🕐'
      default:
        return '🔍'
    }
  }

  const allSuggestions = [
    ...(query.trim().length < 2
      ? recentSearches.map((s) => ({ text: s, type: 'recent' as const }))
      : []),
    ...suggestions,
  ]

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          autoFocus={autoFocus}
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            onClick={() => {
              setQuery('')
              setSuggestions([])
              setSelectedIndex(-1)
              inputRef.current?.focus()
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSuggestions && (allSuggestions.length > 0 || isLoading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-lg"
        >
          <div className="max-h-96 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {query.trim().length < 2 && recentSearches.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                      Recent Searches
                    </div>
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent',
                          selectedIndex === index && 'bg-accent'
                        )}
                        onClick={() => handleSearch(search)}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-left">{search}</span>
                      </button>
                    ))}
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div>
                    {query.trim().length >= 2 && (
                      <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                        Suggestions
                      </div>
                    )}
                    {suggestions.map((suggestion, index) => {
                      const actualIndex =
                        query.trim().length < 2 ? recentSearches.length + index : index
                      return (
                        <button
                          key={index}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent',
                            selectedIndex === actualIndex && 'bg-accent'
                          )}
                          onClick={() => handleSearch(suggestion.text)}
                        >
                          <span className="text-base">{getSuggestionIcon(suggestion.type)}</span>
                          <span className="flex-1 text-left">
                            {highlightMatch(suggestion.text, query)}
                          </span>
                          {suggestion.type !== 'recent' && (
                            <Badge variant="secondary" className="text-xs">
                              {suggestion.type}
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
