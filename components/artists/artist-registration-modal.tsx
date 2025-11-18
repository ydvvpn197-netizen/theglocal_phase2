'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArtistForm } from './artist-form'

export function ArtistRegistrationModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = (_artistId: string) => {
    setOpen(false)
    router.push('/artists/dashboard')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto" variant="outline">
          <Briefcase className="mr-2 h-4 w-4" />
          Register as Freelancer/Creator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register as Freelancer/Creator</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subscription Info */}
          <div className="border-brand-primary/20 bg-brand-primary/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold">Freelancer/Creator Subscription Plan</h3>
              <Badge variant="secondary" className="text-xs">
                ₹100/month
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Optional - Required for bookings • 30-day free trial • Unlimited events • Portfolio
              showcase
            </p>
          </div>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Your Freelancer/Creator Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <ArtistForm mode="create" onSuccess={handleSuccess} />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
