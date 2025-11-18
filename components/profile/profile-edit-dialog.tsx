'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'

const profileSchema = z.object({
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  location_city: z.string().min(1, 'Location is required'),
  show_karma: z.boolean(),
  show_location: z.boolean(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: {
    bio: string | null
    location_city: string | null
    display_preferences?: {
      show_karma?: boolean
      show_location?: boolean
    }
  }
  onSuccess: () => void
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  profile,
  onSuccess,
}: ProfileEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: profile.bio || '',
      location_city: profile.location_city || '',
      show_karma: profile.display_preferences?.show_karma !== false,
      show_location: profile.display_preferences?.show_location !== false,
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: data.bio,
          location_city: data.location_city,
          display_preferences: {
            show_karma: data.show_karma,
            show_location: data.show_location,
          },
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully.',
        })
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and privacy settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              {...register('bio')}
              rows={4}
              className="resize-none"
            />
            {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
            <p className="text-xs text-muted-foreground">Max 500 characters</p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location_city">Location</Label>
            <Input
              id="location_city"
              placeholder="City, State/Country"
              {...register('location_city')}
            />
            {errors.location_city && (
              <p className="text-sm text-destructive">{errors.location_city.message}</p>
            )}
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3 pt-4 border-t">
            <Label>Privacy Settings</Label>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show_karma"
                {...register('show_karma')}
                className="h-4 w-4 rounded border-gray-300"
                aria-label="Show karma on profile"
              />
              <Label htmlFor="show_karma" className="font-normal cursor-pointer">
                Show karma on profile
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show_location"
                {...register('show_location')}
                className="h-4 w-4 rounded border-gray-300"
                aria-label="Show location on profile"
              />
              <Label htmlFor="show_location" className="font-normal cursor-pointer">
                Show location on profile
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
