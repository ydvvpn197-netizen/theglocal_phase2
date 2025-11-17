'use client'

import { useState } from 'react'
import { BarChart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CreatePollForm } from './create-poll-form'

export function CreatePollModal() {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    // Form handles navigation via router.push, no need for reload
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto" variant="outline">
          <BarChart className="mr-2 h-4 w-4" />
          Create Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a Poll</DialogTitle>
        </DialogHeader>
        <CreatePollForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
