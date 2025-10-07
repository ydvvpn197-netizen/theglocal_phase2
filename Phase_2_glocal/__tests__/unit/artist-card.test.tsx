import { render, screen } from '@testing-library/react'
import { ArtistCard } from '@/components/artists/artist-card'

const mockArtist = {
  id: 'artist-123',
  user_id: 'user-123',
  stage_name: 'Test Artist',
  service_category: 'musician',
  description: 'A talented musician',
  location_city: 'Mumbai',
  rate_min: 5000,
  rate_max: 15000,
  portfolio_images: ['https://example.com/image1.jpg'],
  profile_views: 42,
  subscription_status: 'active',
  created_at: '2024-01-01T00:00:00Z',
}

describe('ArtistCard', () => {
  it('renders artist information correctly', () => {
    render(<ArtistCard artist={mockArtist} />)

    expect(screen.getByText('Test Artist')).toBeInTheDocument()
    expect(screen.getByText('Mumbai')).toBeInTheDocument()
    expect(screen.getByText('A talented musician')).toBeInTheDocument()
    expect(screen.getByText('₹5,000 - ₹15,000')).toBeInTheDocument()
    expect(screen.getByText('42 views')).toBeInTheDocument()
  })

  it('displays correct category badge', () => {
    render(<ArtistCard artist={mockArtist} />)

    expect(screen.getByText('musician')).toBeInTheDocument()
  })

  it('shows contact for pricing when no rate range', () => {
    const artistWithoutRates = {
      ...mockArtist,
      rate_min: null,
      rate_max: null,
    }

    render(<ArtistCard artist={artistWithoutRates} />)

    expect(screen.getByText('Contact for pricing')).toBeInTheDocument()
  })

  it('renders portfolio image when available', () => {
    render(<ArtistCard artist={mockArtist} />)

    const image = screen.getByAltText('Test Artist')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image1.jpg')
  })

  it('shows placeholder when no portfolio image', () => {
    const artistWithoutImage = {
      ...mockArtist,
      portfolio_images: null,
    }

    render(<ArtistCard artist={artistWithoutImage} />)

    const image = screen.getByAltText('Test Artist')
    expect(image).toHaveAttribute('src', '/placeholder-artist.jpg')
  })

  it('has correct links for view profile and booking', () => {
    render(<ArtistCard artist={mockArtist} />)

    const viewProfileLink = screen.getByRole('link', { name: /view profile/i })
    const bookNowLink = screen.getByRole('link', { name: /book now/i })

    expect(viewProfileLink).toHaveAttribute('href', '/artists/artist-123')
    expect(bookNowLink).toHaveAttribute('href', '/bookings/create?artist=artist-123')
  })

  it('formats rate range correctly', () => {
    const artistWithHighRates = {
      ...mockArtist,
      rate_min: 50000,
      rate_max: 100000,
    }

    render(<ArtistCard artist={artistWithHighRates} />)

    expect(screen.getByText('₹50,000 - ₹100,000')).toBeInTheDocument()
  })

  it('handles single rate correctly', () => {
    const artistWithSingleRate = {
      ...mockArtist,
      rate_min: 10000,
      rate_max: 10000,
    }

    render(<ArtistCard artist={artistWithSingleRate} />)

    expect(screen.getByText('₹10,000 - ₹10,000')).toBeInTheDocument()
  })
})
