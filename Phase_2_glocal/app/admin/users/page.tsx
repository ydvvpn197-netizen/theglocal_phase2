'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, AlertTriangle, Ban, Eye } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  anonymous_handle: string
  created_at: string
  is_banned: boolean
  ban_expires_at?: string
  ban_reason?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredUsers(
        users.filter(
          (u) =>
            u.email?.toLowerCase().includes(term) ||
            u.anonymous_handle?.toLowerCase().includes(term) ||
            u.id.includes(term)
        )
      )
    }
  }, [searchTerm, users])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users')
      }

      setUsers(result.data || [])
      setFilteredUsers(result.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBanUser = async (userId: string, duration: 'temporary' | 'permanent') => {
    const reason = prompt(duration === 'temporary' ? 'Reason for temporary ban (7 days):' : 'Reason for permanent ban:')
    if (!reason) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration,
          reason,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to ban user')
      }

      fetchUsers()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to ban user')
    }
  }

  const handleUnbanUser = async (userId: string) => {
    if (!confirm('Are you sure you want to unban this user?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'PUT',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to unban user')
      }

      fetchUsers()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to unban user')
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="mt-2 text-muted-foreground">Manage platform users and moderation actions</p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by email, handle, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No users found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.anonymous_handle}</h3>
                        {user.is_banned && (
                          <Badge variant="destructive">
                            {user.ban_expires_at ? 'Temporarily Banned' : 'Permanently Banned'}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">ID: {user.id}</p>

                      {user.is_banned && user.ban_reason && (
                        <div className="mt-2 rounded-md bg-destructive/10 p-2">
                          <p className="text-sm text-destructive">
                            <strong>Ban Reason:</strong> {user.ban_reason}
                          </p>
                          {user.ban_expires_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {new Date(user.ban_expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {user.is_banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnbanUser(user.id)}
                        >
                          Unban
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBanUser(user.id, 'temporary')}
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Temp Ban (7d)
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBanUser(user.id, 'permanent')}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Permanent Ban
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
