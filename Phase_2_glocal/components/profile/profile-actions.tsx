'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'
import { ProfileEditDialog } from './profile-edit-dialog'
import { ProfileDeleteDialog } from './profile-delete-dialog'

interface ProfileActionsProps {
  profile: {
    anonymous_handle: string
    bio: string | null
    location_city: string | null
    display_preferences?: {
      show_karma?: boolean
      show_location?: boolean
    }
  }
}

export function ProfileActions({ profile }: ProfileActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const router = useRouter()

  const handleEditSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Account
        </Button>
      </div>

      <ProfileEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onSuccess={handleEditSuccess}
      />

      <ProfileDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        anonymousHandle={profile.anonymous_handle}
      />
    </>
  )
}
