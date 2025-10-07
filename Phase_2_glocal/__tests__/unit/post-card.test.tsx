import { render, screen } from '@testing-library/react'
import { PostCard } from '@/components/posts/post-card'

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock avatar generator
jest.mock('@/lib/utils/avatar-generator', () => ({
  generateAvatarDataUrl: jest.fn(() => 'data:image/svg+xml;base64,test'),
}))

// Mock vote buttons
jest.mock('@/components/posts/vote-buttons', () => ({
  VoteButtons: () => <div data-testid="vote-buttons">Vote Buttons</div>,
}))

// Mock post actions
jest.mock('@/components/posts/post-actions', () => ({
  PostActions: () => <div data-testid="post-actions">Post Actions</div>,
}))

const mockPost = {
  id: 'post-1',
  community_id: 'community-1',
  author_id: 'user-1',
  title: 'Test Post Title',
  body: 'This is a test post body',
  image_url: null,
  location_city: 'San Francisco',
  upvotes: 10,
  downvotes: 2,
  comment_count: 5,
  is_deleted: false,
  is_edited: false,
  created_at: new Date().toISOString(),
  author: {
    anonymous_handle: 'TestUser123',
    avatar_seed: 'seed123',
  },
  community: {
    name: 'Test Community',
    slug: 'test-community',
  },
}

describe('PostCard', () => {
  it('renders post title and body', () => {
    render(<PostCard post={mockPost} />)

    expect(screen.getByText('Test Post Title')).toBeInTheDocument()
    expect(screen.getByText('This is a test post body')).toBeInTheDocument()
  })

  it('displays author anonymous handle', () => {
    render(<PostCard post={mockPost} />)

    expect(screen.getByText('TestUser123')).toBeInTheDocument()
  })

  it('shows community name when showCommunity is true', () => {
    render(<PostCard post={mockPost} showCommunity={true} />)

    expect(screen.getByText(/test-community/)).toBeInTheDocument()
  })

  it('hides community name when showCommunity is false', () => {
    render(<PostCard post={mockPost} showCommunity={false} />)

    expect(screen.queryByText(/test-community/)).not.toBeInTheDocument()
  })

  it('displays location city', () => {
    render(<PostCard post={mockPost} />)

    expect(screen.getByText('San Francisco')).toBeInTheDocument()
  })

  it('shows comment count', () => {
    render(<PostCard post={mockPost} />)

    expect(screen.getByText('5 comments')).toBeInTheDocument()
  })

  it('displays edited badge for edited posts', () => {
    const editedPost = { ...mockPost, is_edited: true }
    render(<PostCard post={editedPost} />)

    expect(screen.getByText('edited')).toBeInTheDocument()
  })

  it('shows [deleted] placeholder for deleted posts', () => {
    const deletedPost = { ...mockPost, is_deleted: true }
    render(<PostCard post={deletedPost} />)

    expect(screen.getByText('[deleted]')).toBeInTheDocument()
    expect(screen.queryByText('Test Post Title')).not.toBeInTheDocument()
  })

  it('renders vote buttons component', () => {
    render(<PostCard post={mockPost} />)

    expect(screen.getByTestId('vote-buttons')).toBeInTheDocument()
  })

  it('renders post actions component', () => {
    render(<PostCard post={mockPost} />)

    expect(screen.getByTestId('post-actions')).toBeInTheDocument()
  })

  it('displays image when image_url is provided', () => {
    const postWithImage = { ...mockPost, image_url: 'https://example.com/image.jpg' }
    render(<PostCard post={postWithImage} />)

    const image = screen.getByAltText('Test Post Title')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('renders time ago correctly for recent posts', () => {
    const recentPost = { ...mockPost, created_at: new Date().toISOString() }
    render(<PostCard post={recentPost} />)

    expect(screen.getByText('just now')).toBeInTheDocument()
  })
})

