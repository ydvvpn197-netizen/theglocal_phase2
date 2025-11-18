import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Scale, Mail, Clock, CheckCircle } from 'lucide-react'

export default function AppealsProcessPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Appeal Process</h1>
          <p className="text-lg text-muted-foreground">
            Disagree with a moderation decision? Here&apos;s how to appeal
          </p>
        </div>

        {/* When to Appeal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              When Can You Appeal?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can appeal moderation decisions if you believe:
            </p>

            <ul className="space-y-2 text-sm">
              <li>✓ Your content was removed incorrectly</li>
              <li>✓ Your account was banned without valid reason</li>
              <li>✓ The moderation action was disproportionate to the violation</li>
              <li>✓ There was a misunderstanding about context or intent</li>
              <li>✓ You have new information that wasn&apos;t considered</li>
            </ul>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Important</p>
              <p className="text-sm text-yellow-700">
                Appeals are for genuine mistakes or misunderstandings. Repeated frivolous appeals
                may result in extended bans.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* How to Appeal */}
        <Card>
          <CardHeader>
            <CardTitle>How to File an Appeal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-brand-primary/10 p-3 mt-1">
                  <span className="text-lg font-bold text-brand-primary">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Gather Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Note the date and time of the moderation action. If possible, screenshot the
                    content or action notification.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-full bg-brand-primary/10 p-3 mt-1">
                  <span className="text-lg font-bold text-brand-primary">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Send Your Appeal</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Email us at{' '}
                    <a
                      href="mailto:appeals@theglocal.com"
                      className="text-brand-primary hover:underline"
                    >
                      appeals@theglocal.com
                    </a>{' '}
                    with:
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• Your account&apos;s anonymous handle</li>
                    <li>• Date and time of the action</li>
                    <li>• Community name (if applicable)</li>
                    <li>• Why you believe the decision was incorrect</li>
                    <li>• Any context we should consider</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-full bg-brand-primary/10 p-3 mt-1">
                  <span className="text-lg font-bold text-brand-primary">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">We Review Your Appeal</h3>
                  <p className="text-sm text-muted-foreground">
                    A platform administrator (not the original moderator) will review your appeal
                    within 3-5 business days.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-full bg-brand-primary/10 p-3 mt-1">
                  <span className="text-lg font-bold text-brand-primary">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Receive Decision</h3>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll receive a response via email explaining the decision and reasoning.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center pt-4">
              <Button asChild>
                <a href="mailto:appeals@theglocal.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Appeal Email
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appeal Outcomes */}
        <Card>
          <CardHeader>
            <CardTitle>Possible Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Appeal Upheld</h3>
                  <p className="text-sm text-muted-foreground">
                    If we agree the moderation was incorrect, we&apos;ll restore your content or
                    account and update our moderation log.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Scale className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Partial Reversal</h3>
                  <p className="text-sm text-muted-foreground">
                    The action may be reduced (e.g., permanent ban to temporary, or removal reversed
                    with a warning).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Appeal Denied</h3>
                  <p className="text-sm text-muted-foreground">
                    If the original decision stands, we&apos;ll explain why and provide clarity on
                    the guidelines.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Times */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-800 mb-3">Response Times</h3>
            <div className="grid gap-4 md:grid-cols-2 text-sm text-blue-700">
              <div>
                <p className="font-medium">Standard Appeals:</p>
                <p>3-5 business days</p>
              </div>
              <div>
                <p className="font-medium">Account Ban Appeals:</p>
                <p>1-2 business days (priority)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* After Appeal */}
        <Card>
          <CardHeader>
            <CardTitle>After the Appeal Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Appeal decisions are final and are made by senior platform administrators. We strive
              to be fair and consistent in all decisions.
            </p>

            <div>
              <h3 className="font-semibold mb-2">If Your Appeal is Denied</h3>
              <p className="text-sm text-muted-foreground">
                Please respect the decision and review our guidelines to avoid future violations. We
                appreciate your understanding and continued participation in the community.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">If Your Appeal is Upheld</h3>
              <p className="text-sm text-muted-foreground">
                We apologize for the error. Your content will be restored (if applicable) and the
                moderation log will be updated to reflect the reversal.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Questions about the appeal process?{' '}
            <a href="mailto:support@theglocal.com" className="text-brand-primary hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Appeal Process - Theglocal',
  description: 'How to appeal moderation decisions on Theglocal',
}
