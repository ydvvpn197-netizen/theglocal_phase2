'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  MessageCircle,
  Trash2,
  Edit3,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  Clock,
  HardDrive,
  Cloud,
  Search,
} from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'
import {
  getDrafts,
  deleteDraft,
  exportDrafts,
  importDrafts,
  clearAllDrafts,
  DraftData,
  DraftMetadata,
} from '@/lib/utils/draft-manager'
interface DraftManagerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSelectDraft?: (draft: DraftData) => void
  onCreateFromDraft?: (draft: DraftData) => void
}

export function DraftManager({
  isOpen,
  onOpenChange,
  onSelectDraft: _onSelectDraft,
  onCreateFromDraft,
}: DraftManagerProps) {
  const [drafts, setDrafts] = useState<DraftData[]>([])
  const [metadata, setMetadata] = useState<DraftMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'post' | 'comment'>('all')
  const [selectedDraft, setSelectedDraft] = useState<DraftData | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [importData, setImportData] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()

  // Load drafts and metadata from both database and localStorage
  const loadDrafts = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch from database
      const response = await fetch('/api/drafts')
      let databaseDrafts: DraftData[] = []

      if (response.ok) {
        const result = await response.json()
        databaseDrafts = result.data || []
      }

      // Get from localStorage
      const localDrafts = getDrafts(user.id)

      // Merge drafts (database takes precedence for conflicts)
      const draftMap = new Map<string, DraftData>()

      // Add local drafts first
      localDrafts.forEach((draft) => {
        draftMap.set(draft.id, draft)
      })

      // Override with database drafts (they're more up-to-date)
      databaseDrafts.forEach((draft) => {
        draftMap.set(draft.id, { ...draft, is_synced: true })
      })

      const mergedDrafts = Array.from(draftMap.values())

      // Calculate metadata
      const unsavedDrafts = mergedDrafts.filter((d) => !d.is_synced)
      const lastAutoSave =
        mergedDrafts.length > 0
          ? mergedDrafts.reduce(
              (latest, draft) =>
                new Date(draft.last_saved_at || '') > new Date(latest)
                  ? draft.last_saved_at || ''
                  : latest,
              mergedDrafts[0]?.last_saved_at || ''
            )
          : null

      const storageUsage = JSON.stringify(mergedDrafts).length * 2 // Rough UTF-16 byte estimate

      const draftMetadata: DraftMetadata = {
        total_drafts: mergedDrafts.length,
        unsaved_drafts: unsavedDrafts.length,
        last_auto_save: lastAutoSave || null,
        storage_usage: storageUsage,
      }

      setDrafts(mergedDrafts)
      setMetadata(draftMetadata)

      logger.info(
        `📋 Loaded ${mergedDrafts.length} drafts (${databaseDrafts.length} from database, ${localDrafts.length} from localStorage)`
      )
    } catch (error) {
      logger.error('Failed to load drafts:', error)
      toast({
        title: 'Failed to load drafts',
        description: 'Could not load your saved drafts.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  // Load drafts when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      loadDrafts()
    }
  }, [isOpen, user, loadDrafts])

  // Filter drafts based on search and type
  const filteredDrafts = drafts.filter((draft) => {
    const matchesSearch =
      searchQuery === '' ||
      draft.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.body.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = filterType === 'all' || draft.type === filterType

    return matchesSearch && matchesType
  })

  // Handle draft deletion
  const handleDeleteDraft = useCallback(
    async (draftId: string) => {
      try {
        setLoading(true)

        // Delete from database
        const response = await fetch(`/api/drafts/${draftId}`, {
          method: 'DELETE',
        })

        if (!response.ok && response.status !== 404) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete draft from database')
        }

        // Delete from localStorage
        deleteDraft(draftId)

        await loadDrafts()
        toast({
          title: 'Draft deleted',
          description: 'The draft has been permanently deleted.',
        })
      } catch (error) {
        toast({
          title: 'Deletion failed',
          description:
            error instanceof Error
              ? error.message
              : 'Could not delete the draft. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
        setShowDeleteDialog(null)
      }
    },
    [loadDrafts, toast]
  )

  // Handle clear all drafts
  const handleClearAllDrafts = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)

      // Delete from database
      const response = await fetch('/api/drafts', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete drafts from database')
      }

      // Clear localStorage
      clearAllDrafts()

      await loadDrafts()

      toast({
        title: 'All drafts cleared',
        description: 'All saved drafts have been permanently deleted.',
      })
    } catch (error) {
      toast({
        title: 'Clear failed',
        description:
          error instanceof Error ? error.message : 'Could not clear drafts. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setShowClearDialog(false)
    }
  }, [user, loadDrafts, toast])

  // Handle draft recovery from server
  const handleRecoverDrafts = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch from database
      const response = await fetch('/api/drafts')
      if (!response.ok) {
        throw new Error('Failed to fetch drafts from server')
      }

      const result = await response.json()
      const serverDrafts = result.data || []

      // Merge with local drafts (server takes precedence)
      const localDrafts = getDrafts(user.id)
      const mergedDrafts = new Map<string, DraftData>()

      localDrafts.forEach((draft) => {
        mergedDrafts.set(draft.id, draft)
      })

      serverDrafts.forEach((draft: DraftData) => {
        mergedDrafts.set(draft.id, { ...draft, is_synced: true })
      })

      // Update localStorage with merged drafts
      const { updateDraft: updateLocalDraft } = await import('@/lib/utils/draft-manager')
      Array.from(mergedDrafts.values()).forEach((draft) => {
        updateLocalDraft(draft.id, draft)
      })

      await loadDrafts()

      toast({
        title: 'Drafts recovered',
        description: `Recovered ${serverDrafts.length} drafts from server.`,
      })
    } catch (error) {
      toast({
        title: 'Recovery failed',
        description:
          error instanceof Error ? error.message : 'Could not recover drafts from server.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [user, loadDrafts, toast])

  // Handle draft export
  const handleExportDrafts = useCallback(() => {
    try {
      const exportData = exportDrafts()
      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `drafts-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)

      toast({
        title: 'Drafts exported',
        description: 'Your drafts have been downloaded as a backup file.',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export drafts.',
        variant: 'destructive',
      })
    }
  }, [toast])

  // Handle draft import
  const handleImportDrafts = useCallback(() => {
    if (!user || !importData.trim()) return

    try {
      setLoading(true)
      const importedCount = importDrafts(importData, user.id)
      loadDrafts()

      toast({
        title: 'Drafts imported',
        description: `Successfully imported ${importedCount} drafts.`,
      })

      setImportData('')
      setShowImportDialog(false)
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Could not import drafts. Please check the data format.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [user, importData, loadDrafts, toast])

  const formatStorageSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getDraftPreview = (draft: DraftData) => {
    const text = draft.title || draft.body
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }

  const getDraftIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <FileText className="h-4 w-4" />
      case 'comment':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Draft Manager
              {metadata && <Badge variant="outline">{metadata.total_drafts} drafts</Badge>}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="drafts" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="drafts">My Drafts</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="backup">Backup</TabsTrigger>
            </TabsList>

            <TabsContent value="drafts" className="flex-1 flex flex-col min-h-0">
              {/* Search and Filter */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search drafts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'post' | 'comment')}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="post">Posts</option>
                  <option value="comment">Comments</option>
                </select>
                <Button variant="outline" size="sm" onClick={loadDrafts}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Drafts List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredDrafts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No drafts found</p>
                    <p className="text-sm mt-2">
                      {searchQuery || filterType !== 'all'
                        ? 'Try adjusting your search or filter'
                        : 'Your drafts will appear here as you write'}
                    </p>
                  </div>
                ) : (
                  filteredDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getDraftIcon(draft.type)}
                            <Badge variant="outline" className="text-xs">
                              {draft.type}
                            </Badge>
                            {!draft.is_synced && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Unsaved
                              </Badge>
                            )}
                            {draft.auto_saved && (
                              <Badge variant="secondary" className="text-xs">
                                Auto-saved
                              </Badge>
                            )}
                          </div>

                          <p className="font-medium text-sm truncate">
                            {draft.title || 'Untitled'}
                          </p>

                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {getDraftPreview(draft)}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                            </span>
                            {draft.media_items.length > 0 && (
                              <span>📎 {draft.media_items.length} media</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedDraft(draft)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setShowDeleteDialog(draft.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              {/* Storage Info */}
              {metadata && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="h-4 w-4" />
                      <span className="font-medium">Local Storage</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatStorageSize(metadata.storage_usage)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {metadata.total_drafts} drafts stored
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Cloud className="h-4 w-4" />
                      <span className="font-medium">Cloud Sync</span>
                    </div>
                    <p className="text-2xl font-bold">{metadata.unsaved_drafts}</p>
                    <p className="text-xs text-muted-foreground">unsaved drafts</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleRecoverDrafts}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recover Drafts from Server
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => setShowClearDialog(true)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Drafts
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="backup" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Export Drafts</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download all your drafts as a backup file.
                  </p>
                  <Button onClick={handleExportDrafts}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Drafts
                  </Button>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Import Drafts</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Restore drafts from a backup file.
                  </p>
                  <Button onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Drafts
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Preview/Edit Dialog */}
      <Dialog open={!!selectedDraft} onOpenChange={() => setSelectedDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Draft Preview</DialogTitle>
          </DialogHeader>

          {selectedDraft && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getDraftIcon(selectedDraft.type)}
                <Badge variant="outline">{selectedDraft.type}</Badge>
                <span className="text-sm text-muted-foreground">
                  Created{' '}
                  {formatDistanceToNow(new Date(selectedDraft.created_at), { addSuffix: true })}
                </span>
              </div>

              {selectedDraft.title && (
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <p className="text-sm p-2 bg-muted rounded mt-1">{selectedDraft.title}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Content</label>
                <p className="text-sm p-2 bg-muted rounded mt-1 max-h-32 overflow-y-auto">
                  {selectedDraft.body || 'No content'}
                </p>
              </div>

              {selectedDraft.media_items.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Media Attachments</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedDraft.media_items.length} attachment
                    {selectedDraft.media_items.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDraft(null)}>
              Close
            </Button>
            {selectedDraft && onCreateFromDraft && (
              <Button
                onClick={() => {
                  onCreateFromDraft(selectedDraft)
                  setSelectedDraft(null)
                  onOpenChange(false)
                }}
              >
                Continue Editing
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDeleteDraft(showDeleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Drafts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all drafts? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllDrafts}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Drafts</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste the exported draft data below to restore your drafts.
            </p>
            <Textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste exported draft data here..."
              rows={10}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportDrafts} disabled={!importData.trim() || loading}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
