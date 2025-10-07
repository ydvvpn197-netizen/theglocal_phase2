'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createArtistSchema } from '@/lib/utils/validation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'
import { ARTIST_CATEGORIES } from '@/lib/utils/constants'
import { Upload, X, Loader2 } from 'lucide-react'
import Image from 'next/image'

type ArtistFormData = z.infer<typeof createArtistSchema>

export function ArtistRegistrationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [portfolioImages, setPortfolioImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ArtistFormData>({
    resolver: zodResolver(createArtistSchema),
    defaultValues: {
      service_category: ARTIST_CATEGORIES[0],
    },
  })

  const selectedCategory = watch('service_category')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (portfolioImages.length >= 10) {
      toast({
        title: 'Maximum images reached',
        description: 'You can upload maximum 10 portfolio images',
        variant: 'destructive',
      })
      return
    }

    setUploadingImage(true)

    try {
      for (let i = 0; i < Math.min(files.length, 10 - portfolioImages.length); i++) {
        const file = files[i]
        if (!file) continue

        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'portfolios')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload image')
        }

        setPortfolioImages((prev) => [...prev, data.data.url])
      }

      toast({
        title: 'Images uploaded',
        description: 'Portfolio images added successfully',
      })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload images',
        variant: 'destructive',
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = (index: number) => {
    setPortfolioImages((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: ArtistFormData) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to register as an artist',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          portfolio_images: portfolioImages,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create artist profile')
      }

      toast({
        title: 'Profile created',
        description: 'Your artist profile has been created. Complete payment to activate.',
      })

      // Redirect to subscription payment
      router.push(`/artists/${result.data.id}/subscribe`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create profile',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Stage Name */}
      <div>
        <label className="text-sm font-medium">Stage Name / Business Name</label>
        <Input {...register('stage_name')} placeholder="Your professional name" maxLength={100} />
        {errors.stage_name && (
          <p className="mt-1 text-sm text-destructive">{errors.stage_name.message}</p>
        )}
      </div>

      {/* Service Category */}
      <div>
        <label className="text-sm font-medium">Service Category</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ARTIST_CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setValue('service_category', category)}
            >
              {category.replace('_', ' ')}
            </Badge>
          ))}
        </div>
        {errors.service_category && (
          <p className="mt-1 text-sm text-destructive">{errors.service_category.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          {...register('description')}
          placeholder="Tell us about your work, experience, and what makes you unique..."
          rows={6}
          maxLength={1000}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="text-sm font-medium">City</label>
        <Input {...register('location_city')} placeholder="Your city" />
        {errors.location_city && (
          <p className="mt-1 text-sm text-destructive">{errors.location_city.message}</p>
        )}
      </div>

      {/* Rate Range */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Minimum Rate (₹)</label>
          <Input
            type="number"
            {...register('rate_min', { valueAsNumber: true })}
            placeholder="5000"
            min={0}
          />
          {errors.rate_min && (
            <p className="mt-1 text-sm text-destructive">{errors.rate_min.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Maximum Rate (₹)</label>
          <Input
            type="number"
            {...register('rate_max', { valueAsNumber: true })}
            placeholder="25000"
            min={0}
          />
          {errors.rate_max && (
            <p className="mt-1 text-sm text-destructive">{errors.rate_max.message}</p>
          )}
        </div>
      </div>

      {/* Portfolio Images */}
      <div>
        <label className="text-sm font-medium">Portfolio Images (Max 10)</label>
        <p className="mb-2 text-sm text-muted-foreground">Upload images showcasing your work</p>

        {/* Upload Button */}
        <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 hover:border-brand-primary/50">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            disabled={uploadingImage || portfolioImages.length >= 10}
          />
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {uploadingImage ? 'Uploading...' : 'Click to upload images'}
            </p>
          </div>
        </label>

        {/* Image Grid */}
        {portfolioImages.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 md:grid-cols-5">
            {portfolioImages.map((url, index) => (
              <div key={index} className="group relative aspect-square overflow-hidden rounded-lg">
                <Image src={url} alt={`Portfolio ${index + 1}`} fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-2 text-sm text-muted-foreground">
          {portfolioImages.length}/10 images uploaded
        </p>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isLoading} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Profile...
          </>
        ) : (
          'Continue to Payment'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        By registering, you agree to our terms. You&apos;ll be redirected to complete the
        subscription after profile creation.
      </p>
    </form>
  )
}
