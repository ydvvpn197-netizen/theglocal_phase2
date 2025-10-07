import { render, screen } from '@testing-library/react'
import { CommunityCard } from './community-card'

const mockCommunity = {
  id: '123',
  name: 'Test Community',
  slug: 'test-community',
  description: 'A community for testing',
  location_city: 'Mumbai',
  member_count: 150,
  post_count: 42,
  is_private: false,
  is_featured: false,
  created_at: '2025-01-01',
}

describe('CommunityCard', () => {
  it('renders community name', () => {
    render(<CommunityCard community={mockCommunity} />)
    expect(screen.getByText('Test Community')).toBeInTheDocument()
  })

  it('displays member and post counts', () => {
    render(<CommunityCard community={mockCommunity} />)
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows location', () => {
    render(<CommunityCard community={mockCommunity} />)
    expect(screen.getByText('Mumbai')).toBeInTheDocument()
  })

  it('displays featured badge when featured', () => {
    const featured = { ...mockCommunity, is_featured: true }
    render(<CommunityCard community={featured} />)
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('displays private badge when private', () => {
    const privateCommunity = { ...mockCommunity, is_private: true }
    render(<CommunityCard community={privateCommunity} />)
    expect(screen.getByText('Private')).toBeInTheDocument()
  })

  it('shows description when present', () => {
    render(<CommunityCard community={mockCommunity} />)
    expect(screen.getByText('A community for testing')).toBeInTheDocument()
  })

  it('renders as a link to community page', () => {
    render(<CommunityCard community={mockCommunity} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/communities/test-community')
  })
})

