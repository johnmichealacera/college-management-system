import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { hasSupabaseConfig } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { session, signIn, loading } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  if (hasSupabaseConfig && session && !loading) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(values: FormValues) {
    if (!hasSupabaseConfig) {
      toast.error('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
      return
    }
    setSubmitting(true)
    try {
      await signIn(values.email, values.password)
      toast.success('Welcome back')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-border/80 shadow-xl shadow-primary/5 transition-shadow duration-500">
        <CardHeader className="space-y-1 pb-2 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <GraduationCap className="size-7" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">LocalWeb College</CardTitle>
          <CardDescription>Admin sign in — manage students, subjects, and enrollments.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSupabaseConfig && (
            <p className="mb-4 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-foreground">
              Copy <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.example</code> to{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code> and add your Supabase
              project URL and anon key.
            </p>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="admin@college.edu"
                        className="rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        className="rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full rounded-lg"
                disabled={submitting || loading}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need access? Contact your administrator to request an account.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
