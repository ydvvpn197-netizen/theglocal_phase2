'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/lib/context/auth-context'
import { NavbarIconSkeleton } from '@/components/layout/navbar-icons-skeleton'
import { generateAvatarDataUrl } from '@/lib/utils/avatar-generator'

function ProfileDropdownComponent() {
  const router = useRouter()
  const { user, profile, isLoading } = useAuth()

  if (!user) return null

  const handleProfileClick = () => {
    router.push('/profile')
  }

  // Show skeleton while profile is loading
  if (isLoading) {
    return <NavbarIconSkeleton />
  }

  // Generate avatar from user's avatar_seed
  const avatarDataUrl = profile?.avatar_seed ? generateAvatarDataUrl(profile.avatar_seed) : null

  // Get user initial for fallback
  const userInitial = profile?.anonymous_handle?.charAt(0).toUpperCase() || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full p-0"
          aria-label="Profile menu"
        >
          <Avatar className="h-10 w-10">
            {avatarDataUrl && <AvatarImage src={avatarDataUrl} alt="" />}
            <AvatarFallback className="bg-muted text-sm font-medium">{userInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.anonymous_handle || 'Anonymous'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const ProfileDropdown = memo(ProfileDropdownComponent)
