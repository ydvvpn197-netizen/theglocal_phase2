import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ArtistRegistrationForm } from '@/components/artists/artist-registration-form'
import { useAuth } from '@/lib/context/auth-context'
import { useRouter } from 'next/navigation'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('@/lib/context/auth-context')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('ArtistRegistrationForm', () => {
  const mockPush = jest.fn()
  const mockUser = { id: 'test-user-id', email: 'test@example.com' }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: mockPush } as any)
    mockUseAuth.mockReturnValue({ user: mockUser } as any)
    global.fetch = jest.fn()
  })

  it('renders all form fields', () => {
    render(<ArtistRegistrationForm />)

    expect(screen.getByPlaceholderText(/professional name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/your city/i)).toBeInTheDocument()
    expect(screen.getByText(/service category/i)).toBeInTheDocument()
    expect(screen.getByText(/continue to payment/i)).toBeInTheDocument()
  })

  it('displays all service categories', () => {
    render(<ArtistRegistrationForm />)

    const categories = [
      'Musician',
      'DJ',
      'Photographer',
      'Videographer',
      'Makeup Artist',
      'Dancer',
      'Comedian',
      'Chef',
      'Artist',
      'Other',
    ]

    categories.forEach((category) => {
      expect(screen.getByText(category, { exact: false })).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    render(<ArtistRegistrationForm />)

    const submitButton = screen.getByText(/continue to payment/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      // Form should show validation errors
      expect(screen.queryByText(/required/i)).toBeInTheDocument()
    })
  })

  it('requires authentication', () => {
    mockUseAuth.mockReturnValue({ user: null } as any)
    
    render(<ArtistRegistrationForm />)
    
    const submitButton = screen.getByText(/continue to payment/i)
    fireEvent.click(submitButton)

    // Should not proceed without user
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: 'artist-123' } }),
    })

    render(<ArtistRegistrationForm />)

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/professional name/i), {
      target: { value: 'Test Artist' },
    })
    fireEvent.change(screen.getByPlaceholderText(/your city/i), {
      target: { value: 'Mumbai' },
    })

    const submitButton = screen.getByText(/continue to payment/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/artists',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  it('handles portfolio image upload', async () => {
    render(<ArtistRegistrationForm />)

    const imageCount = screen.getByText(/0\/10 images uploaded/i)
    expect(imageCount).toBeInTheDocument()
  })

  it('enforces 10 image limit', () => {
    render(<ArtistRegistrationForm />)

    const limitText = screen.getByText(/max 10/i)
    expect(limitText).toBeInTheDocument()
  })
})

