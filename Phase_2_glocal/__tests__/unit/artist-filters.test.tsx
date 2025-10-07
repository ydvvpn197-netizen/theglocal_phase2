import { render, screen, fireEvent } from '@testing-library/react'
import { ArtistFilters } from '@/components/artists/artist-filters'

describe('ArtistFilters', () => {
  const mockOnSearchChange = jest.fn()
  const mockOnCategoryChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search input and category filters', () => {
    render(
      <ArtistFilters onSearchChange={mockOnSearchChange} onCategoryChange={mockOnCategoryChange} />
    )

    expect(screen.getByPlaceholderText('Search artists by name or skill...')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('calls onSearchChange with debounced input', async () => {
    render(
      <ArtistFilters onSearchChange={mockOnSearchChange} onCategoryChange={mockOnCategoryChange} />
    )

    const searchInput = screen.getByPlaceholderText('Search artists by name or skill...')

    fireEvent.change(searchInput, { target: { value: 'test search' } })

    // Should not call immediately
    expect(mockOnSearchChange).not.toHaveBeenCalled()

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(mockOnSearchChange).toHaveBeenCalledWith('test search')
  })

  it('calls onCategoryChange when category is clicked', () => {
    render(
      <ArtistFilters onSearchChange={mockOnSearchChange} onCategoryChange={mockOnCategoryChange} />
    )

    const musicianBadge = screen.getByText('Musician')
    fireEvent.click(musicianBadge)

    expect(mockOnCategoryChange).toHaveBeenCalledWith('musician')
  })

  it('handles all category selection', () => {
    render(
      <ArtistFilters onSearchChange={mockOnSearchChange} onCategoryChange={mockOnCategoryChange} />
    )

    const allBadge = screen.getByText('All')
    fireEvent.click(allBadge)

    expect(mockOnCategoryChange).toHaveBeenCalledWith('all')
  })

  it('works without callback props', () => {
    render(<ArtistFilters />)

    const searchInput = screen.getByPlaceholderText('Search artists by name or skill...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    // Should not throw error
    expect(searchInput).toHaveValue('test')
  })

  it('shows all artist categories', () => {
    render(
      <ArtistFilters onSearchChange={mockOnSearchChange} onCategoryChange={mockOnCategoryChange} />
    )

    // Check for common categories
    expect(screen.getByText('Musician')).toBeInTheDocument()
    expect(screen.getByText('DJ')).toBeInTheDocument()
    expect(screen.getByText('Photographer')).toBeInTheDocument()
    expect(screen.getByText('Videographer')).toBeInTheDocument()
  })

  it('updates selected category visually', () => {
    render(
      <ArtistFilters onSearchChange={mockOnSearchChange} onCategoryChange={mockOnCategoryChange} />
    )

    const musicianBadge = screen.getByText('Musician')
    fireEvent.click(musicianBadge)

    // The badge should have the selected variant
    expect(musicianBadge).toHaveClass('bg-primary')
  })
})
