import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VoteButtons } from '@/components/posts/vote-buttons'

// Mock useAuth
const mockUser = { id: 'user-1' }
jest.mock('@/lib/context/auth-context', () => ({
  useAuth: () => ({ user: mockUser }),
}))

// Mock useToast
const mockToast = jest.fn()
jest.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('VoteButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders upvote and downvote counts', () => {
    render(<VoteButtons contentId="post-1" contentType="post" upvotes={10} downvotes={2} />)

    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('handles upvote click', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { upvotes: 11, downvotes: 2, userVote: 'upvote' },
      }),
    })

    render(<VoteButtons contentId="post-1" contentType="post" upvotes={10} downvotes={2} />)

    const buttons = screen.getAllByRole('button')
    const upvoteButton = buttons[0]
    if (!upvoteButton) throw new Error('Upvote button not found')
    fireEvent.click(upvoteButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/posts/post-1/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: 'upvote' }),
      })
    })
  })

  it('handles downvote click', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { upvotes: 10, downvotes: 3, userVote: 'downvote' },
      }),
    })

    render(<VoteButtons contentId="post-1" contentType="post" upvotes={10} downvotes={2} />)

    const buttons = screen.getAllByRole('button')
    const downvoteButton = buttons[1]
    if (!downvoteButton) throw new Error('Downvote button not found')
    fireEvent.click(downvoteButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/posts/post-1/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: 'downvote' }),
      })
    })
  })

  it('uses comment endpoint for comment content type', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { upvotes: 11, downvotes: 2, userVote: 'upvote' },
      }),
    })

    render(<VoteButtons contentId="comment-1" contentType="comment" upvotes={10} downvotes={2} />)

    const buttons = screen.getAllByRole('button')
    const upvoteButton = buttons[0]
    if (!upvoteButton) throw new Error('Upvote button not found')
    fireEvent.click(upvoteButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/comments/comment-1/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: 'upvote' }),
      })
    })
  })

  it('shows error toast on vote failure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to vote' }),
    })

    render(<VoteButtons contentId="post-1" contentType="post" upvotes={10} downvotes={2} />)

    const buttons = screen.getAllByRole('button')
    const upvoteButton = buttons[0]
    if (!upvoteButton) throw new Error('Upvote button not found')
    fireEvent.click(upvoteButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to vote',
        variant: 'destructive',
      })
    })
  })

  it('optimistically updates UI before server response', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  success: true,
                  data: { upvotes: 11, downvotes: 2, userVote: 'upvote' },
                }),
              }),
            100
          )
        )
    )

    render(<VoteButtons contentId="post-1" contentType="post" upvotes={10} downvotes={2} />)

    const buttons = screen.getAllByRole('button')
    const upvoteButton = buttons[0]
    if (!upvoteButton) throw new Error('Upvote button not found')
    fireEvent.click(upvoteButton)

    // Check that UI updates immediately (optimistic)
    await waitFor(() => {
      expect(screen.getByText('11')).toBeInTheDocument()
    })
  })
})
