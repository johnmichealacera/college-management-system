import { supabase } from '@/lib/supabase'
import type { Program } from '@/types/database'

export async function listPrograms(): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createProgram(name: string): Promise<Program> {
  const { data, error } = await supabase.from('programs').insert({ name: name.trim() }).select().single()
  if (error) throw error
  return data
}

export async function updateProgram(id: string, name: string): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) throw error
}
