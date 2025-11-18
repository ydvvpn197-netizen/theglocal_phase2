'use client'

import { calculatePollResults } from '@/lib/utils/poll-anonymity'
import { CheckCircle2 } from 'lucide-react'

interface PollOption {
  id: string
  text: string
  vote_count: number
}

interface PollResultsProps {
  options: PollOption[]
  totalVotes: number
  userSelectedOption?: string
}

export function PollResults({ options, totalVotes, userSelectedOption }: PollResultsProps) {
  const results = calculatePollResults(options)

  // Find the winning option(s)
  const maxVotes = Math.max(...results.map((r) => r.vote_count))
  const winners = results.filter((r) => r.vote_count === maxVotes)

  return (
    <div className="space-y-3">
      {results.map((option) => {
        const isWinning = winners.some((w) => w.id === option.id) && totalVotes > 0
        const isUserChoice = userSelectedOption === option.id

        return (
          <div key={option.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={isUserChoice ? 'font-semibold' : ''}>{option.text}</span>
                {isUserChoice && <CheckCircle2 className="h-4 w-4 text-brand-primary" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{option.percentage}%</span>
                <span className="text-muted-foreground">
                  ({option.vote_count.toLocaleString()})
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-500 ${
                  isWinning ? 'bg-brand-primary' : 'bg-brand-secondary/60'
                }`}
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
