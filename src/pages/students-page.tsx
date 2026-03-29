import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Program, StudentWithProgram } from '@/types/database'
import {
  createStudent,
  deleteStudent,
  listStudents,
  updateStudent,
} from '@/services/students'
import { listPrograms } from '@/services/programs'
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'
import { YEAR_LEVELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

const studentSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  program_id: z.string().uuid('Select a program'),
  year_level: z.string().min(1, 'Select year level'),
})

type StudentForm = z.infer<typeof studentSchema>

export function StudentsPage() {
  const [rows, setRows] = useState<StudentWithProgram[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StudentWithProgram | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentWithProgram | null>(null)

  const form = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      full_name: '',
      program_id: '',
      year_level: YEAR_LEVELS[0],
    },
  })

  const load = useCallback(async () => {
    try {
      const [st, pr] = await Promise.all([listStudents(), listPrograms()])
      setRows(st)
      setPrograms(pr)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useRealtimeRefresh(load)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const programName = r.program?.name ?? ''
      if (programFilter !== 'all' && r.program_id !== programFilter) return false
      if (yearFilter !== 'all' && r.year_level !== yearFilter) return false
      if (!q) return true
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.student_id.toLowerCase().includes(q) ||
        programName.toLowerCase().includes(q)
      )
    })
  }, [rows, search, programFilter, yearFilter])

  function openCreate() {
    if (programs.length === 0) {
      toast.error('Add at least one program before registering new students.')
      return
    }
    setEditing(null)
    form.reset({
      full_name: '',
      program_id: programs[0]!.id,
      year_level: YEAR_LEVELS[0],
    })
    setDialogOpen(true)
  }

  function openEdit(s: StudentWithProgram) {
    setEditing(s)
    form.reset({
      full_name: s.full_name,
      program_id: s.program_id,
      year_level: s.year_level as StudentForm['year_level'],
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: StudentForm) {
    try {
      if (editing) {
        await updateStudent(editing.id, {
          full_name: values.full_name,
          program_id: values.program_id,
          year_level: values.year_level,
        })
        toast.success('Student updated')
      } else {
        await createStudent(values)
        toast.success('Student added')
      }
      setDialogOpen(false)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteStudent(deleteTarget.id)
      toast.success('Student removed')
      setDeleteTarget(null)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            New enrollees: name, program, and year only — IDs are assigned automatically.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 rounded-lg"
          disabled={programs.length === 0}
          title={programs.length === 0 ? 'Create a program first' : undefined}
        >
          <Plus className="size-4" />
          Add student
        </Button>
      </div>

      {programs.length === 0 && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Set up programs first</CardTitle>
            <CardDescription>
              Define the courses and degrees you offer under{' '}
              <Link to="/programs" className="font-medium text-primary underline-offset-4 hover:underline">
                Programs
              </Link>
              . Then you can register new students and assign them from that list.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Narrow the table by text, program, or year.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, ID, or program…"
              className="rounded-lg pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-full rounded-lg sm:w-[220px]">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-full rounded-lg sm:w-[180px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {YEAR_LEVELS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No students match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id} className="transition-colors">
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{s.student_id}</TableCell>
                      <TableCell>{s.program?.name ?? '—'}</TableCell>
                      <TableCell>{s.year_level}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg"
                          onClick={() => openEdit(s)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(s)}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit student' : 'New student'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update name, program, or year. Student ID stays the same.'
                : 'Student ID is generated automatically (format LW‑YEAR‑####). Returning students already have a record — edit them instead of creating a duplicate.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {editing && (
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input className="rounded-lg" value={editing.student_id} disabled readOnly />
                </div>
              )}
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input className="rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="program_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {YEAR_LEVELS.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" className="rounded-lg" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-lg">
                  {editing ? 'Save changes' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove student?</DialogTitle>
            <DialogDescription>
              This deletes <strong>{deleteTarget?.full_name}</strong> and related enrollments. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-lg" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-lg" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
