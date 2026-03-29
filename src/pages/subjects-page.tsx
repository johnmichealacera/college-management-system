import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import type { Instructor, Subject } from '@/types/database'
import { listInstructors } from '@/services/instructors'
import {
  createSubject,
  deleteSubject,
  listSubjectsWithEnrollment,
  updateSubject,
  type SubjectWithSlots,
} from '@/services/subjects'
import { useActiveSemester } from '@/contexts/active-semester-context'
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { matchesText, joinSearchParts } from '@/lib/table-filter'
import { toast } from 'sonner'

/** Radix Select does not support empty string as a value. */
const NO_INSTRUCTOR = '__none__'

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().optional(),
  instructor_id: z.union([z.literal(NO_INSTRUCTOR), z.string().uuid()]),
  max_capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
})

type SubjectForm = {
  name: string
  code?: string
  instructor_id: string
  max_capacity: number
}

export function SubjectsPage() {
  const { semesterId, semester, ready } = useActiveSemester()
  const [rows, setRows] = useState<SubjectWithSlots[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SubjectWithSlots | null>(null)
  const [tableSearch, setTableSearch] = useState('')
  const [instructors, setInstructors] = useState<Instructor[]>([])

  const form = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema) as Resolver<SubjectForm>,
    defaultValues: {
      name: '',
      code: '',
      instructor_id: NO_INSTRUCTOR,
      max_capacity: 30,
    },
  })

  const loadInstructors = useCallback(async () => {
    try {
      setInstructors(await listInstructors())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load instructors')
    }
  }, [])

  const load = useCallback(async () => {
    if (!semesterId) {
      setRows([])
      setLoading(false)
      return
    }
    try {
      const data = await listSubjectsWithEnrollment(semesterId)
      setRows(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [semesterId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadInstructors()
  }, [loadInstructors])

  useRealtimeRefresh(() => {
    void load()
    void loadInstructors()
  })

  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return rows
    return rows.filter((s) =>
      matchesText(
        joinSearchParts([s.name, s.code, s.instructor?.full_name, s.instructor?.email]),
        tableSearch,
      ),
    )
  }, [rows, tableSearch])

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', code: '', instructor_id: NO_INSTRUCTOR, max_capacity: 30 })
    setDialogOpen(true)
  }

  function openEdit(s: SubjectWithSlots) {
    setEditing(s)
    form.reset({
      name: s.name,
      code: s.code ?? '',
      instructor_id: s.instructor_id ?? NO_INSTRUCTOR,
      max_capacity: s.max_capacity,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: SubjectForm) {
    try {
      const payload = {
        name: values.name,
        code: values.code || null,
        instructor_id: values.instructor_id === NO_INSTRUCTOR ? null : values.instructor_id,
        max_capacity: values.max_capacity,
      }
      if (editing) {
        const row = rows.find((r) => r.id === editing.id)
        if (row && values.max_capacity < row.enrolled_count) {
          toast.error('Capacity cannot be below current enrollment count.')
          return
        }
        await updateSubject(editing.id, payload)
        toast.success('Subject updated')
      } else {
        await createSubject(payload)
        toast.success('Subject created')
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
      await deleteSubject(deleteTarget.id)
      toast.success('Subject removed')
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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready && semester
              ? `Seat counts for ${semester.name} — capacity is enforced per term.`
              : 'Assign an instructor from your directory; enrollment still respects max seats per term.'}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-lg">
          <Plus className="size-4" />
          New subject
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name, code, instructor name or email…"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="rounded-lg pl-9"
                aria-label="Filter subjects"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Capacity</TableHead>
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
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No subjects yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No subjects match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.code || '—'}</TableCell>
                      <TableCell>
                        {s.instructor ? (
                          <span>
                            <span className="font-medium">{s.instructor.full_name}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{s.instructor.email}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">
                          {s.enrolled_count} / {s.max_capacity}
                        </span>
                        <Badge variant="secondary" className="ml-2 rounded-md font-normal">
                          {s.available_slots} slots left
                        </Badge>
                      </TableCell>
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
            <DialogTitle>{editing ? 'Edit subject' : 'New subject'}</DialogTitle>
            <DialogDescription>
              Set name, optional code, assigned instructor, and maximum seats. Add people under{' '}
              <Link to="/instructors" className="font-medium text-primary underline-offset-4 hover:underline">
                Instructors
              </Link>{' '}
              if the list is empty.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input className="rounded-lg" placeholder="e.g. Data Structures" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code (optional)</FormLabel>
                    <FormControl>
                      <Input className="rounded-lg" placeholder="CS201" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instructor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Select instructor (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent
                        position="popper"
                        sideOffset={4}
                        className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(32rem,calc(100vw-1.5rem))] p-0"
                      >
                        <SelectItem value={NO_INSTRUCTOR}>None</SelectItem>
                        {instructors.map((i) => (
                          <SelectItem key={i.id} value={i.id} className="pr-4">
                            <span className="block w-full min-w-0">
                              <span className="block font-medium leading-snug">{i.full_name}</span>
                              <span className="mt-0.5 block break-all text-xs leading-snug text-muted-foreground">
                                {i.email}
                              </span>
                            </span>
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
                name="max_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max capacity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} className="rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" className="rounded-lg" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-lg">
                  {editing ? 'Save' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete subject?</DialogTitle>
            <DialogDescription>
              Removes <strong>{deleteTarget?.name}</strong> and its schedules, enrollments, and grades.
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
