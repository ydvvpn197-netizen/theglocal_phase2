import { Skeleton } from '@/components/ui/skeleton'

export function NavbarIconsSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-9 w-9 rounded-md" />
      <Skeleton className="h-9 w-9 rounded-md" />
      <Skeleton className="h-9 w-9 rounded-md" />
    </div>
  )
}

export function NavbarIconSkeleton() {
  return <Skeleton className="h-9 w-9 rounded-md" />
}
