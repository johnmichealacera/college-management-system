import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import type { Subject } from '@/types/database'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { matchesText, joinSearchParts } from '@/lib/table-filter'
import { toast } from 'sonner'

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().optional(),
  instructor: z.string(),
  max_capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
})

type SubjectForm = {
  name: string
  code?: string
  instructor: string
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

  const form = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema) as Resolver<SubjectForm>,
    defaultValues: {
      name: '',
      code: '',
      instructor: '',
      max_capacity: 30,
    },
  })

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

  useRealtimeRefresh(load)

  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return rows
    return rows.filter((s) =>
      matchesText(joinSearchParts([s.name, s.code, s.instructor]), tableSearch),
    )
  }, [rows, tableSearch])

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', code: '', instructor: '', max_capacity: 30 })
    setDialogOpen(true)
  }

  function openEdit(s: SubjectWithSlots) {
    setEditing(s)
    form.reset({
      name: s.name,
      code: s.code ?? '',
      instructor: s.instructor,
      max_capacity: s.max_capacity,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: SubjectForm) {
    try {
      const payload = {
        name: values.name,
        code: values.code || null,
        instructor: values.instructor || '',
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
              : 'Courses with instructor and capacity — enrollment respects max seats per term.'}
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
                placeholder="Search name, code, instructor…"
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
                      <TableCell>{s.instructor || '—'}</TableCell>
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
            <DialogDescription>Set name, optional code, instructor, and maximum seats.</DialogDescription>
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
                name="instructor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <FormControl>
                      <Input className="rounded-lg" placeholder="Name as text" {...field} />
                    </FormControl>
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
