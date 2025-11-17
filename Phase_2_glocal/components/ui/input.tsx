import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          'flex w-full rounded-md border border-input bg-background px-3 py-2',
          'ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Mobile: 44px minimum height, 16px font-size to prevent iOS zoom
          'min-h-[44px] text-base',
          // Desktop: standard height and font size
          'md:min-h-0 md:h-10 md:text-sm',
          // Touch optimization
          'touch-manipulation',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
