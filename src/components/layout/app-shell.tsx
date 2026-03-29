import { Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { AssistantSheet } from '@/components/assistant/assistant-sheet'
import { Sidebar } from '@/components/layout/sidebar'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActiveSemesterProvider, useActiveSemester } from '@/contexts/active-semester-context'
import { useAuth } from '@/contexts/auth-context'
import { schoolYearLabel } from '@/lib/school-year'
import { toast } from 'sonner'

function AppShellLayout() {
  const { signOut, user } = useAuth()
  const { semesters, semesterId, setSemesterId, ready } = useActiveSemester()

  async function handleSignOut() {
    try {
      await signOut()
      toast.success('Signed out')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sign out failed')
    }
  }

  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 flex-wrap items-center justify-end gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:flex-nowrap sm:px-6">
          {user?.email && (
            <span className="mr-auto hidden min-w-0 truncate text-sm text-muted-foreground sm:block">
              {user.email}
            </span>
          )}
          <div className="flex w-full min-w-[10rem] flex-1 items-center justify-end gap-2 sm:w-auto sm:flex-initial">
            {ready && semesters.length > 0 && (
              <Select value={semesterId ?? ''} onValueChange={setSemesterId}>
                <SelectTrigger className="h-9 max-w-[min(100%,18rem)] rounded-lg text-left text-sm sm:max-w-[22rem]">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => {
                    const yr = schoolYearLabel(s.starts_on, s.ends_on)
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {yr}
                        {s.is_active ? ' · Active' : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
            <AssistantSheet />
            <ModeToggle />
            <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function AppShell() {
  return (
    <ActiveSemesterProvider>
      <AppShellLayout />
    </ActiveSemesterProvider>
  )
}
