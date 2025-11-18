'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Edit, Trash2, MapPin, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { ArtistDeleteDialog } from './artist-delete-dialog'
import { ArtistLocationUpdateDialog } from './artist-location-update-dialog'

interface ArtistProfileActionsProps {
  artistId: string
  stageName: string
  isOwner: boolean
  currentCity?: string
}

export function ArtistProfileActions({
  artistId,
  stageName,
  isOwner,
  currentCity,
}: ArtistProfileActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [locationUpdateOpen, setLocationUpdateOpen] = useState(false)

  if (!isOwner) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Profile actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/artists/${artistId}/edit`} className="flex items-center">
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocationUpdateOpen(true)}>
            <MapPin className="mr-2 h-4 w-4" />
            Update Location
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ArtistLocationUpdateDialog
        open={locationUpdateOpen}
        onOpenChange={setLocationUpdateOpen}
        artistId={artistId}
        currentCity={currentCity}
      />

      <ArtistDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        artistId={artistId}
        stageName={stageName}
      />
    </>
  )
}
