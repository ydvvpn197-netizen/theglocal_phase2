/**
 * Performance Dashboard
 *
 * Internal dashboard for monitoring Core Web Vitals and custom metrics.
 * Displays real-time and historical performance data.
 */

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TrendingUp, Activity, Zap, Eye, AlertTriangle } from 'lucide-react'

interface PerformanceMetric {
  metric_name: string
  metric_value: number
  page_pathname?: string
  created_at?: string
}

interface PageMetrics {
  [metricName: string]: number | number[]
  count: number
}

interface PageMetricsDisplay {
  LCP?: number
  INP?: number
  CLS?: number
  FID?: number
  TTFB?: number
  count: number
}

export const metadata = {
  title: 'Performance Dashboard | Admin',
  description: 'Monitor Core Web Vitals and application performance',
}

export default async function PerformanceDashboard() {
  const supabase = await createClient()

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="container py-12">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You must be logged in as an admin to view this page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Performance Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor Core Web Vitals and application performance metrics
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="core-web-vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="custom-metrics">Custom Metrics</TabsTrigger>
          <TabsTrigger value="pages">By Page</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Suspense fallback={<MetricsGridSkeleton />}>
            <MetricsOverview />
          </Suspense>

          <Suspense fallback={<div>Loading trends...</div>}>
            <PerformanceTrends />
          </Suspense>
        </TabsContent>

        <TabsContent value="core-web-vitals" className="space-y-4">
          <Suspense fallback={<div>Loading Core Web Vitals...</div>}>
            <CoreWebVitalsDetails />
          </Suspense>
        </TabsContent>

        <TabsContent value="custom-metrics" className="space-y-4">
          <Suspense fallback={<div>Loading custom metrics...</div>}>
            <CustomMetrics />
          </Suspense>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Suspense fallback={<div>Loading page metrics...</div>}>
            <PageMetrics />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Metrics Overview - Key performance indicators
 */
async function MetricsOverview() {
  const supabase = await createClient()

  // Get metrics from last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: metrics } = await supabase
    .from('web_vitals_metrics')
    .select('*')
    .gte('timestamp', twentyFourHoursAgo)

  if (!metrics || metrics.length === 0) {
    return (
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertTitle>No data available</AlertTitle>
        <AlertDescription>
          No performance metrics have been collected yet. Metrics will appear here once users start
          visiting the site.
        </AlertDescription>
      </Alert>
    )
  }

  // Calculate averages for each metric
  const metricAverages = calculateMetricAverages(metrics)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="LCP"
        subtitle="Largest Contentful Paint"
        value={metricAverages.LCP?.avg || 0}
        unit="ms"
        threshold={{ good: 2500, needsImprovement: 4000 }}
        icon={<Eye className="h-4 w-4" />}
      />
      <MetricCard
        title="INP"
        subtitle="Interaction to Next Paint"
        value={metricAverages.INP?.avg || 0}
        unit="ms"
        threshold={{ good: 200, needsImprovement: 500 }}
        icon={<Zap className="h-4 w-4" />}
      />
      <MetricCard
        title="CLS"
        subtitle="Cumulative Layout Shift"
        value={metricAverages.CLS?.avg || 0}
        unit=""
        threshold={{ good: 0.1, needsImprovement: 0.25 }}
        icon={<Activity className="h-4 w-4" />}
      />
      <MetricCard
        title="TTFB"
        subtitle="Time to First Byte"
        value={metricAverages.TTFB?.avg || 0}
        unit="ms"
        threshold={{ good: 800, needsImprovement: 1800 }}
        icon={<TrendingUp className="h-4 w-4" />}
      />
    </div>
  )
}

/**
 * Single metric card component
 */
