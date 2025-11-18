'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { BookingForm } from './booking-form'
import { useAuth } from '@/lib/context/auth-context'

interface BookingDialogProps {
  artistId: string
  artistName: string
  children: React.ReactNode
}

function BookingDialog({ artistId, artistName, children }: BookingDialogProps) {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()

  // SSR safety check - don't render during server-side rendering
  if (typeof window === 'undefined') {
    return null
  }

  if (!user) {
    return null // Don't render dialog if user is not authenticated
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Booking</DialogTitle>
          <DialogDescription>
            Send a booking request to {artistName}. They will review your request and respond with
            availability and pricing.
          </DialogDescription>
        </DialogHeader>
        <BookingForm
          artistId={artistId}
          artistName={artistName}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

export default BookingDialog
export { BookingDialog }
