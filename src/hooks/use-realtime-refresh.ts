import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { hasSupabaseConfig } from '@/lib/config'

const TABLES = [
  'semesters',
  'programs',
  'students',
  'subjects',
  'enrollments',
  'schedules',
  'grades',
] as const

export function useRealtimeRefresh(onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!hasSupabaseConfig) return

    const channel = supabase.channel('localweb-realtime')
    const notify = () => onChangeRef.current()
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, notify)
    }
    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])
}
