import { CreateCommunityForm } from '@/components/communities/create-community-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CreateCommunityPage() {
  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a Community</CardTitle>
          <CardDescription>
            Start a new community for your neighborhood, interests, or cause
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCommunityForm />
        </CardContent>
      </Card>
    </div>
  )
}
