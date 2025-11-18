'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useCallback } from 'react'
import { Search, Upload, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Image from 'next/image'

interface GiphyGif {
  id: string
  title: string
  images: {
    fixed_width: {
      url: string
      width: string
      height: string
    }
    downsized: {
      url: string
    }
  }
}

interface GifPickerProps {
  onGifSelect: (gifUrl: string, isExternal: boolean) => void
  onFileSelect: (file: File) => void
}

export function GifPicker({ onGifSelect, onFileSelect }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gifs, setGifs] = useState<GiphyGif[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY

  const loadTrendingGifs = useCallback(async () => {
    if (!apiKey) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`
      )
      const data = await response.json()
      setGifs(data.data || [])
    } catch (error) {
      logger.error('Failed to load trending GIFs:', error)
    } finally {
      setIsSearching(false)
    }
  }, [apiKey])

  // Removed auto-loading of trending GIFs - now only loads when user clicks "Load Trending" button

  const searchGifs = useCallback(async () => {
    if (!apiKey || !searchQuery.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
          searchQuery
        )}&limit=20&rating=g`
      )
      const data = await response.json()
      setGifs(data.data || [])
    } catch (error) {
      logger.error('Failed to search GIFs:', error)
      setGifs([])
    } finally {
      setIsSearching(false)
    }
  }, [apiKey, searchQuery])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchGifs()
    }
  }

  const handleGifSelect = (gif: GiphyGif) => {
    onGifSelect(gif.images.downsized.url, true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'image/gif') {
      onFileSelect(file)
    }
  }

  return (
    <Tabs defaultValue="search" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="search" disabled={!apiKey}>
          <Search className="h-4 w-4 mr-2" />
          Search GIFs
        </TabsTrigger>
        <TabsTrigger value="upload">
          <Upload className="h-4 w-4 mr-2" />
          Upload GIF
        </TabsTrigger>
      </TabsList>

      <TabsContent value="search" className="space-y-4">
        {!apiKey ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Giphy API key not configured</p>
            <p className="text-xs mt-2">Please add NEXT_PUBLIC_GIPHY_API_KEY to your environment</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search for GIFs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSearching}
                />
                <Button
                  type="button"
                  onClick={searchGifs}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={loadTrendingGifs}
                disabled={isSearching}
                className="w-full"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Load Trending GIFs
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {isSearching ? (
                <div className="col-span-2 flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : gifs.length > 0 ? (
                gifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => handleGifSelect(gif)}
                    className="relative aspect-square rounded-md overflow-hidden hover:opacity-75 transition-opacity border border-border"
                    aria-label={`Select GIF: ${gif.title}`}
                  >
                    <Image
                      src={gif.images.fixed_width.url}
                      alt={gif.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))
              ) : hasSearched ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <p className="text-sm">No GIFs found</p>
                </div>
              ) : (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <p className="text-sm">Search for GIFs or load trending ones</p>
                </div>
              )}
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="upload" className="space-y-4">
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
          <Upload className="h-12 w-12 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Click to upload a GIF</span>
          <span className="text-xs text-muted-foreground mt-1">Max 10MB</span>
          <input type="file" accept="image/gif" onChange={handleFileUpload} className="hidden" />
        </label>
      </TabsContent>
    </Tabs>
  )
}
