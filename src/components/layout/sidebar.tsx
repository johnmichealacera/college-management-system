import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Award,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  PanelLeftClose,
  PanelLeft,
  UserPen,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

const STORAGE_KEY = 'localweb-sidebar-collapsed'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const nav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/semesters', label: 'Semesters', icon: CalendarRange },
  { to: '/programs', label: 'Programs', icon: LibraryBig },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/instructors', label: 'Instructors', icon: UserPen },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/enrollments', label: 'Enrollments', icon: ClipboardList },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/grades', label: 'Grades', icon: Award },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  return (
    <aside
      className={cn(
        'flex h-svh flex-col border-r border-border bg-card/40 backdrop-blur-sm transition-[width] duration-300 ease-out',
        collapsed ? 'w-[4.25rem]' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center gap-2 border-b border-border px-3',
          collapsed && 'justify-center px-2',
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <GraduationCap className="size-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              LocalWeb College
            </p>
            <p className="truncate text-xs text-muted-foreground">Admin</p>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-8 shrink-0 rounded-lg', collapsed && 'hidden')}
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="size-4" />
        </Button>
      </div>
      {collapsed && (
        <div className="flex justify-center border-b border-border py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <PanelLeft className="size-4" />
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          {nav.map(({ to, label, icon: Icon, end: endMatch }) => (
            <NavLink
              key={to}
              to={to}
              end={endMatch ?? false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="size-[1.125rem] shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  )
}
