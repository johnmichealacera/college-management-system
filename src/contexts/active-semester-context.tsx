import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { listSemesters } from '@/services/semesters'
import type { Semester } from '@/types/database'

const LS_KEY = 'localweb-active-semester-id'

type ActiveSemesterContextValue = {
  semesters: Semester[]
  semesterId: string | null
  semester: Semester | null
  ready: boolean
  setSemesterId: (id: string) => void
  refreshSemesters: () => Promise<void>
}

const ActiveSemesterContext = createContext<ActiveSemesterContextValue | null>(null)

export function ActiveSemesterProvider({ children }: { children: ReactNode }) {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [semesterId, setSemesterIdState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const refreshSemesters = useCallback(async () => {
    const list = await listSemesters()
    setSemesters(list)
    setSemesterIdState((prev) => {
      let next = prev
      try {
        const stored = localStorage.getItem(LS_KEY)
        if (stored && list.some((s) => s.id === stored)) {
          next = stored
        } else if (prev && list.some((s) => s.id === prev)) {
          next = prev
        } else {
          const active = list.find((s) => s.is_active)
          next = active?.id ?? list[0]?.id ?? null
        }
      } catch {
        const active = list.find((s) => s.is_active)
        next = active?.id ?? list[0]?.id ?? null
      }
      if (next) {
        try {
          localStorage.setItem(LS_KEY, next)
        } catch {
          /* ignore */
        }
      }
      return next
    })
    setReady(true)
  }, [])

  useEffect(() => {
    void refreshSemesters()
  }, [refreshSemesters])

  const setSemesterId = useCallback((id: string) => {
    setSemesterIdState(id)
    try {
      localStorage.setItem(LS_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const semester = useMemo(
    () => semesters.find((s) => s.id === semesterId) ?? null,
    [semesters, semesterId],
  )

  const value = useMemo<ActiveSemesterContextValue>(
    () => ({
      semesters,
      semesterId,
      semester,
      ready,
      setSemesterId,
      refreshSemesters,
    }),
    [semesters, semesterId, semester, ready, setSemesterId, refreshSemesters],
  )

  return (
    <ActiveSemesterContext.Provider value={value}>{children}</ActiveSemesterContext.Provider>
  )
}

export function useActiveSemester() {
  const ctx = useContext(ActiveSemesterContext)
  if (!ctx) {
    throw new Error('useActiveSemester must be used within ActiveSemesterProvider')
  }
  return ctx
}
