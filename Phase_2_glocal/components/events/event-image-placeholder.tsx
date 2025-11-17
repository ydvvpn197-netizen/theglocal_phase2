import { Film, Music, Drama, Activity, Laugh, GraduationCap, Calendar } from 'lucide-react'

interface EventImagePlaceholderProps {
  category: string
  title: string
}

const categoryConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; gradient: string }
> = {
  movie: {
    icon: Film,
    gradient: 'from-purple-500 to-pink-500',
  },
  concert: {
    icon: Music,
    gradient: 'from-blue-500 to-cyan-500',
  },
  play: {
    icon: Drama,
    gradient: 'from-red-500 to-orange-500',
  },
  theatre: {
    icon: Drama,
    gradient: 'from-red-500 to-orange-500',
  },
  sports: {
    icon: Activity,
    gradient: 'from-green-500 to-emerald-500',
  },
  comedy: {
    icon: Laugh,
    gradient: 'from-yellow-500 to-amber-500',
  },
  workshop: {
    icon: GraduationCap,
    gradient: 'from-indigo-500 to-purple-500',
  },
}

export function EventImagePlaceholder({ category, title }: EventImagePlaceholderProps) {
  const normalizedCategory = category.toLowerCase()
  const config = categoryConfig[normalizedCategory] || {
    icon: Calendar,
    gradient: 'from-gray-500 to-slate-500',
  }

  const Icon = config.icon

  return (
    <div
      className={`relative aspect-video w-full bg-gradient-to-br ${config.gradient} flex items-center justify-center`}
    >
      {/* Icon */}
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <Icon className="h-16 w-16 text-white/90" />
        <div className="text-center">
          <p className="text-sm font-medium text-white/80 line-clamp-2 max-w-xs">{title}</p>
        </div>
      </div>

      {/* Overlay pattern for visual interest */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
    </div>
  )
}
