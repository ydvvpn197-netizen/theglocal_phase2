'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCommunitySchema } from '@/lib/utils/validation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'

type CreateCommunityFormData = z.infer<typeof createCommunitySchema>

interface CreateCommunityFormProps {
  onSuccess?: (communitySlug: string) => void
}

export function CreateCommunityForm({ onSuccess }: CreateCommunityFormProps = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const { user, profile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      location_city: profile?.location_city || '',
      is_private: false,
    },
  })

  const onSubmit = async (data: CreateCommunityFormData) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to create a community',
        variant: 'destructive',
      })
      router.push('/auth/signup')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create community')
      }

      toast({
        title: 'Community Created!',
        description: `${data.name} has been created successfully`,
      })

      // Call onSuccess callback if provided
      if (onSuccess && result.data?.slug) {
        onSuccess(result.data.slug)
      } else {
        // Redirect to the new community page
        router.push(`/communities/${result.data.slug}`)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create community',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Community Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          type="text"
          placeholder="e.g., Indiranagar Residents, Bangalore Foodies"
          {...register('name')}
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        <p className="text-xs text-muted-foreground">
          Choose a descriptive name that represents your community
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          placeholder="What is this community about?"
          {...register('description')}
          disabled={isLoading}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="rules" className="text-sm font-medium">
          Community Rules (Optional)
        </label>
        <textarea
          id="rules"
          placeholder="e.g., Be respectful, No spam, Stay on topic"
          {...register('rules')}
          disabled={isLoading}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {errors.rules && <p className="text-sm text-destructive">{errors.rules.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="location_city" className="text-sm font-medium">
          City <span className="text-destructive">*</span>
        </label>
        <Input
          id="location_city"
          type="text"
          placeholder="e.g., Mumbai, Delhi, Bangalore"
          {...register('location_city')}
          disabled={isLoading}
        />
        {errors.location_city && (
          <p className="text-sm text-destructive">{errors.location_city.message}</p>
        )}
        <p className="text-xs text-muted-foreground">This helps people find local communities</p>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_private"
          {...register('is_private')}
          disabled={isLoading}
          className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
        />
        <label htmlFor="is_private" className="text-sm font-medium cursor-pointer">
          Make this a private community (requires admin approval to join)
        </label>
      </div>

      <div className="pt-4">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Community...
            </>
          ) : (
            'Create Community'
          )}
        </Button>
      </div>

      <div className="p-4 bg-muted/50 rounded-md text-sm space-y-2">
        <p className="font-medium">As the creator, you will:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Automatically become the community admin</li>
          <li>Be responsible for moderating content</li>
          <li>Have the ability to add co-admins</li>
          <li>Set and enforce community guidelines</li>
        </ul>
      </div>
    </form>
  )
}
