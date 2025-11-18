'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Star, Trash2, Plus, Loader2 } from 'lucide-react'
import { useLocation } from '@/lib/context/location-context'
import { useToast } from '@/lib/hooks/use-toast'

interface SavedLocationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Saved Locations Manager Dialog
 *
 * Full-featured dialog for managing user's saved locations
 * - View all saved locations
 * - Add new location
 * - Edit location name
 * - Delete location
 * - Set primary location
 */
export function SavedLocationsDialog({ open, onOpenChange }: SavedLocationsDialogProps) {
  const {
    savedLocations,
    addSavedLocation,
    removeSavedLocation,
    setPrimaryLocation,
    userCity,
    userCoordinates,
    isLoadingSavedLocations,
  } = useLocation()
  const { toast } = useToast()

  const [isAdding, setIsAdding] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Handle adding current location
  const handleAddCurrentLocation = async () => {
    if (!userCity || !userCoordinates) {
      toast({
        title: 'No location set',
        description: 'Please set your current location first.',
        variant: 'destructive',
      })
      return
    }

    if (!newLocationName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this location.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      await addSavedLocation(
        newLocationName.trim(),
        userCity,
        userCoordinates,
        false // Not primary by default
      )

      toast({
        title: 'Location saved!',
        description: `${newLocationName} has been added to your saved locations.`,
      })

      setIsAdding(false)
      setNewLocationName('')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save location. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle setting primary location
  const handleSetPrimary = async (id: string) => {
    try {
      await setPrimaryLocation(id)

      toast({
        title: 'Primary location updated',
        description: 'This location is now your default.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update primary location.',
        variant: 'destructive',
      })
    }
  }

  // Handle deleting location
  const handleDelete = async (id: string) => {
    try {
      await removeSavedLocation(id)

      toast({
        title: 'Location deleted',
        description: 'The location has been removed.',
      })

      setLocationToDelete(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete location.',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Saved Locations
            </DialogTitle>
            <DialogDescription>
              Manage your favorite locations for quick switching
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Loading State */}
            {isLoadingSavedLocations && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty State */}
            {!isLoadingSavedLocations && savedLocations.length === 0 && !isAdding && (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No saved locations yet.</p>
                <Button onClick={() => setIsAdding(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Location
                </Button>
              </div>
            )}

            {/* Saved Locations List */}
            {!isLoadingSavedLocations && savedLocations.length > 0 && (
              <div className="space-y-2">
                {savedLocations.map((location) => (
                  <div
                    key={location.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      location.is_primary ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{location.location_name}</h4>
                        {location.is_primary && (
                          <Star className="h-4 w-4 text-primary fill-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {location.location_city}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!location.is_primary && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimary(location.id)}
                          title="Set as primary"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocationToDelete(location.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Location Form */}
            {isAdding && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="location-name">Location Name</Label>
                  <Input
                    id="location-name"
                    type="text"
                    placeholder="e.g., Home, Office, Hometown"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Current Location</p>
                  <p className="text-sm text-muted-foreground">{userCity || 'Location not set'}</p>
                  {!userCity && (
                    <p className="text-xs text-destructive">
                      Please set your location first using the location selector
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAddCurrentLocation}
                    disabled={!userCity || !userCoordinates || isSaving}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Location'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false)
                      setNewLocationName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Add Location Button */}
            {!isAdding && savedLocations.length > 0 && (
              <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Current Location
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!locationToDelete} onOpenChange={() => setLocationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this saved location? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => locationToDelete && handleDelete(locationToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
