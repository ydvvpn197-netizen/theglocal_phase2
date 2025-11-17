'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CreateCommunityForm } from './create-community-form'

export function CreateCommunityModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = (communitySlug: string) => {
    setOpen(false)
    router.push(`/communities/${communitySlug}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto" variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Create Community
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Create a Community</DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
          <CreateCommunityForm onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
