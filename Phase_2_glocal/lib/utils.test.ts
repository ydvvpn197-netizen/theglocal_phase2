import { cn } from './utils'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('handles conditional classes', () => {
    expect(cn('base-class', false && 'conditional-class')).toBe('base-class')
    expect(cn('base-class', true && 'conditional-class')).toBe('base-class conditional-class')
  })

  it('merges tailwind classes properly', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })
})
