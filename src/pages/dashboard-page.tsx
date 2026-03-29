import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BookOpen, UserCheck, Users } from 'lucide-react'
import {
  type DashboardStats,
  type EnrollmentPerSubject,
  fetchDashboardStats,
  fetchEnrollmentPerSubject,
} from '@/services/dashboard'
import { useActiveSemester } from '@/contexts/active-semester-context'
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  title: string
  value: string | number
  hint: string
  icon: typeof Users
  loading: boolean
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <CardDescription className="text-xs">{hint}</CardDescription>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-24 rounded-md" />
        ) : (
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { semesterId, semester, ready } = useActiveSemester()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<EnrollmentPerSubject[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!semesterId) {
      setStats(null)
      setChartData([])
      setLoading(false)
      return
    }
    try {
      const [s, c] = await Promise.all([
        fetchDashboardStats(semesterId),
        fetchEnrollmentPerSubject(semesterId),
      ])
      setStats(s)
      setChartData(c)
    } catch {
      setStats(null)
      setChartData([])
    } finally {
      setLoading(false)
    }
  }, [semesterId])

  useEffect(() => {
    void load()
  }, [load])

  useRealtimeRefresh(load)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ready && semester
            ? `Enrollment metrics for ${semester.name} — switch the term in the header to compare.`
            : 'Overview of your campus — updates live when data changes.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total students"
          value={stats?.totalStudents ?? 0}
          hint="Records in directory"
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Total subjects"
          value={stats?.totalSubjects ?? 0}
          hint="Active course offerings"
          icon={BookOpen}
          loading={loading}
        />
        <StatCard
          title="Enrolled students"
          value={stats?.enrolledStudents ?? 0}
          hint="In this term (≥1 class)"
          icon={UserCheck}
          loading={loading}
        />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Enrollment by subject</CardTitle>
          <CardDescription>Headcount per subject for the selected term.</CardDescription>
        </CardHeader>
        <CardContent className="pl-0">
          {loading ? (
            <Skeleton className="mx-auto h-[280px] w-full max-w-3xl rounded-lg" />
          ) : chartData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Add subjects and enrollments to see this chart.
            </p>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={72}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.35 }}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Enrollments"
                    fill="var(--color-chart-1)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
