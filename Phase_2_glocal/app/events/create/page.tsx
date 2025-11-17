import { redirect } from 'next/navigation'

export default function CreateEventRedirect() {
  redirect('/artists/dashboard/events/create')
}

export const metadata = {
  title: 'Create Event - Theglocal',
  description: 'Create a new event for your audience',
}