function MetricCard({
  title,
  subtitle,
  value,
  unit,
  threshold,
  icon,
}: {
  title: string
  subtitle: string
  value: number
  unit: string
  threshold: { good: number; needsImprovement: number }
  icon: React.ReactNode
}) {
  const rating = getRating(value, threshold)
  const displayValue = title === 'CLS' ? value.toFixed(3) : Math.round(value)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {displayValue}
          {unit}
        </div>
        <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
        <Badge
          variant={
            rating === 'good'
              ? 'default'
              : rating === 'needs-improvement'
                ? 'secondary'
                : 'destructive'
          }
        >
          {rating === 'good'
            ? '✓ Good'
            : rating === 'needs-improvement'
              ? '⚠ Needs Improvement'
              : '✗ Poor'}
        </Badge>
      </CardContent>
    </Card>
  )
}

/**
 * Performance trends over time
 */
async function PerformanceTrends() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trends</CardTitle>
        <CardDescription>Last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Chart visualization would go here</p>
            <p className="text-xs mt-2">
              Use a library like Recharts or Chart.js to visualize trends
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Core Web Vitals detailed breakdown
 */
async function CoreWebVitalsDetails() {
  const supabase = await createClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: metrics } = await supabase
    .from('web_vitals_metrics')
    .select('*')
    .gte('timestamp', sevenDaysAgo)
    .in('metric_name', ['LCP', 'INP', 'CLS', 'FID', 'TTFB', 'FCP'])

  if (!metrics || metrics.length === 0) {
    return <NoDataAlert />
  }

  const breakdownByMetric = groupByMetricName(metrics)

  return (
    <div className="space-y-4">
      {Object.entries(breakdownByMetric).map(([metricName, metricData]) => (
        <Card key={metricName}>
          <CardHeader>
            <CardTitle>{metricName}</CardTitle>
            <CardDescription>{getMetricDescription(metricName)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Average:</span>
                <span className="font-semibold">
                  {Math.round(metricData.avg)} {getMetricUnit(metricName)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">P75:</span>
                <span className="font-semibold">
                  {Math.round(metricData.p75)} {getMetricUnit(metricName)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">P95:</span>
                <span className="font-semibold">
                  {Math.round(metricData.p95)} {getMetricUnit(metricName)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm">Sample Size:</span>
                <Badge variant="outline">{metricData.count} measurements</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Custom metrics display
 */
async function CustomMetrics() {
  return (
    <Alert>
      <Activity className="h-4 w-4" />
      <AlertTitle>Custom Metrics</AlertTitle>
      <AlertDescription>
        Track custom performance metrics like API response times, render times, and database query
        durations. Use <code className="text-sm">reportCustomMetric()</code> to send custom metrics.
      </AlertDescription>
    </Alert>
  )
}

/**
 * Page-by-page metrics
 */
async function PageMetrics() {
  const supabase = await createClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: metrics } = await supabase
    .from('web_vitals_metrics')
    .select('page_pathname, metric_name, metric_value')
    .gte('timestamp', sevenDaysAgo)

  if (!metrics || metrics.length === 0) {
    return <NoDataAlert />
  }

  const pageBreakdown = groupByPage(metrics)

  return (
    <div className="space-y-4">
      {Object.entries(pageBreakdown)
        .slice(0, 10)
        .map(([pathname, data]) => (
          <Card key={pathname}>
            <CardHeader>
              <CardTitle className="text-base font-mono">{pathname || '/'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">LCP</div>
                  <div className="font-semibold">{Math.round(data.LCP ?? 0)}ms</div>
                </div>
                <div>
                  <div className="text-muted-foreground">INP</div>
                  <div className="font-semibold">{Math.round(data.INP ?? 0)}ms</div>
                </div>
                <div>
                  <div className="text-muted-foreground">CLS</div>
                  <div className="font-semibold">{(data.CLS ?? 0).toFixed(3)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Views</div>
                  <div className="font-semibold">{data.count}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}

/**
 * Skeleton loader for metrics grid
 */
function MetricsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="space-y-0 pb-2">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * No data alert component
 */
function NoDataAlert() {
  return (
    <Alert>
      <Activity className="h-4 w-4" />
      <AlertTitle>No data available</AlertTitle>
      <AlertDescription>
        No metrics have been collected for this period. Check back later or adjust the time range.
      </AlertDescription>
    </Alert>
  )
}

/**
 * Helper functions
 */

function calculateMetricAverages(metrics: PerformanceMetric[]) {
  const grouped: Record<string, number[]> = {}

  metrics.forEach((metric) => {
    if (!grouped[metric.metric_name]) {
      grouped[metric.metric_name] = []
    }
    const group = grouped[metric.metric_name]
    if (group) {
      group.push(metric.metric_value)
    }
  })

  const averages: Record<string, { avg: number; count: number }> = {}

  Object.entries(grouped).forEach(([name, values]) => {
    averages[name] = {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
    }
  })

  return averages
}

function groupByMetricName(metrics: PerformanceMetric[]) {
  const grouped: Record<
    string,
    { values: number[]; avg: number; p75: number; p95: number; count: number }
  > = {}

  metrics.forEach((metric) => {
    const metricName = metric.metric_name
    if (!metricName) return

    if (!grouped[metricName]) {
      grouped[metricName] = { values: [], avg: 0, p75: 0, p95: 0, count: 0 }
    }
    const group = grouped[metricName]
    if (group) {
      group.values.push(metric.metric_value)
    }
  })

  Object.entries(grouped).forEach(([_name, data]) => {
    const sorted = data.values.sort((a, b) => a - b)
    data.avg = sorted.reduce((a, b) => a + b, 0) / sorted.length
    const p75Index = Math.floor(sorted.length * 0.75)
    const p95Index = Math.floor(sorted.length * 0.95)
    data.p75 = sorted[p75Index] ?? 0
    data.p95 = sorted[p95Index] ?? 0
    data.count = sorted.length
  })

  return grouped
}

function groupByPage(metrics: PerformanceMetric[]): Record<string, PageMetricsDisplay> {
  const grouped: Record<string, PageMetrics> = {}

  metrics.forEach((metric) => {
    const pathname = metric.page_pathname || '/'
    if (!grouped[pathname]) {
      grouped[pathname] = { count: 0 }
    }

    const metricName = metric.metric_name
    if (!metricName) return

    if (!grouped[pathname][metricName]) {
      grouped[pathname][metricName] = []
    }

    const metricValue = grouped[pathname][metricName]
    if (Array.isArray(metricValue)) {
      metricValue.push(metric.metric_value)
    }
    grouped[pathname].count++
  })

  // Calculate averages and convert to display format
  const result: Record<string, PageMetricsDisplay> = {}
  Object.entries(grouped).forEach(([pathname, page]) => {
    const display: PageMetricsDisplay = { count: page.count }

    Object.keys(page).forEach((key) => {
      if (key !== 'count') {
        const value = page[key]
        if (Array.isArray(value) && value.length > 0) {
          const avg = value.reduce((a, b) => a + b, 0) / value.length
          display[key as keyof PageMetricsDisplay] = avg
        } else if (typeof value === 'number') {
          display[key as keyof PageMetricsDisplay] = value
        }
      }
    })

    result[pathname] = display
  })

  return result
}

function getRating(
  value: number,
  threshold: { good: number; needsImprovement: number }
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= threshold.good) return 'good'
  if (value <= threshold.needsImprovement) return 'needs-improvement'
  return 'poor'
}

function getMetricDescription(name: string): string {
  const descriptions: Record<string, string> = {
    LCP: 'Measures loading performance. Should occur within 2.5s of page load.',
    INP: 'Measures responsiveness. Should be less than 200ms.',
    CLS: 'Measures visual stability. Should be less than 0.1.',
    FID: 'Measures interactivity. Should be less than 100ms.',
    TTFB: 'Measures server response time. Should be less than 800ms.',
    FCP: 'Measures perceived load speed. Should occur within 1.8s.',
  }
  return descriptions[name] || 'No description available.'
}

function getMetricUnit(name: string): string {
  return name === 'CLS' ? '' : 'ms'
}
