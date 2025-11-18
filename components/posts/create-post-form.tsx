'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPostSchema } from '@/lib/utils/validation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2, Image as ImageIcon, X } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { useUserCommunities } from '@/lib/hooks/use-user-communities'
import { useDraft } from '@/lib/hooks/use-draft'
import { DraftIndicator } from '@/components/posts/draft-indicator'
import { ImageEditor } from '@/components/media/image-editor'
import Image from 'next/image'

type CreatePostFormData = z.infer<typeof createPostSchema>

interface CreatePostFormProps {
  communityId?: string
  onSuccess?: (postId?: string) => void
}

export function CreatePostForm({ communityId, onSuccess }: CreatePostFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [editorFile, setEditorFile] = useState<File | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const { communities, isLoading: isLoadingCommunities } = useUserCommunities()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      community_id: communityId || '',
    },
  })

  const selectedCommunityId = watch('community_id')
  const titleValue = watch('title')
  const bodyValue = watch('body')

  // Initialize draft hook
  const {
    draft,
    updateDraft,
    deleteDraft: clearDraft,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    error: draftError,
  } = useDraft({
    type: 'post',
    initialData: {
      community_id: selectedCommunityId || communityId || '',
    },
    enabled: !!user && !!selectedCommunityId,
  })

  // Restore draft on mount
  useEffect(() => {
    if (draft && user) {
      if (draft.title) setValue('title', draft.title)
      if (draft.body) setValue('body', draft.body)
      if (draft.community_id && draft.community_id !== selectedCommunityId) {
        setValue('community_id', draft.community_id)
      }
    }
  }, [draft, user, setValue, selectedCommunityId])

  // Update draft when form values change
  useEffect(() => {
    if (!user || !selectedCommunityId) return

    const hasContent = titleValue || bodyValue

    if (hasContent) {
      updateDraft({
        title: titleValue || '',
        body: bodyValue || '',
        community_id: selectedCommunityId,
      })
    }
  }, [titleValue, bodyValue, selectedCommunityId, user, updateDraft])

  // Set community_id when communityId prop changes or when communities load
  useEffect(() => {
    if (communityId) {
      setValue('community_id', communityId)
    } else if (communities.length > 0 && !selectedCommunityId) {
      // Auto-select first community if none selected and prop not provided
      const firstCommunity = communities[0]
      if (firstCommunity) {
        setValue('community_id', firstCommunity.id)
      }
    }
  }, [communityId, communities, selectedCommunityId, setValue])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

    // Open editor with selected file
    setEditorFile(file)
    setIsEditorOpen(true)

    // Reset file input
    e.target.value = ''
  }

  const handleEditorSave = (processedFile: File) => {
    setImageFile(processedFile)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(processedFile)
    setEditorFile(null)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setEditorFile(null)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const onSubmit = async (data: CreatePostFormData) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to create a post',
        variant: 'destructive',
      })
      router.push('/auth/signup')
      return
    }

    // Validate that user has joined communities
    if (communities.length === 0) {
      toast({
        title: 'No Communities',
        description: 'You must join a community before creating posts',
        variant: 'destructive',
      })
      return
    }

    // Validate that a community is selected
    if (!data.community_id) {
      toast({
        title: 'Community Required',
        description: 'Please select a community to post to',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      let imageUrl = null

      // Upload image if present (already processed by editor)
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        formData.append('folder', 'posts')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const uploadResult = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'Failed to upload image')
        }

        imageUrl = uploadResult.data.url
      }

      // Create post
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          image_url: imageUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create post')
      }

      toast({
        title: 'Post Created!',
        description: 'Your post has been published',
      })

      // Clear draft on successful post creation
      if (draft) {
        await clearDraft().catch((err) => {
          // Log but don't block on draft deletion failure
          console.error('Failed to clear draft:', err)
        })
      }

      // Reset form but preserve community selection
      const currentCommunityId = selectedCommunityId || communityId || ''
      reset({
        community_id: currentCommunityId,
        title: '',
        body: '',
      })
      removeImage()

      if (onSuccess) {
        onSuccess()
      } else {
        // Redirect to the post
        router.push(`/posts/${result.data.id}`)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create post',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show empty state if user has no communities
  if (!isLoadingCommunities && communities.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            You must join a community before creating posts.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/communities')}
          >
            Browse Communities
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Draft Indicator */}
      {user && selectedCommunityId && (titleValue || bodyValue) && (
        <div className="flex items-center justify-end">
          <DraftIndicator
            isSaving={isSaving}
            lastSaved={lastSaved}
            hasUnsavedChanges={hasUnsavedChanges}
            error={draftError}
          />
        </div>
      )}

      {/* Community Selector */}
      <div className="space-y-2">
        <label htmlFor="community_id" className="text-sm font-medium">
          Community (Joined) <span className="text-destructive">*</span>
        </label>
        {isLoadingCommunities ? (
          <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading communities...
          </div>
        ) : (
          <>
            <Select
              value={selectedCommunityId || ''}
              onValueChange={(value) => setValue('community_id', value)}
              disabled={isLoading || communities.length === 0}
            >
              <SelectTrigger id="community_id">
                <SelectValue placeholder="Select a community..." />
              </SelectTrigger>
              <SelectContent>
                {communities.map((community) => (
                  <SelectItem key={community.id} value={community.id}>
                    {community.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.community_id && (
              <p className="text-sm text-destructive">{errors.community_id.message}</p>
            )}
            <input type="hidden" {...register('community_id')} value={selectedCommunityId || ''} />
          </>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </label>
        <Input
          id="title"
          type="text"
          placeholder="What's on your mind?"
          {...register('title')}
          disabled={isLoading || communities.length === 0}
          onBlur={() => {
            // Trigger immediate save on blur
            if (titleValue || bodyValue) {
              updateDraft({
                title: titleValue || '',
                body: bodyValue || '',
                community_id: selectedCommunityId,
              })
            }
          }}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="body" className="text-sm font-medium">
          Body (Optional)
        </label>
        <textarea
          id="body"
          placeholder="Add more details..."
          {...register('body')}
          disabled={isLoading || communities.length === 0}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          onBlur={() => {
            // Trigger immediate save on blur
            if (titleValue || bodyValue) {
              updateDraft({
                title: titleValue || '',
                body: bodyValue || '',
                community_id: selectedCommunityId,
              })
            }
          }}
        />
        {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Image (Optional)</label>
        {imagePreview ? (
          <div className="relative w-full h-48">
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              className="object-cover rounded-md"
              sizes="(max-width: 768px) 100vw, 600px"
              quality={85}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeImage}
              className="absolute top-2 right-2 z-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Click to upload image</span>
            <span className="text-xs text-muted-foreground mt-1">Max 5MB</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isLoading || communities.length === 0}
            />
          </label>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || communities.length === 0 || !selectedCommunityId}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Posting...
          </>
        ) : (
          'Create Post'
        )}
      </Button>

      {/* Image Editor */}
      <ImageEditor
        open={isEditorOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleEditorClose()
          } else {
            setIsEditorOpen(true)
          }
        }}
        imageFile={editorFile}
        onSave={handleEditorSave}
      />
    </form>
  )
}
