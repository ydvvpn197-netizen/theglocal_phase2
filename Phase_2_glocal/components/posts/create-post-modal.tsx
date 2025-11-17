'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { emitFeedRefresh } from '@/lib/utils/feed-events'

// Lazy load form component for better performance
const CreatePostForm = dynamic(
  () => import('./create-post-form').then((mod) => ({ default: mod.CreatePostForm })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
)

export function CreatePostModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = (postId?: string) => {
    // Emit feed refresh event to update all feeds
    emitFeedRefresh()
    setOpen(false)
    if (postId) {
      router.push(`/posts/${postId}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share with your community</DialogTitle>
        </DialogHeader>
        <CreatePostForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
