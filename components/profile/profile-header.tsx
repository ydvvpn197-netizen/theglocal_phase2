'use client'

import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { MapPin, Edit, Cake } from 'lucide-react'
import { generateAvatarDataUrl } from '@/lib/utils/avatar-generator'
import { formatJoinDate, formatKarma, getRoleBadgeVariant } from '@/lib/utils/profile-helpers'
import { DirectMessageButton } from '@/components/messages/direct-message-button'
import { ReportButton } from '@/components/moderation/report-button'

interface ProfileHeaderProps {
  profile: {
    id: string
    anonymous_handle: string
    avatar_seed: string
    location_city: string | null
    bio: string | null
    created_at: string
    stats: {
      total_karma: number
    }
    artist: {
      stage_name: string
      service_category: string
      subscription_status: string
    } | null
    roles: Array<{
      role: string
      community: {
        name: string
        slug: string
      }
    }>
    display_preferences?: {
      show_karma?: boolean
      show_location?: boolean
    }
  }
  isOwnProfile?: boolean
  onEdit?: () => void
}

export function ProfileHeader({ profile, isOwnProfile = false, onEdit }: ProfileHeaderProps) {
  const avatarDataUrl = generateAvatarDataUrl(profile.avatar_seed)
  const joinDateText = formatJoinDate(profile.created_at)
  const showKarma = profile.display_preferences?.show_karma !== false
  const showLocation = profile.display_preferences?.show_location !== false

  // Get unique roles
  const uniqueRoles = new Set(profile.roles.map((r) => r.role))
  const isAdmin = uniqueRoles.has('admin')
  const isModerator = uniqueRoles.has('moderator')

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <Image src={avatarDataUrl} alt={profile.anonymous_handle} width={128} height={128} />
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            {/* Handle and Badges */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl md:text-3xl font-bold font-mono">
                  u/{profile.anonymous_handle}
                </h1>
                <div className="flex gap-2">
                  {!isOwnProfile && (
                    <>
                      <DirectMessageButton
                        userId={profile.id}
                        userHandle={profile.anonymous_handle}
                        variant="default"
                        size="sm"
                      />
                      <ReportButton
                        contentType="user"
                        contentId={profile.id}
                        variant="outline"
                        size="sm"
                      />
                    </>
                  )}
                  {isOwnProfile && onEdit && (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {profile.artist && (
                  <Badge variant="secondary">
                    Artist: {profile.artist.service_category.replace('_', ' ')}
                  </Badge>
                )}
                {isAdmin && <Badge variant={getRoleBadgeVariant('admin')}>Admin</Badge>}
                {isModerator && !isAdmin && (
                  <Badge variant={getRoleBadgeVariant('moderator')}>Moderator</Badge>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Cake className="h-4 w-4" />
                <span>{joinDateText}</span>
              </div>

              {showKarma && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">
                    {formatKarma(profile.stats.total_karma)}
                  </span>
                  <span>karma</span>
                </div>
              )}

              {showLocation && profile.location_city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location_city}</span>
                </div>
              )}
            </div>

            {/* Admin/Mod Communities */}
            {profile.roles.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  {isAdmin ? 'Admin' : 'Moderator'} of:
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.roles.slice(0, 5).map((roleInfo, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      c/{roleInfo.community.slug}
                    </Badge>
                  ))}
                  {profile.roles.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{profile.roles.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
